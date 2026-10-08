// GUI-session test: switch to Finder, verify macOS focus, then restore the original app.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
const helper = spawn('./com.marclefebvre.openapps.sdPlugin/bin/open-apps-helper');
let snapshot;
const results = new Map();
createInterface({ input: helper.stdout }).on('line', line => {
  const message = JSON.parse(line);
  if (message.type === 'snapshot') snapshot = message;
  if (message.type === 'result') results.set(message.requestId, message.ok);
});
helper.stderr.on('data', data => process.stderr.write(data));
const waitFor = async predicate => {
  const until = Date.now() + 6000;
  while (!predicate()) {
    if (Date.now() > until) throw new Error('macOS helper verification timed out');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};
let original;
try {
  await waitFor(() => snapshot?.apps.length);
  original = snapshot.apps.find(app => app.pid === snapshot.activePid);
  const finder = snapshot.apps.find(app => app.id === 'com.apple.finder');
  assert.ok(finder, 'Finder must be running for this test');
  helper.stdin.write(JSON.stringify({ ...finder, requestId: 'finder-test' }) + '\n');
  await waitFor(() => results.has('finder-test'));
  assert.equal(results.get('finder-test'), true, 'Finder activation request must succeed');
  await waitFor(() => snapshot.activePid === finder.pid);
  console.log('Verified: native app enumeration, icons, and Finder activation.');
} finally {
  if (original && helper.stdin.writable) {
    helper.stdin.write(JSON.stringify({ ...original, requestId: 'restore' }) + '\n');
    await waitFor(() => results.has('restore')).catch(() => {});
  }
  helper.stdin.end();
  await once(helper, 'exit');
}
