import json
import math
import os
import re
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


class DomainError(Exception):
    pass


def now():
    return datetime.now(timezone.utc).isoformat()


def text(value, label, maximum=12000):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise DomainError(f'{label}不能为空且不能超过 {maximum} 字符')
    return value.strip()


class Store:
    """One process owns the database; each command is one short transaction."""

    def __init__(self, directory):
        self.directory = Path(directory).resolve()
        self.directory.mkdir(parents=True, exist_ok=True)
        self.mutex = threading.RLock()
        self.closed = False
        self.lock_file = open(self.directory / 'writer.lock', 'a+b')
        try:
            if os.fstat(self.lock_file.fileno()).st_size == 0:
                self.lock_file.write(b'0')
                self.lock_file.flush()
            self.lock_file.seek(0)
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(self.lock_file.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as e:
            self.lock_file.close()
            raise DomainError('生命数据库已由另一个内核使用') from e
        try:
            self.db = sqlite3.connect(self.directory / 'life.sqlite3', check_same_thread=False)
            self.db.row_factory = sqlite3.Row
            self.db.execute('PRAGMA journal_mode=WAL')
            self.db.execute('PRAGMA synchronous=FULL')
            self.db.execute('PRAGMA foreign_keys=ON')
            version = self.db.execute('PRAGMA user_version').fetchone()[0]
            if version not in (0, 1):
                raise DomainError('数据库版本比当前插件新，请使用匹配版本')
            self.db.executescript('''
                CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS events (
                    seq INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL,
                    scene TEXT NOT NULL, role TEXT NOT NULL, text TEXT NOT NULL,
                    kind TEXT NOT NULL, created_at TEXT NOT NULL,
                    UNIQUE(scene,event_id));
                CREATE TABLE IF NOT EXISTS turns (
                    id TEXT PRIMARY KEY, scene TEXT NOT NULL, event_id TEXT NOT NULL,
                    epoch INTEGER NOT NULL, status TEXT NOT NULL, action_id TEXT,
                    created_at TEXT NOT NULL, usage TEXT, UNIQUE(scene,event_id));
                CREATE TABLE IF NOT EXISTS actions (
                    id TEXT PRIMARY KEY, turn_id TEXT NOT NULL REFERENCES turns(id),
                    scene TEXT NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL,
                    epoch INTEGER NOT NULL, created_at TEXT NOT NULL, receipt TEXT);
                PRAGMA user_version=1;
            ''')
            with self.db:
                self.set('epoch', self.get('epoch', 0) + 1)
                self.db.execute("UPDATE turns SET status='interrupted' WHERE status='pending'")
                self.db.execute("UPDATE actions SET status='unknown' WHERE status='sending'")
                self.db.execute("UPDATE actions SET status='frozen' WHERE status='pending'")
                activity = self.get('activity')
                if activity:
                    activity['status'] = 'needs_reopen'
                    self.set('activity', activity)
        except Exception:
            self.close()
            raise

    def close(self):
        if self.closed:
            return
        self.closed = True
        if hasattr(self, 'db'):
            self.db.close()
        self.lock_file.close()

    def get(self, key, default=None):
        row = self.db.execute('SELECT value FROM meta WHERE key=?', (key,)).fetchone()
        return json.loads(row[0]) if row else default

    def set(self, key, value):
        self.db.execute('INSERT OR REPLACE INTO meta VALUES (?,?)', (key, json.dumps(value, ensure_ascii=False)))

    def rows(self, query, args=()):
        return [dict(r) for r in self.db.execute(query, args)]

    def command(self, op, body):
        if not isinstance(body, dict):
            raise DomainError('请求必须是对象')
        with self.mutex, self.db:
            return self._command(op, body)

    def _command(self, op, b):
        if op == 'state':
            return {'life': self.get('life'), 'draft': self.get('draft', {'revision': 0, 'name': '', 'description': ''}),
                    'paused': self.get('paused', False), 'epoch': self.get('epoch'),
                    'activity': self.get('activity'),
                    'event_count': self.db.execute("SELECT count(*) FROM events WHERE scene NOT LIKE 'trial:%'").fetchone()[0],
                    'actions': self.rows('SELECT * FROM actions ORDER BY created_at DESC LIMIT 30'),
                    'schema_version': 1}
        if op == 'draft.save':
            if self.get('life'):
                raise DomainError('出生档案已确认，不可通过草案覆盖')
            current = self.get('draft', {'revision': 0})
            if b.get('expected_revision') != current['revision']:
                raise DomainError('草案已更新，请刷新后重试')
            draft = {'name': text(b.get('name'), '名字', 60),
                     'description': text(b.get('description'), '出生设定', 8000),
                     'revision': current['revision'] + 1, 'updated_at': now(), 'source': 'creator'}
            self.set('draft', draft)
            self.set('epoch', self.get('epoch') + 1)
            return draft
        if op == 'birth':
            request_id = text(b.get('request_id'), '请求标识', 120)
            life = self.get('life')
            if life:
                if life['birth_request_id'] == request_id:
                    return life
                raise DomainError('已经存在正式生命，不能重复出生')
            draft = self.get('draft')
            if not draft or b.get('expected_revision') != draft['revision']:
                raise DomainError('请核对最新草案后再确认出生')
            life = {'life_id': str(uuid4()), 'name': draft['name'], 'description': draft['description'],
                    'born_at': now(), 'birth_request_id': request_id, 'draft_revision': draft['revision']}
            self.set('life', life)
            self.set('epoch', self.get('epoch') + 1)
            return life
        if op == 'export':
            return {'format': 'lifecore-preview-1', 'exported_at': now(), 'life': self.get('life'),
                    'events': self.rows("SELECT * FROM events WHERE scene NOT LIKE 'trial:%' ORDER BY seq"),
                    'actions': self.rows('SELECT * FROM actions'), 'activity': self.get('activity')}
        raise DomainError('未知命令')
