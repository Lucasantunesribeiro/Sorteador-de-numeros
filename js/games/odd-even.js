import { audio } from '../audio.js';
import { showToast } from '../ui.js';
import { addStat, stats, checkAchievements } from '../stats.js';

// Timer: starts at 5s, reduces by 0.5s every 3 streak (min 1.5s)
const BASE_TIME = 5000;
const MIN_TIME  = 1500;
const STREAK_STEP = 3;

const state = {
  currentNumber: 0,
  score:         0,
  streak:        0,
  bestStreak:    0,
  active:        false,
  timerInterval: null,
  timeLeft:      BASE_TIME,
  timeLimit:     BASE_TIME
};

function _getAllowedTime() {
  const reductions = Math.floor(state.streak / STREAK_STEP);
  return Math.max(MIN_TIME, BASE_TIME - reductions * 500);
}

function _startTimer() {
  _clearTimer();
  state.timeLimit = _getAllowedTime();
  state.timeLeft  = state.timeLimit;
  _renderTimerBar();

  state.timerInterval = setInterval(() => {
    state.timeLeft -= 50;
    _renderTimerBar();
    if (state.timeLeft <= 0) {
      _clearTimer();
      _onTimeout();
    }
  }, 50);
}

function _clearTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function _renderTimerBar() {
  const pct  = Math.max(0, state.timeLeft / state.timeLimit);
  const fill = document.getElementById('oeTimerFill');
  if (!fill) return;
  fill.style.width = `${pct * 100}%`;

  fill.className = 'oe-timer-fill';
  if (pct < 0.3) fill.classList.add('danger');
  else if (pct < 0.6) fill.classList.add('warning');
}

function _onTimeout() {
  if (!state.active) return;
  const resultEl = document.getElementById('oeResult');
  resultEl.innerHTML = `<div class="result-badge result-wrong">⏱️ Tempo esgotado!</div>`;
  state.active = false;
  audio.play('error');
  addStat('oddEven', false, state.streak);
  checkAchievements('oddEven', state.streak);

  setTimeout(() => {
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    newGame();
  }, 1800);
}

function newGame() {
  state.score  = 0;
  state.streak = 0;
  state.active = true;

  _generateNumber();
  _updateUI();
  document.getElementById('oeResult').innerHTML = '';
  _startTimer();
  audio.play('click');
}

function _generateNumber() {
  state.currentNumber = Math.floor(Math.random() * 100) + 1;
  const el = document.getElementById('oeNumber');
  if (el) {
    el.textContent = state.currentNumber;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }
}

function _makeGuess(guess) {
  if (!state.active) return;
  _clearTimer();

  const isOdd   = state.currentNumber % 2 === 1;
  const correct = (guess === 'odd' && isOdd) || (guess === 'even' && !isOdd);
  const resultEl = document.getElementById('oeResult');

  if (correct) {
    state.score  += 10 + state.streak * 2;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);

    resultEl.innerHTML = `<div class="result-badge result-correct">Correto! +${10 + (state.streak - 1) * 2} pts</div>`;
    audio.play('success');

    _updateUI();
    setTimeout(() => {
      if (!state.active) return;
      _generateNumber();
      resultEl.innerHTML = '';
      _startTimer();
    }, 900);
  } else {
    resultEl.innerHTML = `<div class="result-badge result-wrong">Errado! ${state.currentNumber} e ${isOdd ? 'impar' : 'par'}</div>`;
    state.active = false;
    audio.play('error');
    addStat('oddEven', false, state.streak);
    checkAchievements('oddEven', state.streak);

    setTimeout(() => newGame(), 2000);
  }

  _updateUI();
}

function _updateUI() {
  document.getElementById('oeScore').textContent  = state.score;
  document.getElementById('oeStreak').textContent = state.streak;
  document.getElementById('oeBest').textContent   = Math.max(state.bestStreak, stats.games.oddEven?.bestStreak || 0);
}

export function initOddEven() {
  document.getElementById('guessOdd').addEventListener('click', () => _makeGuess('odd'));
  document.getElementById('guessEven').addEventListener('click', () => _makeGuess('even'));
  document.getElementById('oeNewGame').addEventListener('click', newGame);

  state.bestStreak = stats.games.oddEven?.bestStreak || 0;
  newGame();
}
