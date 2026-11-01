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

    def _scene(self, scene):
        if scene == 'trial':
            return 'trial:' + str(self.get('draft', {}).get('revision', 0))
        if scene == 'local' or (isinstance(scene, str) and re.fullmatch(r'qq:[0-9]{1,20}:private:[0-9]{1,20}', scene)):
            if not self.get('life'):
                raise DomainError('请先确认正式出生')
            return scene
        raise DomainError('不支持的会话场景')

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
        if op in ('pause', 'invalidate'):
            if op == 'pause':
                if not isinstance(b.get('paused'), bool):
                    raise DomainError('暂停状态必须是布尔值')
                self.set('paused', b['paused'])
            self.set('epoch', self.get('epoch') + 1)
            self.db.execute("UPDATE turns SET status='cancelled' WHERE status='pending'")
            self.db.execute("UPDATE actions SET status='frozen' WHERE status='pending'")
            return {'paused': self.get('paused', False), 'epoch': self.get('epoch')}
        if op == 'turn.prepare':
            if self.get('paused', False):
                raise DomainError('生命活动已暂停')
            scene = self._scene(b.get('scene'))
            content = text(b.get('text'), '消息', 8000)
            event_id = text(b.get('event_id'), '消息标识', 160)
            old = self.db.execute('SELECT * FROM turns WHERE scene=? AND event_id=?', (scene, event_id)).fetchone()
            if old:
                return {'duplicate': True, 'turn_id': old['id'], 'status': old['status']}
            profile = self.get('draft') if scene.startswith('trial:') else self.get('life')
            if not profile:
                raise DomainError('请先保存出生草案')
            turn_id = str(uuid4())
            stamp = now()
            self.db.execute('INSERT INTO events(event_id,scene,role,text,kind,created_at) VALUES(?,?,?,?,?,?)',
                            (event_id, scene, 'user', content, 'observed', stamp))
            self.db.execute('INSERT INTO turns VALUES(?,?,?,?,?,?,?,?)',
                            (turn_id, scene, event_id, self.get('epoch'), 'pending', None, stamp, None))
            history = self.rows("SELECT role,text FROM events WHERE scene=? AND kind IN ('observed','replied') ORDER BY seq DESC LIMIT 16", (scene,))
            history.reverse()
            # A bounded G1 working context; not advertised as long-term semantic recall.
            total = 0
            bounded = []
            for item in reversed(history):
                if total + len(item['text']) > 18000:
                    break
                bounded.append(item)
                total += len(item['text'])
            bounded.reverse()
            return {'duplicate': False, 'turn_id': turn_id, 'scene': scene,
                    'profile': profile, 'messages': bounded, 'activity': self.get('activity') if scene == 'local' else None}
        if op == 'turn.commit':
            row = self.db.execute('SELECT * FROM turns WHERE id=?', (b.get('turn_id'),)).fetchone()
            if not row or row['status'] != 'pending' or row['epoch'] != self.get('epoch') or self.get('paused', False):
                raise DomainError('回合已失效，回复未提交')
            reply = text(b.get('text'), '回复', 12000)
            qq = row['scene'].startswith('qq:')
            action_id = str(uuid4()) if qq else None
            self.db.execute('UPDATE turns SET status=?,usage=?,action_id=? WHERE id=?',
                            ('completed', json.dumps(b.get('usage', {})), action_id, row['id']))
            self.db.execute('INSERT INTO events(event_id,scene,role,text,kind,created_at) VALUES(?,?,?,?,?,?)',
                            ('reply:' + row['id'], row['scene'], 'assistant', reply, 'proposed' if qq else 'replied', now()))
            if qq:
                self.db.execute('INSERT INTO actions VALUES(?,?,?,?,?,?,?,?)',
                                (action_id, row['id'], row['scene'], reply, 'pending', row['epoch'], now(), None))
            return {'text': reply, 'action_id': action_id}
        if op == 'turn.fail':
            self.db.execute("UPDATE turns SET status='failed' WHERE id=? AND status='pending'", (b.get('turn_id'),))
            return {'ok': True}
        if op == 'action.claim':
            row = self.db.execute('SELECT * FROM actions WHERE id=?', (b.get('action_id'),)).fetchone()
            if not row or row['status'] != 'pending' or row['epoch'] != self.get('epoch') or self.get('paused', False):
                raise DomainError('动作已冻结或执行过，不可自动重发')
            self.db.execute("UPDATE actions SET status='sending' WHERE id=?", (row['id'],))
            return dict(row)
        if op == 'action.receipt':
            status = b.get('status')
            if status not in ('succeeded', 'failed', 'unknown'):
                raise DomainError('无效的动作结果')
            row = self.db.execute('SELECT * FROM actions WHERE id=?', (b.get('action_id'),)).fetchone()
            if not row or row['status'] != 'sending':
                raise DomainError('动作不在发送阶段')
            receipt = {k: b[k] for k in ('status', 'message_id', 'detail') if k in b}
            self.db.execute('UPDATE actions SET status=?,receipt=? WHERE id=?', (status, json.dumps(receipt), row['id']))
            self.db.execute('UPDATE events SET kind=? WHERE event_id=? AND scene=?',
                            ('replied' if status == 'succeeded' else status, 'reply:' + row['turn_id'], row['scene']))
            return {'ok': True}
        if op == 'events':
            scene = b.get('scene')
            if scene:
                scene = self._scene(scene)
                rows = self.rows('SELECT * FROM events WHERE scene=? ORDER BY seq DESC LIMIT 100', (scene,))
            else:
                rows = self.rows("SELECT * FROM events WHERE scene NOT LIKE 'trial:%' ORDER BY seq DESC LIMIT 100")
            return {'events': rows}
        if op == 'activity.save':
            a = b.get('activity')
            if not isinstance(a, dict):
                raise DomainError('活动必须是对象')
            value = a.get('position', 0)
            if not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
                raise DomainError('无效的播放位置')
            clean = {k: a.get(k) for k in ('url', 'video_id', 'title', 'position', 'duration', 'status', 'observed_at', 'understanding')}
            self.set('activity', clean)
            return clean
        if op == 'export':
            return {'format': 'lifecore-preview-1', 'exported_at': now(), 'life': self.get('life'),
                    'events': self.rows("SELECT * FROM events WHERE scene NOT LIKE 'trial:%' ORDER BY seq"),
                    'actions': self.rows('SELECT * FROM actions'), 'activity': self.get('activity')}
        raise DomainError('未知命令')
