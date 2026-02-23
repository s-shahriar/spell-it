/* ═══════════════════════════════════════════════
   STORAGE — deleted words persisted in localStorage
═══════════════════════════════════════════════ */
const LS_KEY = 'spellit_deleted_v2';
const CL_KEY = 'spellit_customlist_v1';

function getDeleted() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}
function saveDeleted(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
}
function addToDeleted(word) {
  const d = getDeleted();
  if (!d.includes(word)) { d.push(word); saveDeleted(d); }
}
function removeFromDeleted(word) {
  saveDeleted(getDeleted().filter(w => w !== word));
}
function clearDeleted() { saveDeleted([]); }

/* ═══════════════════════════════════════════════
   GAME STATE
═══════════════════════════════════════════════ */
let MASTER = [];
let words = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let totalStarted = 0;
let isCustomMode = false;
let waitingForNext = false;

/* ═══════════════════════════════════════════════
   WORD LIST HELPERS
═══════════════════════════════════════════════ */
function buildWordList() {
  const deleted = new Set(getDeleted().map(w => w.toLowerCase()));
  const seen = new Set();
  return MASTER.filter(w => {
    const k = w.word.toLowerCase();
    if (seen.has(k) || deleted.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function cur() { return words[currentIndex]; }

/* ═══════════════════════════════════════════════
   DIFF HIGHLIGHT
   Shows the correct spelling letter-by-letter
   with wrong/missing letters highlighted in red
═══════════════════════════════════════════════ */
function buildDiff(correct, attempt) {
  let html = '';
  for (let i = 0; i < correct.length; i++) {
    const letter = correct[i];
    const matched = i < attempt.length && letter.toLowerCase() === attempt[i].toLowerCase();
    html += matched
      ? `<span class="ok">${letter}</span>`
      : `<span class="bad">${letter}</span>`;
  }
  return html;
}

/* ═══════════════════════════════════════════════
   UI
═══════════════════════════════════════════════ */
function updateUI() {
  if (!words.length) { showCompletion(); return; }
  waitingForNext = false;

  const w = cur();
  document.getElementById('wordNum').textContent = `${currentIndex + 1} of ${words.length}`;
  document.getElementById('modeTag').textContent = isCustomMode ? 'Custom List' : 'All Words';
  document.getElementById('bengaliHint').textContent = w.bengali;
  document.getElementById('meaningHint').textContent = w.meaning;

  const inp = document.getElementById('spellingInput');
  inp.value = ''; inp.className = ''; inp.disabled = false;
  document.getElementById('checkBtn').disabled = false;
  document.getElementById('feedback').textContent = '';
  document.getElementById('feedback').className = 'feedback';
  document.getElementById('wordCard').className = 'card';
  document.getElementById('wrongPanel').className = 'wrong-panel';
  document.getElementById('bottomActions').style.opacity = '1';
  document.getElementById('bottomActions').style.pointerEvents = 'auto';

  document.getElementById('correctCount').textContent = correctCount;
  document.getElementById('wrongCount').textContent = wrongCount;
  document.getElementById('remaining').textContent = words.length;

  const pct = totalStarted > 0 ? ((totalStarted - words.length) / totalStarted * 100) : 0;
  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('wordCountInfo').textContent = `${words.length} words left in list`;

  document.getElementById('switchAllBtn').classList.toggle('hidden', !isCustomMode);
  setTimeout(() => inp.focus(), 50);
}

function showCompletion() {
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('completionScreen').style.display = 'block';
  document.getElementById('finalScore').textContent =
    `✓ ${correctCount} correct  ✗ ${wrongCount} wrong — শাবাশ!`;
}

function lockUI(opacity) {
  const inp = document.getElementById('spellingInput');
  inp.disabled = true;
  inp.value = '';
  document.getElementById('checkBtn').disabled = true;
  document.getElementById('bottomActions').style.opacity = opacity;
  document.getElementById('bottomActions').style.pointerEvents = 'none';
}

/* ═══════════════════════════════════════════════
   GAME ACTIONS
═══════════════════════════════════════════════ */
function checkAnswer() {
  if (!words.length || waitingForNext) return;
  const inp = document.getElementById('spellingInput');
  const answer = inp.value.trim();
  if (!answer) return;

  const correct = cur().word;

  if (answer.toLowerCase() === correct.toLowerCase()) {
    inp.className = 'ci';
    const fb = document.getElementById('feedback');
    fb.textContent = '✓ Correct!';
    fb.className = 'feedback ok';
    document.getElementById('wordCard').className = 'card fc';
    correctCount++;
    lockUI('0.4');

    words.splice(currentIndex, 1);
    if (!words.length) { setTimeout(showCompletion, 800); return; }
    if (currentIndex >= words.length) currentIndex = 0;
    setTimeout(updateUI, 900);

  } else {
    inp.className = 'wi';
    document.getElementById('wordCard').className = 'card fw';
    wrongCount++;
    waitingForNext = true;
    document.getElementById('spellingInput').disabled = true;
    document.getElementById('checkBtn').disabled = true;
    document.getElementById('bottomActions').style.opacity = '0.3';
    document.getElementById('bottomActions').style.pointerEvents = 'none';

    document.getElementById('diffDisplay').innerHTML = buildDiff(correct, answer);
    document.getElementById('yourAttempt').textContent = `You typed: ${answer}`;

    document.getElementById('wrongPanel').className = 'wrong-panel show';
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('wrongCount').textContent = wrongCount;
  }
}

function nextAfterWrong() {
  currentIndex = (currentIndex + 1) % words.length;
  updateUI();
}

function skipWord() {
  if (!words.length || waitingForNext) return;
  currentIndex = (currentIndex + 1) % words.length;
  updateUI();
}

function deleteWord() {
  if (!words.length || waitingForNext) return;
  const name = cur().word;
  addToDeleted(name);
  words.splice(currentIndex, 1);
  totalStarted = Math.max(totalStarted - 1, words.length);
  showToast(`"${name}" deleted permanently ✓`);
  if (!words.length) { showCompletion(); return; }
  if (currentIndex >= words.length) currentIndex = 0;
  updateUI();
}

function restartGame() {
  words = buildWordList(); shuffle(words);
  currentIndex = 0; correctCount = 0; wrongCount = 0;
  totalStarted = words.length; isCustomMode = false;
  document.getElementById('completionScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  updateUI();
}

function switchToAllWords() {
  words = buildWordList(); shuffle(words);
  currentIndex = 0; correctCount = 0; wrongCount = 0;
  totalStarted = words.length; isCustomMode = false;
  document.getElementById('completionScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  updateUI();
}

/* ═══════════════════════════════════════════════
   CUSTOM MODE
═══════════════════════════════════════════════ */
function startCustomGame() {
  const raw = document.getElementById('customInput').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) { showToast('Please enter at least one word!'); return; }

  words = lines.map(w => {
    const found = MASTER.find(m => m.word.toLowerCase() === w.toLowerCase());
    return found || { word: w, bengali: '[ custom ]', meaning: 'Custom word' };
  });

  shuffle(words);
  currentIndex = 0; correctCount = 0; wrongCount = 0;
  totalStarted = words.length; isCustomMode = true;

  switchTab('game');
  document.getElementById('completionScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  updateUI();
}

/* ═══════════════════════════════════════════════
   DELETED WORDS MANAGER
═══════════════════════════════════════════════ */
function renderDeletedScreen() {
  const deleted = getDeleted();
  const list = document.getElementById('deletedList');
  if (!deleted.length) {
    list.innerHTML = '<span class="empty-deleted">No deleted words yet.</span>';
    return;
  }
  list.innerHTML = deleted.map(w => {
    const chip = document.createElement('div');
    chip.className = 'del-chip';
    chip.textContent = w;
    const btn = document.createElement('button');
    btn.title = 'Restore';
    btn.textContent = '↩';
    btn.addEventListener('click', () => restoreWord(w));
    chip.appendChild(btn);
    return chip.outerHTML;
  }).join('');
}

function restoreWord(word) {
  removeFromDeleted(word);
  showToast(`"${word}" restored ✓`);
  renderDeletedScreen();
}

function restoreAll() {
  clearDeleted();
  showToast('All words restored ✓');
  renderDeletedScreen();
}

function clearAllData() {
  if (!confirm('This will clear ALL saved data (deleted words + custom list). Are you sure?')) return;
  try { localStorage.clear(); } catch {}
  showToast('All data cleared ✓');
  renderDeletedScreen();
  document.getElementById('customInput').value = '';
}

/* ═══════════════════════════════════════════════
   TAB SWITCHING
═══════════════════════════════════════════════ */
function switchTab(tab) {
  const tabs = ['game', 'custom', 'deleted'];
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', tabs[i] === tab));
  document.getElementById('gameScreen').style.display    = tab === 'game'    ? 'block' : 'none';
  document.getElementById('completionScreen').style.display = 'none';
  document.getElementById('customScreen').style.display  = tab === 'custom'  ? 'block' : 'none';
  document.getElementById('deletedScreen').style.display = tab === 'deleted' ? 'block' : 'none';
  if (tab === 'deleted') renderDeletedScreen();
}

/* ═══════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════ */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

/* ═══════════════════════════════════════════════
   KEYBOARD
═══════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  waitingForNext ? nextAfterWrong() : checkAnswer();
});

/* ═══════════════════════════════════════════════
   CUSTOM LIST PERSISTENCE
═══════════════════════════════════════════════ */
const customTextarea = document.getElementById('customInput');

try {
  const saved = localStorage.getItem(CL_KEY);
  if (saved) customTextarea.value = saved;
} catch {}

customTextarea.addEventListener('input', () => {
  try { localStorage.setItem(CL_KEY, customTextarea.value); } catch {}
});

document.querySelector('.btn-clear-custom').addEventListener('click', () => {
  customTextarea.value = '';
  try { localStorage.removeItem(CL_KEY); } catch {}
});

/* ═══════════════════════════════════════════════
   INIT — fetch word list then start game
═══════════════════════════════════════════════ */
fetch('words.json')
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(data => {
    MASTER = data;
    words = buildWordList();
    shuffle(words);
    totalStarted = words.length;
    updateUI();
  })
  .catch(err => {
    document.getElementById('bengaliHint').textContent = 'Failed to load words.';
    console.error('Could not load words.json:', err);
  });
