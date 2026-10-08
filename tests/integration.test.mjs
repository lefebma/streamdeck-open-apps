import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocketServer } from 'ws';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';

test('the built plugin renders eight keys, pages, and activates the displayed app', { timeout: 15000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'open-apps-integration-'));
  await mkdir(join(root, 'bin'));
  await copyFile('com.marclefebvre.openapps.sdPlugin/manifest.json', join(root, 'manifest.json'));
  await copyFile('com.marclefebvre.openapps.sdPlugin/bin/plugin.js', join(root, 'bin/plugin.js'));
  // Substitute the native helper at its protocol boundary, with 13 running apps.
  await writeFile(join(root, 'bin/open-apps-helper'), `#!/usr/bin/env node
const apps = Array.from({length:13}, (_,i)=>({pid:i+100,id:'app'+i,name:'App '+String(i).padStart(2,'0'),icon:''}));
let activePid=100;
const send = value => process.stdout.write(JSON.stringify(value)+'\\n');
const snapshot = () => send({type:'snapshot',apps,activePid});
require('node:readline').createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);activePid=m.pid;send({type:'result',requestId:m.requestId,ok:true});snapshot();}).on('close',()=>process.exit(0));
snapshot();
`, { mode: 0o755 });
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(server, 'listening');
  let plugin;
  let socket;
  const messages = [];
  const info = { application: { font: 'Arial', language: 'en', platform: 'mac', platformVersion: '27.2', version: '7.6' }, colors: {}, devicePixelRatio: 2, devices: [{ id: 'test-neo', name: 'Neo', type: 9, size: { columns: 4, rows: 2 } }], plugin: { uuid: 'com.marclefebvre.openapps', version: '0.1.0.0' } };
  const waitFor = async predicate => {
    const limit = Date.now() + 5000;
    while (!predicate()) {
      if (Date.now() > limit) throw new Error('Timed out waiting for plugin response');
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  };
  try {
    const connected = once(server, 'connection');
    plugin = spawn(process.execPath, ['bin/plugin.js', '-port', String(server.address().port), '-pluginUUID', 'test-plugin', '-registerEvent', 'registerPlugin', '-info', JSON.stringify(info)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    let errors = '';
    plugin.stderr.on('data', data => { errors += data; });
    [socket] = await connected;
    socket.on('message', data => {
      const message = JSON.parse(data);
      messages.push(message);
      if (message.event === 'getGlobalSettings') socket.send(JSON.stringify({ event: 'didReceiveGlobalSettings', context: 'test-plugin', payload: { settings: {} } }));
    });
    await waitFor(() => messages.some(m => m.event === 'registerPlugin'));
    const event = (slot, type) => {
      const kind = slot < 6 ? 'app' : slot === 6 ? 'previous' : 'next';
      socket.send(JSON.stringify({ event: type, action: `com.marclefebvre.openapps.${kind}`, context: `key-${slot}`, device: 'test-neo', payload: { controller: 'Keypad', coordinates: { column: slot % 4, row: Math.floor(slot / 4) }, settings: {}, state: 0, isInMultiAction: false } }));
    };
    const latest = (context, type) => messages.filter(m => m.context === context && m.event === type).at(-1);
    for (let slot = 0; slot < 8; slot++) event(slot, 'willAppear');
    await waitFor(() => latest('key-7', 'setTitle')?.payload.title === 'Next\n1/3');
    assert.equal(latest('key-0', 'setTitle').payload.title, 'App\n00');
    assert.ok(latest('key-0', 'setImage').payload.image.startsWith('data:image/svg+xml;base64,'));
    event(7, 'keyDown');
    await waitFor(() => latest('key-7', 'setTitle')?.payload.title === 'Next\n2/3');
    assert.equal(latest('key-0', 'setTitle').payload.title, 'App\n06');
    event(0, 'keyDown');
    await waitFor(() => Buffer.from(latest('key-0', 'setImage').payload.image.split(',')[1], 'base64').toString().includes('stroke="#80efb6"'));
    // Activating a key must not move its app to a different position.
    assert.equal(latest('key-0', 'setTitle').payload.title, 'App\n06');
    event(6, 'keyDown');
    await waitFor(() => latest('key-0', 'setTitle')?.payload.title === 'App\n00');
    assert.ok(!messages.some(m => m.event === 'switchToProfile'), 'Startup must preserve the current profile');
    assert.equal(errors, '');
  } finally {
    if (plugin && plugin.exitCode === null) { plugin.kill(); await once(plugin, 'exit'); }
    socket?.terminate();
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
