import test from 'node:test';
import assert from 'node:assert/strict';
import { starterLesson, newBlock, normalizeLesson, safeEmbeddedJson, validateForExport } from '../lesson-core.js';
import { createStandaloneHtml } from '../export-player.js';

test('starter lesson is exportable and includes three block types', () => {
  const lesson = validateForExport(starterLesson);
  assert.deepEqual(lesson.blocks.map(block => block.type), ['read', 'quiz', 'reflect']);
  assert.match(createStandaloneHtml(lesson), /lesson-data/);
});
test('unfinished and invalid lessons cannot be exported', () => {
  assert.throws(() => validateForExport({ ...starterLesson, title: '' }), /title/);
  assert.throws(() => validateForExport({ ...starterLesson, blocks: [newBlock()] }), /Complete/);
  assert.throws(() => normalizeLesson({ ...starterLesson, blocks: [{ type: 'script' }] }), /unsupported/);
});
test('embedded JSON cannot terminate its script element', () => {
  const attack = '</script><script>alert(1)</script>';
  const lesson = structuredClone(starterLesson); lesson.title = attack;
  const json = safeEmbeddedJson(lesson);
  assert.equal(json.includes('</script>'), false);
  assert.equal(JSON.parse(json).title, attack);
  const html = createStandaloneHtml(lesson);
  assert.equal(html.includes(attack), false);
});
test('quiz correct answer must refer to an existing option', () => {
  const lesson = structuredClone(starterLesson); lesson.blocks[1].answer = 99;
  assert.throws(() => validateForExport(lesson), /correct answer/);
});
