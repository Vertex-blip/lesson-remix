const TYPES = ['read', 'quiz', 'reflect'];
export const starterLesson = {
  title: 'The art of noticing', subject: 'Creative thinking', duration: 10,
  intro: 'A tiny lesson on observing the world more closely.',
  blocks: [
    { id: 'intro', type: 'read', title: 'Look again', body: 'Familiar places are full of details we stop seeing. Pause and choose one ordinary object near you. Notice its shape, texture, and the shadows around it.' },
    { id: 'question', type: 'quiz', title: 'What changes an observation?', body: 'Which question helps you look more closely?', options: ['What do I already know?', 'What have I not noticed yet?', 'How quickly can I finish?'], answer: 1 },
    { id: 'reflection', type: 'reflect', title: 'Your turn', body: 'Write down one detail about your object that you had never noticed before.' }
  ]
};

export function newBlock(type = 'read') {
  if (!TYPES.includes(type)) throw new Error('Unsupported block type.');
  return { id: crypto.randomUUID(), type, title: '', body: '', options: ['Option A', 'Option B', 'Option C'], answer: 0 };
}

export function normalizeLesson(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.blocks)) throw new Error('This is not a LessonRemix project.');
  if (raw.blocks.length > 100) throw new Error('Lessons can contain at most 100 blocks.');
  const title = String(raw.title ?? '').trim().slice(0, 100);
  const subject = String(raw.subject ?? '').trim().slice(0, 50);
  const intro = String(raw.intro ?? '').trim().slice(0, 240);
  const duration = Number(raw.duration);
  if (!Number.isFinite(duration) || duration < 1 || duration > 240) throw new Error('Invalid lesson duration.');
  const blocks = raw.blocks.map((input, index) => {
    if (!input || !TYPES.includes(input.type)) throw new Error(`Block ${index + 1} has an unsupported type.`);
    const block = { id: String(input.id ?? index).slice(0, 80), type: input.type, title: String(input.title ?? '').trim().slice(0, 100), body: String(input.body ?? '').trim().slice(0, 3000) };
    if (block.type === 'quiz') {
      if (!Array.isArray(input.options) || input.options.length < 2 || input.options.length > 5) throw new Error(`Block ${index + 1} needs 2 to 5 answer options.`);
      block.options = input.options.map(option => String(option ?? '').trim().slice(0, 180));
      block.answer = Number(input.answer);
      if (!Number.isInteger(block.answer) || block.answer < 0 || block.answer >= block.options.length) throw new Error(`Block ${index + 1} has no valid correct answer.`);
    }
    return block;
  });
  return { title, subject, duration, intro, blocks };
}

export function validateForExport(lesson) {
  const clean = normalizeLesson(lesson);
  if (!clean.title) throw new Error('Add a lesson title before exporting.');
  if (!clean.blocks.length) throw new Error('Add at least one block before exporting.');
  for (const [index, block] of clean.blocks.entries()) {
    if (!block.title || !block.body) throw new Error(`Complete the title and content of block ${index + 1}.`);
    if (block.type === 'quiz' && block.options.some(option => !option)) throw new Error(`Complete every answer option in block ${index + 1}.`);
  }
  return clean;
}

export function safeEmbeddedJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
