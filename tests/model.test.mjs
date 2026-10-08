import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileApps, clampPage, pageCount, slotAt, appImage } from '../src/model.mjs';
const app = (pid, name, id = name) => ({ pid, name, id });
test('changing focus/list enumeration order does not shuffle existing app keys', () => {
  const initial = reconcileApps([], [app(2, 'Safari'), app(1, 'Codex')]);
  assert.deepEqual(reconcileApps(initial, [app(2, 'Safari'), app(3, 'Bear'), app(1, 'Codex')]).map(a => a.name), ['Codex', 'Safari', 'Bear']);
});
test('closed apps disappear and reused PIDs are treated as newly opened apps', () => {
  assert.deepEqual(reconcileApps([app(1, 'Codex'), app(2, 'Safari')], [app(1, 'Bear'), app(2, 'Safari')]).map(a => a.name), ['Safari', 'Bear']);
});
test('closing apps on the last page brings the page back into range', () => {
  assert.equal(pageCount(Array.from({ length: 13 }, (_, i) => app(i, `${i}`))), 3);
  assert.equal(clampPage(2, Array.from({ length: 6 }, (_, i) => app(i, `${i}`))), 0);
  assert.equal(clampPage(3, []), 0);
});
test('the six app positions exclude the two navigation keys', () => {
  assert.equal(slotAt({ row: 1, column: 1 }), 5);
  assert.equal(slotAt({ row: 1, column: 2 }), null);
  assert.equal(slotAt(undefined), null);
});
test('application names cannot inject SVG markup', () => {
  const svg = Buffer.from(appImage(app(1, '<'), 1).split(',')[1], 'base64').toString();
  assert.ok(svg.includes('&lt;'));
  assert.ok(svg.includes('#80efb6'));
});
