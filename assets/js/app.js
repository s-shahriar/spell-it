/* ═══════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════ */
const CL_KEY    = 'spellit_customlist_v1';
const WM_CL_KEY = 'wm_customlist_v1';

/* ═══════════════════════════════════════════════
   GAME STATE
═══════════════════════════════════════════════ */
let BATCH1 = [];
let BATCH2 = [];

let words = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let totalStarted = 0;
let isCustomMode = false;
let currentBatch = '1';        // '1' | '2' | 'all'
let currentDifficulty = 'all'; // 'all' | 'hard' | 'medium'
let waitingForNext = false;

/* ═══════════════════════════════════════════════
   WORD LIST HELPERS
═══════════════════════════════════════════════ */
function getSourceList() {
  let list;
  if (currentBatch === '1')      list = BATCH1;
  else if (currentBatch === '2') list = BATCH2;
  else                           list = [...BATCH1, ...BATCH2];

  if (currentDifficulty === 'all') return list;
  return list.filter(w => w.difficulty === currentDifficulty);
}

function buildWordList() {
  const seen = new Set();
  return getSourceList().filter(w => {
    const k = w.word.toLowerCase();
    if (seen.has(k)) return false;
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

function batchLabel() {
  if (isCustomMode) return 'Custom List';
  const diff = currentDifficulty !== 'all' ? ` · ${currentDifficulty.toUpperCase()}` : '';
  if (currentBatch === '1')  return `Batch 1${diff}`;
  if (currentBatch === '2')  return `Batch 2${diff}`;
  return `All Words${diff}`;
}

/* ═══════════════════════════════════════════════
   BATCH SELECTION
═══════════════════════════════════════════════ */
function selectBatch(batch) {
  currentBatch = batch;
  isCustomMode = false;
  words = buildWordList();
  shuffle(words);
  currentIndex = 0; correctCount = 0; wrongCount = 0;
  totalStarted = words.length;

  document.querySelectorAll('.batch-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.batch === batch));

  document.getElementById('completionScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  updateUI();
}

/* ═══════════════════════════════════════════════
   DIFFICULTY SELECTION
═══════════════════════════════════════════════ */
function selectDifficulty(diff) {
  currentDifficulty = diff;
  isCustomMode = false;
  words = buildWordList();
  shuffle(words);
  currentIndex = 0; correctCount = 0; wrongCount = 0;
  totalStarted = words.length;

  document.querySelectorAll('.diff-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.diff === diff));

  document.getElementById('completionScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  updateUI();
}

/* ═══════════════════════════════════════════════
   DIFF HIGHLIGHT
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
  document.getElementById('modeTag').textContent = batchLabel();
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
  document.getElementById('batchSelector').classList.toggle('hidden', isCustomMode);
  document.getElementById('diffSelector').classList.toggle('hidden', isCustomMode);
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
  // intentionally NOT clearing inp.value — user can see their correct spelling during the delay
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


function restartGame() {
  words = buildWordList(); shuffle(words);
  currentIndex = 0; correctCount = 0; wrongCount = 0;
  totalStarted = words.length; isCustomMode = false;
  document.getElementById('completionScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
  updateUI();
}

function switchToAllWords() {
  isCustomMode = false;
  words = buildWordList(); shuffle(words);
  currentIndex = 0; correctCount = 0; wrongCount = 0;
  totalStarted = words.length;
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === 0));
  siSwitchSubTab('practice');
  updateUI();
}

/* ═══════════════════════════════════════════════
   CUSTOM MODE
═══════════════════════════════════════════════ */
function startCustomGame() {
  const raw = document.getElementById('customInput').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) { showToast('Please enter at least one word!'); return; }

  const allMaster = [...BATCH1, ...BATCH2];
  words = lines.map(w => {
    const found = allMaster.find(m => m.word.toLowerCase() === w.toLowerCase());
    return found || { word: w, bengali: '[ custom ]', meaning: 'Custom word' };
  });

  shuffle(words);
  currentIndex = 0; correctCount = 0; wrongCount = 0;
  totalStarted = words.length; isCustomMode = true;

  siSwitchSubTab('practice');
  updateUI();
}


/* ═══════════════════════════════════════════════
   TAB SWITCHING
═══════════════════════════════════════════════ */
function switchTab(tab) {
  const tabs = ['game', 'wordmeaning'];
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', tabs[i] === tab));
  document.getElementById('siSection').style.display        = tab === 'game'        ? 'block' : 'none';
  document.getElementById('completionScreen').style.display = 'none';
  document.getElementById('wmScreen').style.display         = tab === 'wordmeaning' ? 'block' : 'none';

  const isWM = tab === 'wordmeaning';
  document.body.classList.toggle('wm-mode', isWM);
  document.querySelector('h1').textContent = isWM ? 'WORD MEANING' : 'SPELL IT';
  document.querySelector('.subtitle').innerHTML = isWM
    ? 'শব্দের অর্থ জানো &nbsp;·&nbsp; Word Meaning Quiz'
    : 'বানান শেখার খেলা &nbsp;·&nbsp; Vocabulary Builder';
}

function siSwitchSubTab(tab) {
  document.querySelectorAll('.si-subtab').forEach((btn, i) =>
    btn.classList.toggle('active', ['practice', 'custom'][i] === tab));
  const isPractice = tab === 'practice';
  document.getElementById('gameScreen').style.display   = isPractice ? 'block' : 'none';
  document.getElementById('completionScreen').style.display = 'none';
  document.getElementById('customScreen').style.display = isPractice ? 'none'  : 'block';
}

/* ═══════════════════════════════════════════════
   WORD MEANING GAME
═══════════════════════════════════════════════ */
let WM_WORDS = [];
let wmWords = [];
let wmIndex = 0;
let wmCorrect = 0;
let wmWrong = 0;
let wmTotalStarted = 0;
let wmDifficulty = 'all';
let wmLetter = 'all';
let wmWaiting = false;
let wmIsCustomMode = false;

function wmGetSourceList() {
  let list = WM_WORDS;
  if (wmDifficulty !== 'all') list = list.filter(w => w.difficulty === wmDifficulty);
  if (wmLetter !== 'all')     list = list.filter(w => w.word[0].toUpperCase() === wmLetter);
  return list;
}

function wmBuildLetterSelector() {
  const sourceByDiff = wmDifficulty === 'all'
    ? WM_WORDS
    : WM_WORDS.filter(w => w.difficulty === wmDifficulty);

  const letters = new Set(sourceByDiff.map(w => w.word[0].toUpperCase()));
  const sorted = Array.from(letters).sort();

  // If current letter no longer available, reset
  if (wmLetter !== 'all' && !letters.has(wmLetter)) wmLetter = 'all';

  const container = document.getElementById('wmLetterSelector');
  let html = `<button class="wm-letter-btn${wmLetter === 'all' ? ' active' : ''}" data-letter="all" onclick="wmSelectLetter('all')">All</button>`;
  sorted.forEach(l => {
    html += `<button class="wm-letter-btn${wmLetter === l ? ' active' : ''}" data-letter="${l}" onclick="wmSelectLetter('${l}')">${l}</button>`;
  });
  container.innerHTML = html;
}

function wmModeLabel() {
  if (wmIsCustomMode) return 'Custom List';
  const diff = wmDifficulty !== 'all' ? ` · ${wmDifficulty.toUpperCase()}` : '';
  const letter = wmLetter !== 'all' ? ` · ${wmLetter}` : '';
  return `Word Meaning${diff}${letter}`;
}

function wmSelectDifficulty(diff) {
  wmDifficulty = diff;
  document.querySelectorAll('.wm-diff-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.diff === diff));
  wmBuildLetterSelector();
  wmStartGame();
}

function wmSelectLetter(letter) {
  wmLetter = letter;
  wmBuildLetterSelector();
  wmStartGame();
}

function wmStartGame() {
  wmWords = [...wmGetSourceList()];
  for (let i = wmWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wmWords[i], wmWords[j]] = [wmWords[j], wmWords[i]];
  }
  wmIndex = 0; wmCorrect = 0; wmWrong = 0;
  wmTotalStarted = wmWords.length; wmWaiting = false;
  document.getElementById('wmCompletionScreen').style.display = 'none';
  document.getElementById('wmGameArea').style.display = 'block';
  wmUpdateUI();
}

function wmGetWrongOptions(correctWord, correctMeaning) {
  // Exclude same word AND same meaning to avoid duplicate/ambiguous choices
  const pool = WM_WORDS.filter(w =>
    w.word.toLowerCase() !== correctWord.toLowerCase() &&
    w.meaning !== correctMeaning
  );
  // Fisher-Yates shuffle on the pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Pick 3 with unique meanings
  const seen = new Set();
  const result = [];
  for (const w of pool) {
    if (!seen.has(w.meaning)) {
      seen.add(w.meaning);
      result.push(w.meaning);
      if (result.length === 3) break;
    }
  }
  return result;
}

function wmUpdateUI() {
  if (!wmWords.length) { wmShowCompletion(); return; }
  wmWaiting = false;

  const w = wmWords[wmIndex];
  document.getElementById('wmWordNum').textContent  = `${wmIndex + 1} of ${wmWords.length}`;
  document.getElementById('wmModeTag').textContent  = wmModeLabel();
  document.getElementById('wmWord').textContent     = w.word;
  document.getElementById('wmCorrectCount').textContent = wmCorrect;
  document.getElementById('wmWrongCount').textContent   = wmWrong;
  document.getElementById('wmRemaining').textContent    = wmWords.length;
  document.getElementById('wmWordCountInfo').textContent = `${wmWords.length} words left`;

  const pct = wmTotalStarted > 0 ? ((wmTotalStarted - wmWords.length) / wmTotalStarted * 100) : 0;
  document.getElementById('wmProgressBar').style.width = pct + '%';

  // Build 4 options: 1 correct + 3 wrong (all unique meanings)
  const wrongOpts = wmGetWrongOptions(w.word, w.meaning);
  const allOpts = [w.meaning, ...wrongOpts];
  // Fisher-Yates shuffle the 4 options
  for (let i = allOpts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allOpts[i], allOpts[j]] = [allOpts[j], allOpts[i]];
  }

  const btns = document.querySelectorAll('.wm-choice-btn');
  btns.forEach((btn, i) => {
    btn.textContent = allOpts[i];
    btn.dataset.correct = (allOpts[i] === w.meaning) ? 'true' : 'false';
    btn.className = 'wm-choice-btn';
    btn.style.display = '';
    btn.disabled = false;
  });

  const fb = document.getElementById('wmFeedback');
  fb.textContent = ''; fb.className = 'wm-feedback';
  document.getElementById('wmNextBtn').style.display = 'none';
  document.getElementById('wmCard').style.borderColor = '';
  document.getElementById('wmCard').style.boxShadow = '';
  document.getElementById('wmActions').style.opacity = '1';
  document.getElementById('wmActions').style.pointerEvents = 'auto';

  // Show/hide filters and back button based on mode
  const showFilters = !wmIsCustomMode;
  document.getElementById('wmDiffSelector').style.display   = showFilters ? '' : 'none';
  document.getElementById('wmLetterSelector').style.display = showFilters ? '' : 'none';
  document.getElementById('wmBackBtn').classList.toggle('hidden', !wmIsCustomMode);
}

function wmSelectAnswer(btn) {
  if (wmWaiting) return;
  const isCorrect = btn.dataset.correct === 'true';

  // Disable all buttons & highlight
  document.querySelectorAll('.wm-choice-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.correct === 'true')   b.className = 'wm-choice-btn correct';
    else if (b === btn && !isCorrect)   b.className = 'wm-choice-btn wrong';
  });

  const fb = document.getElementById('wmFeedback');

  if (isCorrect) {
    wmCorrect++;
    fb.textContent = '✓ সঠিক!'; fb.className = 'wm-feedback ok';
    document.getElementById('wmCorrectCount').textContent = wmCorrect;
    wmWords.splice(wmIndex, 1);
    if (!wmWords.length) { setTimeout(wmShowCompletion, 1000); return; }
    if (wmIndex >= wmWords.length) wmIndex = 0;
    setTimeout(wmUpdateUI, 1000);
  } else {
    wmWrong++;
    fb.textContent = '✗ ভুল! সঠিক উত্তর দেখুন।'; fb.className = 'wm-feedback wrong';
    document.getElementById('wmWrongCount').textContent = wmWrong;
    wmWaiting = true;
    document.getElementById('wmNextBtn').style.display = 'block';
    document.getElementById('wmActions').style.opacity = '0.3';
    document.getElementById('wmActions').style.pointerEvents = 'none';
  }
}

function wmNext() {
  wmIndex = (wmIndex + 1) % wmWords.length;
  wmUpdateUI();
}

function wmSkip() {
  if (!wmWords.length || wmWaiting) return;
  wmIndex = (wmIndex + 1) % wmWords.length;
  wmUpdateUI();
}

function wmShowCompletion() {
  document.getElementById('wmGameArea').style.display = 'none';
  document.getElementById('wmCompletionScreen').style.display = 'block';
  document.getElementById('wmFinalScore').textContent =
    `✓ ${wmCorrect} সঠিক  ✗ ${wmWrong} ভুল — শাবাশ!`;
}

function wmRestartGame() {
  document.getElementById('wmCompletionScreen').style.display = 'none';
  document.getElementById('wmGameArea').style.display = 'block';
  if (wmIsCustomMode) {
    wmStartCustomGame();
  } else {
    wmStartGame();
  }
}

/* ═══════════════════════════════════════════════
   WORD MEANING — CUSTOM LIST
═══════════════════════════════════════════════ */
function wmSwitchSubTab(tab) {
  document.querySelectorAll('.wm-subtab').forEach((btn, i) =>
    btn.classList.toggle('active', ['practice', 'custom'][i] === tab));
  const isPractice = tab === 'practice';
  document.getElementById('wmGameArea').style.display    = isPractice ? 'block' : 'none';
  document.getElementById('wmCompletionScreen').style.display = 'none';
  document.getElementById('wmCustomArea').style.display  = isPractice ? 'none' : 'block';
  // Diff/letter selectors only visible on practice tab in non-custom mode
  if (isPractice) {
    document.getElementById('wmDiffSelector').style.display   = wmIsCustomMode ? 'none' : '';
    document.getElementById('wmLetterSelector').style.display = wmIsCustomMode ? 'none' : '';
  }
}

function wmStartCustomGame() {
  const raw = document.getElementById('wmCustomInput').value;
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) { showToast('Please enter at least one word!'); return; }

  const matched = lines
    .map(line => WM_WORDS.find(w => w.word.toLowerCase() === line.toLowerCase()))
    .filter(Boolean);

  if (!matched.length) { showToast('No words found in the dictionary!'); return; }

  wmWords = matched;
  for (let i = wmWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wmWords[i], wmWords[j]] = [wmWords[j], wmWords[i]];
  }
  wmIndex = 0; wmCorrect = 0; wmWrong = 0;
  wmTotalStarted = wmWords.length; wmWaiting = false;
  wmIsCustomMode = true;

  wmSwitchSubTab('practice');
  document.getElementById('wmCompletionScreen').style.display = 'none';
  document.getElementById('wmGameArea').style.display = 'block';
  wmUpdateUI();
}

function wmSwitchToNormal() {
  wmIsCustomMode = false;
  wmSwitchSubTab('practice');
  wmStartGame();
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
  if (document.getElementById('gameScreen').style.display === 'none') return;
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

// Word Meaning custom list persistence
const wmCustomTextarea = document.getElementById('wmCustomInput');
try {
  const saved = localStorage.getItem(WM_CL_KEY);
  if (saved) wmCustomTextarea.value = saved;
} catch {}

wmCustomTextarea.addEventListener('input', () => {
  try { localStorage.setItem(WM_CL_KEY, wmCustomTextarea.value); } catch {}
});

document.getElementById('wmClearCustomBtn').addEventListener('click', () => {
  wmCustomTextarea.value = '';
  try { localStorage.removeItem(WM_CL_KEY); } catch {}
});

/* ═══════════════════════════════════════════════
   INIT — data loaded via <script> tags (no fetch)
═══════════════════════════════════════════════ */
BATCH1 = SPELL_BATCH1;
BATCH2 = SPELL_BATCH2;
words = buildWordList();
shuffle(words);
totalStarted = words.length;
updateUI();

WM_WORDS = WM_WORDS_DATA;
wmBuildLetterSelector();
wmStartGame();
