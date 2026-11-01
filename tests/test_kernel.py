import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'kernel'))
try:
    from lifecore.store import Store, DomainError
except ImportError:
    Store = None
    DomainError = Exception


class KernelTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(Store, 'The durable LifeCore kernel must exist')
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.store = Store(Path(self.tmp.name))
        self.addCleanup(lambda: self.store.close())

    def call(self, op, **body):
        return self.store.command(op, body)

    def birth(self):
        d = self.call('draft.save', name='大肥鱼', description='温和、好奇。', expected_revision=0)
        return self.call('birth', expected_revision=d['revision'], request_id='birth-one')

    def test_birth_is_idempotent_and_survives_restart(self):
        first = self.birth()
        self.assertEqual(self.call('birth', expected_revision=1, request_id='birth-one')['life_id'], first['life_id'])
        with self.assertRaises(DomainError):
            self.call('birth', expected_revision=1, request_id='different-birth')
        self.store.close()
        self.store = Store(Path(self.tmp.name))
        self.assertEqual(self.call('state')['life']['life_id'], first['life_id'])

    def test_birth_rejects_stale_draft_and_does_not_import_trial(self):
        self.call('draft.save', name='大肥鱼', description='好奇。', expected_revision=0)
        turn = self.call('turn.prepare', scene='trial', text='暗号是蓝鲸', event_id='trial-1')
        self.call('turn.commit', turn_id=turn['turn_id'], text='记住了', usage={})
        self.call('draft.save', name='大肥鱼', description='温和。', expected_revision=1)
        with self.assertRaises(DomainError):
            self.call('birth', expected_revision=1, request_id='old')
        self.call('birth', expected_revision=2, request_id='new')
        formal = self.call('turn.prepare', scene='local', text='你记得什么？', event_id='formal-1')
        self.assertNotIn('蓝鲸', str(formal['messages']))
        self.assertEqual(len(self.call('events', scene='local')['events']), 1)

    def test_scenes_do_not_share_context_and_duplicates_do_not_generate_twice(self):
        self.birth()
        first = self.call('turn.prepare', scene='qq:42:private:7', text='秘密苹果', event_id='qq-1')
        self.call('turn.commit', turn_id=first['turn_id'], text='收到', usage={})
        repeated = self.call('turn.prepare', scene='qq:42:private:7', text='秘密苹果', event_id='qq-1')
        self.assertTrue(repeated['duplicate'])
        other = self.call('turn.prepare', scene='qq:42:private:8', text='你好', event_id='qq-2')
        self.assertNotIn('苹果', str(other['messages']))

    def test_pause_invalidates_pending_result(self):
        self.birth()
        pending = self.call('turn.prepare', scene='local', text='你好', event_id='1')
        self.call('pause', paused=True)
        with self.assertRaises(DomainError):
            self.call('turn.commit', turn_id=pending['turn_id'], text='迟到的回复', usage={})
        self.assertEqual(self.call('events', scene='local')['events'][0]['role'], 'user')
        with self.assertRaises(DomainError):
            self.call('turn.prepare', scene='local', text='继续', event_id='2')

    def test_unknown_outbox_is_not_reclaimed_and_restart_freezes_pending(self):
        self.birth()
        t = self.call('turn.prepare', scene='qq:42:private:7', text='你好', event_id='1')
        a = self.call('turn.commit', turn_id=t['turn_id'], text='你好呀', usage={})
        self.assertIsNotNone(a['action_id'])
        self.call('action.claim', action_id=a['action_id'])
        self.call('action.receipt', action_id=a['action_id'], status='unknown', detail='timeout')
        with self.assertRaises(DomainError):
            self.call('action.claim', action_id=a['action_id'])
        self.store.close()
        self.store = Store(Path(self.tmp.name))
        self.assertEqual(self.call('state')['actions'][0]['status'], 'unknown')

    def test_one_writer_lock(self):
        with self.assertRaises(DomainError):
            Store(Path(self.tmp.name))

    def test_invalid_input_does_not_create_state(self):
        with self.assertRaises(DomainError):
            self.call('draft.save', name='', description='hello', expected_revision=0)
        with self.assertRaises(DomainError):
            self.call('pause', paused='false')
        self.assertIsNone(self.call('state')['life'])


if __name__ == '__main__':
    unittest.main()
