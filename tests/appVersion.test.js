import test from 'node:test';
import assert from 'node:assert/strict';

import { compareVersions, getVersionUpdateDecision } from '../src/controllers/appVersionController.js';

test('compareVersions detects older version correctly', () => {
  assert.equal(compareVersions('1.0.15', '1.0.16'), true);
  assert.equal(compareVersions('1.0.16', '1.0.16'), false);
  assert.equal(compareVersions('1.0.17', '1.0.16'), false);
});

test('getVersionUpdateDecision returns update state based on platform config', () => {
  const decision = getVersionUpdateDecision('1.0.15', '1.0.16', '1.0.17', false);
  assert.equal(decision.needsUpdate, true);
  assert.equal(decision.forceUpdate, true);

  const latestDecision = getVersionUpdateDecision('1.0.17', '1.0.16', '1.0.17', false);
  assert.equal(latestDecision.needsUpdate, false);
  assert.equal(latestDecision.forceUpdate, false);
});
