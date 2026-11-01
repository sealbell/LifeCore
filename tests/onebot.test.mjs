import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocketServer } from 'ws';
import { OneBot } from '../src/onebot.js';

test('real websocket handshake, account rejection, reconnect and unknown timeout without retry', async () => {
  const server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await new Promise(r => server.once('listening', r));
  let sends = 0;
  server.on('connection', socket => socket.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.action === 'send_private_msg') { sends++; return; }
    const data = msg.action === 'get_login_info' ? { user_id: 123, nickname: 'fixture' } : { online: true };
    socket.send(JSON.stringify({ echo: msg.echo, status: 'ok', retcode: 0, data }));
  }));
  const client = new OneBot({ timeout: 150 });
  const config = { url: `ws://127.0.0.1:${server.address().port}`, account: '123' };
  try {
    await assert.rejects(client.connect({ ...config, account: '456' }), /账号/);
    await client.connect(config);
    await client.connect(config);
    assert.equal(client.status, 'online');
    for (const socket of server.clients) socket.send('null');
    await new Promise(r => setTimeout(r, 20));
    assert.equal(client.status, 'online');
    const concurrent = await Promise.allSettled([client.connect(config), client.connect(config)]);
    assert.equal(concurrent[1].status, 'fulfilled');
    assert.equal(client.status, 'online');
    await assert.rejects(client.call('send_private_msg', {}), /未知/);
    assert.equal(sends, 1);
  } finally { await client.close(); for (const socket of server.clients) socket.terminate(); await new Promise(r => server.close(r)); }
});
