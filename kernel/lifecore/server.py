import hmac
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .store import DomainError, Store


def serve(directory):
    token = os.environ.pop('LIFECORE_KERNEL_TOKEN', '')
    if len(token) < 32:
        raise RuntimeError('Missing private kernel credential')
    store = Store(directory)

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Request bodies and credentials must not enter logs.

        def respond(self, code, payload):
            data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)

        def do_POST(self):
            self.connection.settimeout(10)
            if not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token):
                return self.respond(401, {'error': 'unauthorized'})
            if self.path != '/command':
                return self.respond(404, {'error': 'not_found'})
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if length <= 0 or length > 256_000:
                    return self.respond(413, {'error': '请求大小超出范围'})
                data = json.loads(self.rfile.read(length))
                if not isinstance(data, dict):
                    raise DomainError('请求必须是对象')
                result = store.command(data.get('op'), data.get('body', {}))
                self.respond(200, result)
            except (DomainError, ValueError) as e:
                self.respond(400, {'error': str(e)})
            except Exception:
                self.respond(500, {'error': '内核存储操作失败，请检查诊断，未重新创建生命'})

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    server.daemon_threads = True
    def parent_watch():
        sys.stdin.buffer.read()
        server.shutdown()
    threading.Thread(target=parent_watch, daemon=True).start()
    print(json.dumps({'port': server.server_port, 'protocol': 1}), flush=True)
    try:
        server.serve_forever(poll_interval=0.2)
    finally:
        server.server_close()
        store.close()
