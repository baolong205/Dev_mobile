import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('delete action is visible on active cards but disabled, with an explanation and handler guard', async () => {
  const source = await readFile(new URL('../src/components/AlertCard.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /!active && remove/);
  assert.match(source, /disabled=\{active \|\| busy \|\| !online \|\| !remove\}/);
  assert.match(source, /if \(active \|\| busy \|\| !online \|\| !remove\) return;/);
  assert.match(source, /Nút xóa đang khóa/);
  assert.match(source, /style: 'destructive'/);
});