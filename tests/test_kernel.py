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

    def test_one_writer_lock(self):
        with self.assertRaises(DomainError):
            Store(Path(self.tmp.name))



if __name__ == '__main__':
    unittest.main()
