import { starterLesson, newBlock, normalizeLesson, validateForExport } from './lesson-core.js';
import { createStandaloneHtml } from './export-player.js';

const STORAGE_KEY = 'lessonremix-project-v1';
const $ = selector => document.querySelector(selector);
const clone = value => structuredClone(value);
const types = { read: 'Read', quiz: 'Quick check', reflect: 'Reflection' };
const typeIcons = { read: '▤', quiz: '?', reflect: '✎' };
let lesson = loadLesson();
let selected = 0;
let previewPosition = -1;
let previewAnswers = {};
let previewReflections = {};
let toastTimer;

function loadLesson() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeLesson(JSON.parse(saved)) : clone(starterLesson);
  } catch { return clone(starterLesson); }
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lesson)); $('.draft-indicator').lastChild.textContent = ' Saved in this browser'; }
  catch { $('.draft-indicator').lastChild.textContent = ' Storage unavailable'; }
}
function toast(message, error = false) {
  const box = $('#toast'); box.textContent = message; box.classList.toggle('error', error); box.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('show'), 3600);
}
function el(tag, className = '', text = '') {
  const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
}
function download(name, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function slug(text) { return (text || 'lesson').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'lesson'; }

function renderDetails() {
  $('#lesson-title').value = lesson.title;
  $('#lesson-subject').value = lesson.subject;
  $('#lesson-duration').value = String(lesson.duration);
  $('#lesson-intro').value = lesson.intro;
  updateBreadcrumb();
}
function updateBreadcrumb() { $('#breadcrumb-title').textContent = lesson.title.trim() || 'Untitled lesson'; }
function renderNav() {
  const nav = $('#lesson-nav'); nav.replaceChildren();
  lesson.blocks.forEach((block, index) => {
    const button = el('button', `lesson-nav-item${index === selected ? ' active' : ''}`); button.type = 'button';
    button.append(el('span', 'nav-number', String(index + 1).padStart(2, '0')), el('span', 'lesson-nav-title', block.title || `Untitled ${types[block.type].toLowerCase()}`));
    button.addEventListener('click', () => { showEditor(); selectBlock(index); document.querySelectorAll('.block-card')[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    nav.append(button);
  });
}
function textField(label, value, onInput, opts = {}) {
  const wrapper = el('label', `field${opts.wide ? ' field-wide' : ''}`);
  wrapper.append(el('span', '', label));
  const input = el(opts.multiline ? 'textarea' : 'input');
  if (opts.multiline) { input.rows = opts.rows || 3; input.maxLength = opts.max || 3000; }
  else { input.type = 'text'; input.maxLength = opts.max || 100; }
  input.placeholder = opts.placeholder || ''; input.value = value ?? '';
  input.addEventListener('input', () => onInput(input.value));
  wrapper.append(input); return wrapper;
}
function actionButton(label, glyph, callback, extra = '') {
  const button = el('button', `block-action ${extra}`, glyph); button.type = 'button'; button.title = label; button.setAttribute('aria-label', label); button.addEventListener('click', callback); return button;
}
function renderBlocks() {
  $('#block-count').textContent = lesson.blocks.length;
  const list = $('#block-list'); list.replaceChildren();
  lesson.blocks.forEach((block, index) => {
    const card = el('article', `block-card${index === selected ? ' is-selected' : ''}`); card.id = `block-${index+1}`;
    const header = el('div', 'block-header'); const left = el('div', 'block-header-left');
    left.append(el('span', 'block-number', String(index + 1).padStart(2, '0')), el('strong', '', block.title || `Untitled ${types[block.type].toLowerCase()}`), el('span', 'block-type-label', `· ${types[block.type]}`));
    const actions = el('div', 'block-actions');
    actions.append(actionButton('Move block up', '↑', () => moveBlock(index, -1)), actionButton('Move block down', '↓', () => moveBlock(index, 1)), actionButton('Duplicate block', '⧉', () => duplicateBlock(index)), actionButton('Delete block', '×', () => deleteBlock(index), 'delete'));
    header.append(left, actions); card.append(header);
    const body = el('div', 'block-body');
    const typeBox = el('div', 'field field-wide'); typeBox.append(el('span', '', 'Block type'));
    const typeChooser = el('div', 'type-chooser');
    for (const type of Object.keys(types)) {
      const button = el('button', `type-chip${block.type === type ? ' active' : ''}`, `${typeIcons[type]}  ${types[type]}`); button.type = 'button'; button.setAttribute('aria-pressed', String(block.type === type));
      button.addEventListener('click', () => { block.type = type; if (type === 'quiz') { block.options ??= ['Option A', 'Option B', 'Option C']; block.answer ??= 0; } selected = index; save(); renderAll(); });
      typeChooser.append(button);
    }
    typeBox.append(typeChooser); body.append(typeBox);
    body.append(textField('Block title', block.title, value => { block.title = value; header.querySelector('strong').textContent = value || `Untitled ${types[block.type].toLowerCase()}`; save(); renderNav(); }, { wide: true, max: 100, placeholder: 'Give this moment a title' }));
    body.append(textField(block.type === 'quiz' ? 'Question' : block.type === 'reflect' ? 'Reflection prompt' : 'Content', block.body, value => { block.body = value; save(); }, { wide: true, multiline: true, rows: block.type === 'read' ? 5 : 3, max: 3000, placeholder: block.type === 'quiz' ? 'Ask a question with one correct answer' : block.type === 'reflect' ? 'Ask learners to think or write' : 'Teach the idea in your own words' }));
    if (block.type === 'quiz') {
      const options = el('div', 'quiz-options');
      block.options.forEach((option, optionIndex) => options.append(textField(`Option ${String.fromCharCode(65+optionIndex)}`, option, value => { block.options[optionIndex] = value; save(); }, { max: 180, placeholder: 'Answer option' })));
      body.append(options);
      const answerLabel = el('label', 'field quiz-answer'); answerLabel.append(el('span', '', 'Correct answer'));
      const select = el('select');
      block.options.forEach((_, optionIndex) => { const option = el('option', '', `Option ${String.fromCharCode(65+optionIndex)}`); option.value = String(optionIndex); select.append(option); });
      select.value = String(block.answer); select.addEventListener('change', () => { block.answer = Number(select.value); save(); });
      answerLabel.append(select); body.append(answerLabel);
      body.append(el('p', 'block-hint', 'Students receive immediate feedback after choosing an answer.'));
    }
    card.append(body); card.addEventListener('focusin', () => selectBlock(index)); list.append(card);
  });
  renderNav();
}
function renderAll() { renderDetails(); renderBlocks(); save(); }
function selectBlock(index) {
  selected = index;
  document.querySelectorAll('.block-card').forEach((card, position) => card.classList.toggle('is-selected', position === selected));
  renderNav();
}
function addBlock() {
  if (lesson.blocks.length >= 100) { toast('A lesson can have at most 100 blocks.', true); return; }
  lesson.blocks.push(newBlock()); selected = lesson.blocks.length - 1; renderAll();
  requestAnimationFrame(() => document.querySelectorAll('.block-card')[selected]?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}
function moveBlock(index, direction) {
  const target = index + direction; if (target < 0 || target >= lesson.blocks.length) return;
  [lesson.blocks[index], lesson.blocks[target]] = [lesson.blocks[target], lesson.blocks[index]]; selected = target; renderAll();
}
function duplicateBlock(index) {
  if (lesson.blocks.length >= 100) { toast('A lesson can have at most 100 blocks.', true); return; }
  const copy = clone(lesson.blocks[index]); copy.id = crypto.randomUUID(); copy.title = `${copy.title || 'Untitled'} (copy)`; lesson.blocks.splice(index + 1, 0, copy); selected = index + 1; renderAll();
}
function deleteBlock(index) {
  lesson.blocks.splice(index, 1); selected = Math.max(0, Math.min(selected, lesson.blocks.length - 1)); renderAll();
}
function showEditor() { $('#preview-view').hidden = true; $('#editor-view').hidden = false; $('#nav-editor').classList.add('active'); $('#nav-preview').classList.remove('active'); }
function showPreview() { $('#editor-view').hidden = true; $('#preview-view').hidden = false; $('#nav-editor').classList.remove('active'); $('#nav-preview').classList.add('active'); previewPosition = -1; previewAnswers = {}; previewReflections = {}; renderPlayer(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

function renderPlayer() {
  const body = $('#player-body'); body.replaceChildren();
  const total = lesson.blocks.length;
  if (previewPosition < 0) {
    body.append(el('span', 'player-kicker', lesson.subject || 'Interactive lesson'), el('h2', '', lesson.title || 'Untitled lesson'), el('p', 'match-subtitle', `${lesson.duration} minute lesson`), el('p', 'player-copy', lesson.intro || 'Ready to begin?'));
    $('#player-count').textContent = 'Introduction';
  } else if (previewPosition >= total) {
    const wrap = el('div', 'finish-card'); wrap.append(el('div', 'finish-spark', '✳'), el('h2', '', 'Nicely done.'), el('p', '', `You reached the end of ${lesson.title || 'this lesson'}.`));
    const quizzes = lesson.blocks.map((block, index) => ({ block, index })).filter(item => item.block.type === 'quiz');
    if (quizzes.length) wrap.append(el('p', '', `${quizzes.filter(item => previewAnswers[item.index] === item.block.answer).length} of ${quizzes.length} quiz questions correct`));
    body.append(wrap); $('#player-count').textContent = 'Complete';
  } else {
    const block = lesson.blocks[previewPosition];
    body.append(el('span', 'player-kicker', `Block ${previewPosition + 1} / ${total} · ${types[block.type]}`), el('h2', '', block.title || 'Untitled block'), el('p', 'player-copy', block.body || 'Add content in the editor.'));
    $('#player-count').textContent = `${previewPosition + 1} / ${total}`;
    if (block.type === 'quiz') {
      block.options.forEach((option, index) => {
        const button = el('button', 'player-option'); button.type = 'button'; button.append(el('span', '', String.fromCharCode(65 + index)), document.createTextNode(option));
        if (previewAnswers[previewPosition] === index) button.classList.add('selected');
        if (previewAnswers[previewPosition] !== undefined) { if (index === block.answer) button.classList.add('correct'); else if (index === previewAnswers[previewPosition]) button.classList.add('incorrect'); }
        button.addEventListener('click', () => { previewAnswers[previewPosition] = index; renderPlayer(); }); body.append(button);
      });
      if (previewAnswers[previewPosition] !== undefined) body.append(el('p', `player-feedback${previewAnswers[previewPosition] === block.answer ? '' : ' wrong'}`, previewAnswers[previewPosition] === block.answer ? 'Exactly right.' : 'Not quite. The highlighted answer is correct.'));
    }
    if (block.type === 'reflect') {
      const input = el('textarea', 'player-reflection'); input.placeholder = 'Write your thoughts here. They stay in this tab.'; input.value = previewReflections[previewPosition] || '';
      input.addEventListener('input', () => { previewReflections[previewPosition] = input.value; }); body.append(input);
    }
  }
  $('#player-prev').disabled = previewPosition < 0;
  $('#player-next').disabled = previewPosition >= total || (previewPosition >= 0 && lesson.blocks[previewPosition].type === 'quiz' && previewAnswers[previewPosition] === undefined);
  $('#player-next').textContent = previewPosition < 0 ? 'Start lesson →' : previewPosition === total - 1 ? 'Finish →' : 'Next →';
  $('#player-progress-fill').style.width = `${previewPosition < 0 ? 0 : previewPosition >= total ? 100 : Math.round((previewPosition + 1) / (total + 1) * 100)}%`;
}

for (const [selector, key] of [['#lesson-title','title'],['#lesson-subject','subject'],['#lesson-intro','intro']]) {
  $(selector).addEventListener('input', event => { lesson[key] = event.target.value; save(); if (key === 'title') updateBreadcrumb(); });
}
$('#lesson-duration').addEventListener('change', event => { lesson.duration = Number(event.target.value); save(); });
for (const selector of ['#add-slide-sidebar','#add-slide-top','#add-slide-bottom']) $(selector).addEventListener('click', addBlock);
$('#nav-editor').addEventListener('click', showEditor);
$('#nav-preview').addEventListener('click', showPreview);
$('#back-editor').addEventListener('click', showEditor);
$('#player-prev').addEventListener('click', () => { if (previewPosition > -1) { previewPosition--; renderPlayer(); } });
$('#player-next').addEventListener('click', () => { if (previewPosition < lesson.blocks.length) { previewPosition++; renderPlayer(); } });
for (const selector of ['#export-html','#export-html-bottom']) $(selector).addEventListener('click', () => {
  try { const clean = validateForExport(lesson); download(`${slug(clean.title)}.html`, 'text/html;charset=utf-8', createStandaloneHtml(clean)); toast('Standalone lesson downloaded.'); }
  catch (error) { toast(error.message, true); }
});
$('#export-json').addEventListener('click', () => { download(`${slug(lesson.title)}.lessonremix.json`, 'application/json;charset=utf-8', JSON.stringify(lesson, null, 2)); toast('Project backup downloaded.'); });
$('#import-json').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try { if (file.size > 1_000_000) throw new Error('Choose a project file under 1 MB.'); lesson = normalizeLesson(JSON.parse(await file.text())); selected = 0; showEditor(); renderAll(); toast('Project imported.'); }
  catch (error) { toast(error.message || 'Could not read that project.', true); }
  event.target.value = '';
});
$('#new-lesson').addEventListener('click', () => {
  if (!window.confirm('Start a new lesson? Download your project JSON first if you want to keep this draft.')) return;
  lesson = { title: '', subject: '', duration: 10, intro: '', blocks: [newBlock()] }; selected = 0; renderAll(); toast('New lesson ready.'); window.scrollTo({ top: 0, behavior: 'smooth' });
});
renderAll();
