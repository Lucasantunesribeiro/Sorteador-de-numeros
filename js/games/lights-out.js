import { audio } from '../audio.js';
import { showToast } from '../ui.js';
import { addStat, stats, checkAchievements } from '../stats.js';

const BOARD_SIZE = 5;
const SCRAMBLE_STEPS = 14;
const DELTAS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];

const state = {
  board: [],
  initialBoard: [],
  moves: 0,
  seconds: 0,
  interval: null,
  timerStarted: false,
  solved: false,
  initialized: false
};

export function createLightsBoard(size = BOARD_SIZE, fill = false) {
  return Array.from({ length: size }, () => Array(size).fill(fill));
}

export function cloneLightsBoard(board) {
  return board.map(row => [...row]);
}

export function toggleLightsCell(board, row, col) {
  const nextBoard = cloneLightsBoard(board);

  DELTAS.forEach(([rowDelta, colDelta]) => {
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;
    if (nextBoard[nextRow]?.[nextCol] !== undefined) {
      nextBoard[nextRow][nextCol] = !nextBoard[nextRow][nextCol];
    }
  });

  return nextBoard;
}

export function isSolved(board) {
  return board.every(row => row.every(value => value === false));
}

export function scrambleLightsBoard(size = BOARD_SIZE, steps = SCRAMBLE_STEPS, rng = Math.random) {
  let board = createLightsBoard(size);
  const sequence = [];

  for (let step = 0; step < steps; step++) {
    const row = Math.floor(rng() * size);
    const col = Math.floor(rng() * size);
    sequence.push([row, col]);
    board = toggleLightsCell(board, row, col);
  }

  if (isSolved(board)) {
    const center = Math.floor(size / 2);
    sequence.push([center, center]);
    board = toggleLightsCell(board, center, center);
  }

  return { board, sequence };
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function stopTimer() {
  if (state.interval) {
    clearInterval(state.interval);
    state.interval = null;
  }
}

function startTimer() {
  stopTimer();
  state.interval = setInterval(() => {
    state.seconds++;
    updateHud();
  }, 1000);
}

function updateHud() {
  const moves = document.getElementById('lightsOutMoves');
  if (moves) moves.textContent = String(state.moves);

  const timer = document.getElementById('lightsOutTime');
  if (timer) timer.textContent = formatTime(state.seconds);

  const bestMoves = document.getElementById('lightsOutBestMoves');
  if (bestMoves) {
    bestMoves.textContent = stats.games.lightsOut?.bestMoves == null
      ? '-'
      : String(stats.games.lightsOut.bestMoves);
  }

  const bestTime = document.getElementById('lightsOutBestTime');
  if (bestTime) {
    bestTime.textContent = stats.games.lightsOut?.bestTime == null
      ? '-'
      : formatTime(stats.games.lightsOut.bestTime);
  }

  const wins = document.getElementById('lightsOutWins');
  if (wins) wins.textContent = String(stats.games.lightsOut?.won || 0);
}

function setStatus(message) {
  const status = document.getElementById('lightsOutStatus');
  if (status) status.textContent = message;
}

function renderBoard() {
  const grid = document.getElementById('lightsOutGrid');
  if (!grid) return;

  grid.innerHTML = '';
  state.board.flat().forEach((value, index) => {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `lights-cell${value ? ' is-on' : ''}`;
    button.setAttribute('aria-label', `Toggle cell ${row + 1}, ${col + 1}`);
    button.addEventListener('click', () => handleMove(row, col));
    grid.appendChild(button);
  });
}

function completePuzzle() {
  state.solved = true;
  stopTimer();

  const payload = { moves: state.moves, time: state.seconds };
  addStat('lightsOut', true, payload);
  checkAchievements('lightsOut', payload);
  updateHud();

  setStatus('Grid cleared. Every light is off.');
  audio.playWin();
  showToast('Lights Out solved.', 'success', 4000);
}

function handleMove(row, col) {
  const section = document.getElementById('lights-out');
  if (!section || section.classList.contains('hidden') || state.solved) return;

  if (!state.timerStarted) {
    state.timerStarted = true;
    startTimer();
  }

  state.board = toggleLightsCell(state.board, row, col);
  state.moves++;
  renderBoard();
  updateHud();
  audio.play('click');

  if (isSolved(state.board)) {
    completePuzzle();
    return;
  }

  setStatus('Keep working from the top row downward.');
}

function startPuzzle() {
  const scrambled = scrambleLightsBoard();
  state.initialBoard = cloneLightsBoard(scrambled.board);
  state.board = cloneLightsBoard(scrambled.board);
  state.moves = 0;
  state.seconds = 0;
  state.timerStarted = false;
  state.solved = false;

  renderBoard();
  updateHud();
  setStatus('Every click changes the cross.');
}

function resetPuzzle() {
  state.board = cloneLightsBoard(state.initialBoard);
  state.moves = 0;
  state.seconds = 0;
  state.timerStarted = false;
  state.solved = false;

  renderBoard();
  updateHud();
  setStatus('Board reset. Try a cleaner route.');
}

export function initLightsOut() {
  const grid = document.getElementById('lightsOutGrid');
  if (!grid || state.initialized) return;

  state.initialized = true;

  document.getElementById('lightsOutNewGame')?.addEventListener('click', () => {
    startPuzzle();
    audio.play('click');
  });

  document.getElementById('lightsOutReset')?.addEventListener('click', () => {
    resetPuzzle();
    audio.play('click');
  });

  updateHud();
  startPuzzle();
}
