import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from './store.js';

test('after a restart, each lead comes back as its latest version', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hvac-store-'));
  const file = join(dir, 'leads.jsonl');
  const first = await openStore(file);
  await first.save({ id: 'a', reference: 'HV-AAAAAA', leadStatus: 'new' });
  await first.save({ id: 'b', reference: 'HV-BBBBBB', leadStatus: 'new' });
  await first.save({ id: 'a', reference: 'HV-AAAAAA', leadStatus: 'contacted' });
  await appendFile(file, '{"id": "half-writ\n'); // a crash mid-write

  const again = await openStore(file);
  assert.equal(again.all().length, 2);
  assert.equal(again.get('a').leadStatus, 'contacted');
  assert.equal(again.findByReference('HV-BBBBBB').id, 'b');
  await rm(dir, { recursive: true, force: true });
});
