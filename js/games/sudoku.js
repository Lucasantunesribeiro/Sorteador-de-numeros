import { audio } from '../audio.js';
import { showToast } from '../ui.js';
import { addStat, stats, checkAchievements } from '../stats.js';
import {
  DIFFICULTY_PRESETS,
  countClues,
  generatePuzzle,
  getBoardConflictSet,
  getCandidates,
  getRelatedIndexes,
  solveSudoku,
  isSolved
} from './sudoku-engine.js';

const CELL_COUNT = 81;
const BOARD_SIZE = 9;

const state = {
  puzzle: [],
  solution: [],
  board: [],
  notes: [],
  fixedCells: new Set(),
  conflicts: new Set(),
  selectedIndex: null,
  mistakes: 0,
  seconds: 0,
  noteMode: false,
  difficulty: 'medium',
  timerStarted: false,
  complete: false,
  generating: false,
  initialized: false,
  generationToken: 0,
  interval: null,
  flashTimeout: null
};

function createEmptyNotes() {
  return Array.from({ length: CELL_COUNT }, () => new Set());
}

function getRow(index) {
  return Math.floor(index / BOARD_SIZE);
}

function getCol(index) {
  return index % BOARD_SIZE;
}

function countOpenCells(board) {
  return board.reduce((total, value) => total + (value === 0 ? 1 : 0), 0);
}

function countSolvedEditableCells() {
  return state.puzzle.reduce((total, value, index) => total + (value === 0 && state.board[index] !== 0 ? 1 : 0), 0);
}

function getEditableCellCount() {
  return CELL_COUNT - countClues(state.puzzle);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getSelectedLabel() {
  if (state.selectedIndex === null) return 'No cell';
  const row = getRow(state.selectedIndex) + 1;
  const col = getCol(state.selectedIndex) + 1;
  const value = state.board[state.selectedIndex];
  return value === 0 ? `R${row} C${col}` : `R${row} C${col} | ${value}`;
}

function getSelectedCandidatesLabel() {
  if (state.selectedIndex === null) return '-';
  if (state.fixedCells.has(state.selectedIndex)) return 'Locked clue';

  const value = state.board[state.selectedIndex];
  if (value !== 0) return `Placed ${value}`;

  const candidates = getCandidates(state.board, state.selectedIndex);
  return candidates.length === 0 ? 'No valid moves' : candidates.join(' ');
}

function setStatus(message) {
  const status = document.getElementById('sudokuStatus');
  if (status) status.textContent = message;
}

function stopTimer() {
  if (!state.interval) return;
  clearInterval(state.interval);
  state.interval = null;
}

function clearConflictFlash() {
  if (!state.flashTimeout) return;
  clearTimeout(state.flashTimeout);
  state.flashTimeout = null;
}

function startTimer() {
  stopTimer();
  state.interval = setInterval(() => {
    state.seconds++;
    updateHud();
  }, 1000);
}

function ensureTimerStarted() {
  if (state.timerStarted || state.generating || state.complete) return;
  state.timerStarted = true;
  startTimer();
}

function updateLoadingState() {
  const shell = document.getElementById('sudokuBoardShell');
  const loading = document.getElementById('sudokuLoading');

  if (shell) shell.classList.toggle('is-generating', state.generating);
  if (loading) {
    loading.classList.toggle('hidden', !state.generating);
    loading.setAttribute('aria-hidden', state.generating ? 'false' : 'true');
  }
}

function updatePadHighlights() {
  const padButtons = document.querySelectorAll('#sudokuPad [data-value]');
  if (padButtons.length === 0) return;

  const selectedValue = state.selectedIndex === null ? 0 : state.board[state.selectedIndex];
  const candidates = state.selectedIndex === null
    ? []
    : getCandidates(state.board, state.selectedIndex);

  padButtons.forEach(button => {
    const value = Number(button.dataset.value);
    button.classList.toggle('sudoku-pad-selected', selectedValue === value && !state.noteMode);
    button.classList.toggle(
      'sudoku-pad-candidate',
      !state.noteMode
        && selectedValue === 0
        && state.selectedIndex !== null
        && !state.fixedCells.has(state.selectedIndex)
        && candidates.includes(value)
    );
  });
}

function updateHud() {
  const timer = document.getElementById('sudokuTimer');
  if (timer) timer.textContent = formatTime(state.seconds);

  const mistakes = document.getElementById('sudokuMistakes');
  if (mistakes) mistakes.textContent = String(state.mistakes);

  const clues = document.getElementById('sudokuClues');
  if (clues) clues.textContent = `${countClues(state.puzzle)}/81`;

  const remaining = document.getElementById('sudokuRemaining');
  if (remaining) remaining.textContent = String(countOpenCells(state.board));

  const progress = document.getElementById('sudokuProgress');
  if (progress) {
    const editable = getEditableCellCount();
    const percent = editable === 0 ? 100 : Math.round((countSolvedEditableCells() / editable) * 100);
    progress.textContent = `${percent}%`;
  }

  const selected = document.getElementById('sudokuSelectedValue');
  if (selected) selected.textContent = getSelectedLabel();

  const candidates = document.getElementById('sudokuCandidates');
  if (candidates) candidates.textContent = getSelectedCandidatesLabel();

  const mode = document.getElementById('sudokuMode');
  if (mode) mode.textContent = state.noteMode ? 'Notes' : 'Pen';

  const currentDifficulty = document.getElementById('sudokuCurrentDifficulty');
  if (currentDifficulty) currentDifficulty.textContent = DIFFICULTY_PRESETS[state.difficulty].label;

  const unique = document.getElementById('sudokuUniqueStatus');
  if (unique) unique.textContent = state.generating ? 'Checking...' : 'Unique solution';

  const wins = document.getElementById('sudokuWins');
  if (wins) wins.textContent = String(stats.games.sudoku?.won || 0);

  const bestTime = document.getElementById('sudokuBestTime');
  if (bestTime) {
    bestTime.textContent = stats.games.sudoku?.bestTime == null
      ? '-'
      : formatTime(stats.games.sudoku.bestTime);
  }

  const bestMistakes = document.getElementById('sudokuBestMistakes');
  if (bestMistakes) {
    bestMistakes.textContent = stats.games.sudoku?.bestMistakes == null
      ? '-'
      : String(stats.games.sudoku.bestMistakes);
  }

  const notesToggle = document.getElementById('sudokuNotesToggle');
  if (notesToggle) {
    notesToggle.classList.toggle('sudoku-tool-active', state.noteMode);
    notesToggle.textContent = state.noteMode ? 'Notes On' : 'Notes';
  }

  const controls = ['sudokuNotesToggle', 'sudokuAutoNotes', 'sudokuClear', 'sudokuReset', 'sudokuNewGame'];
  controls.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.disabled = state.generating;
  });

  updatePadHighlights();
  updateLoadingState();
}

function renderNotes(notes) {
  const wrapper = document.createElement('div');
  wrapper.className = 'sudoku-notes';

  for (let value = 1; value <= 9; value++) {
    const note = document.createElement('span');
    note.textContent = notes.has(value) ? String(value) : '';
    wrapper.appendChild(note);
  }

  return wrapper;
}

function isRelatedToSelection(index) {
  if (state.selectedIndex === null || state.selectedIndex === index) return false;
  return getRelatedIndexes(state.selectedIndex).includes(index);
}

function buildCellAriaLabel(index, value) {
  const row = getRow(index) + 1;
  const col = getCol(index) + 1;
  const position = `Row ${row} Column ${col}`;

  if (state.fixedCells.has(index)) return `${position}, clue ${value}`;
  if (value !== 0) return `${position}, value ${value}`;

  const candidates = getCandidates(state.board, index);
  return candidates.length === 0
    ? `${position}, empty`
    : `${position}, empty, candidates ${candidates.join(', ')}`;
}

function renderBoard() {
  const boardElement = document.getElementById('sudokuBoard');
  if (!boardElement) return;

  boardElement.innerHTML = '';
  const selectedValue = state.selectedIndex === null ? 0 : state.board[state.selectedIndex];

  state.board.forEach((value, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'sudoku-cell';
    cell.dataset.index = String(index);
    cell.setAttribute('aria-label', buildCellAriaLabel(index, value));
    cell.setAttribute('aria-pressed', index === state.selectedIndex ? 'true' : 'false');

    if (state.fixedCells.has(index)) cell.classList.add('fixed');
    if (index === state.selectedIndex) cell.classList.add('selected');
    if (isRelatedToSelection(index)) cell.classList.add('related');
    if (selectedValue !== 0 && value === selectedValue && index !== state.selectedIndex) {
      cell.classList.add('same-value');
    }
    if (state.conflicts.has(index)) cell.classList.add('conflict');

    if (value === 0 && state.notes[index]?.size > 0) {
      cell.classList.add('has-notes');
      cell.appendChild(renderNotes(state.notes[index]));
    } else {
      cell.textContent = value === 0 ? '' : String(value);
    }

    boardElement.appendChild(cell);
  });
}

function renderPad() {
  const pad = document.getElementById('sudokuPad');
  if (!pad || pad.childElementCount > 0) return;

  for (let value = 1; value <= 9; value++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.value = String(value);
    button.textContent = String(value);
    button.className = 'sudoku-pad-button rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3 text-lg font-black text-slate-800 dark:text-slate-100 transition-all';
    button.addEventListener('click', () => placeValue(value));
    pad.appendChild(button);
  }
}

function findFirstEditableIndex() {
  return state.board.findIndex((value, index) => value === 0 && !state.fixedCells.has(index));
}

function findNextEditableIndex(fromIndex) {
  for (let index = fromIndex + 1; index < CELL_COUNT; index++) {
    if (!state.fixedCells.has(index) && state.board[index] === 0) return index;
  }

  for (let index = 0; index < fromIndex; index++) {
    if (!state.fixedCells.has(index) && state.board[index] === 0) return index;
  }

  return fromIndex;
}

function removePeerNotes(index, value) {
  getRelatedIndexes(index).forEach(relatedIndex => {
    state.notes[relatedIndex].delete(value);
  });
}

function flashConflicts(indexes) {
  clearConflictFlash();
  state.conflicts = new Set(indexes);
  renderBoard();
  updateHud();

  state.flashTimeout = setTimeout(() => {
    state.conflicts.clear();
    renderBoard();
    updateHud();
  }, 560);
}

function completePuzzle() {
  state.complete = true;
  stopTimer();
  clearConflictFlash();
  state.conflicts.clear();

  const payload = {
    time: state.seconds,
    mistakes: state.mistakes,
    difficulty: state.difficulty,
    clues: countClues(state.puzzle)
  };

  addStat('sudoku', true, payload);
  checkAchievements('sudoku', payload);
  updateHud();
  renderBoard();

  setStatus('Solved cleanly. Every row, column, and box is valid.');
  audio.playWin();
  showToast('Sudoku solved.', 'success', 4200);
}

function selectIndex(index) {
  if (index < 0 || index >= CELL_COUNT || state.generating) return;
  state.selectedIndex = index;

  if (state.fixedCells.has(index)) {
    setStatus('Clue selected. Use the arrows to inspect the grid.');
  } else if (state.noteMode) {
    setStatus('Notes mode active. Toggle candidates with 1-9.');
  } else {
    setStatus('Pen mode active. Only legal candidates are allowed.');
  }

  renderBoard();
  updateHud();
}

function applyBoardSnapshot({ puzzle, solution, difficulty, clues }) {
  state.puzzle = [...puzzle];
  state.solution = [...solution];
  state.board = [...puzzle];
  state.notes = createEmptyNotes();
  state.fixedCells = new Set(
    puzzle
      .map((value, index) => (value !== 0 ? index : -1))
      .filter(index => index !== -1)
  );
  state.conflicts = new Set();
  state.selectedIndex = findFirstEditableIndex();
  state.mistakes = 0;
  state.seconds = 0;
  state.noteMode = false;
  state.timerStarted = false;
  state.complete = false;

  renderBoard();
  updateHud();
  setStatus(`${DIFFICULTY_PRESETS[difficulty].label} puzzle ready. ${clues} clues, one unique solution.`);
}

async function startPuzzle() {
  const token = ++state.generationToken;
  state.generating = true;
  state.complete = false;
  state.conflicts.clear();
  stopTimer();
  clearConflictFlash();
  updateHud();
  setStatus(`Generating a ${DIFFICULTY_PRESETS[state.difficulty].label.toLowerCase()} puzzle...`);

  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

  const generated = generatePuzzle(state.difficulty);
  if (token !== state.generationToken) return;

  applyBoardSnapshot(generated);
  state.generating = false;
  renderBoard();
  updateHud();
}

function resetBoard() {
  stopTimer();
  clearConflictFlash();
  state.conflicts.clear();
  state.board = [...state.puzzle];
  state.notes = createEmptyNotes();
  state.selectedIndex = findFirstEditableIndex();
  state.mistakes = 0;
  state.seconds = 0;
  state.noteMode = false;
  state.timerStarted = false;
  state.complete = false;

  renderBoard();
  updateHud();
  setStatus('Board reset to the generated puzzle.');
}

function fillAllNotes() {
  if (state.generating || state.complete) return;
  ensureTimerStarted();

  state.notes = state.board.map((value, index) => {
    if (value !== 0 || state.fixedCells.has(index)) return new Set();
    return new Set(getCandidates(state.board, index));
  });

  renderBoard();
  updateHud();
  setStatus('Auto notes generated from the current board state.');
  audio.play('click');
}

function toggleNotesMode() {
  if (state.generating) return;
  state.noteMode = !state.noteMode;
  updateHud();
  setStatus(state.noteMode
    ? 'Notes mode enabled. Use digits to toggle candidates.'
    : 'Pen mode enabled. Use digits to place final values.');
  audio.play('click');
}

function placeValue(value) {
  if (state.generating || state.complete || state.selectedIndex === null || state.fixedCells.has(state.selectedIndex)) return;

  ensureTimerStarted();
  clearConflictFlash();
  state.conflicts.clear();

  const currentValue = state.board[state.selectedIndex];
  if (currentValue === value && !state.noteMode) return;

  if (state.noteMode && currentValue === 0) {
    if (state.notes[state.selectedIndex].has(value)) {
      state.notes[state.selectedIndex].delete(value);
    } else {
      state.notes[state.selectedIndex].add(value);
    }

    renderBoard();
    updateHud();
    setStatus(`Candidate ${value} toggled.`);
    audio.play('click');
    return;
  }

  const candidateBoard = [...state.board];
  candidateBoard[state.selectedIndex] = value;
  const conflictSet = getBoardConflictSet(candidateBoard);

  if (conflictSet.size > 0) {
    state.mistakes++;
    setStatus('That digit breaks the row, column, or 3x3 box.');
    audio.play('error');
    flashConflicts([...conflictSet]);
    updateHud();
    return;
  }

  const continuation = solveSudoku(candidateBoard);
  if (!continuation) {
    state.mistakes++;
    setStatus('That digit leaves the puzzle with no valid continuation.');
    audio.play('error');
    flashConflicts([state.selectedIndex, ...getRelatedIndexes(state.selectedIndex)]);
    updateHud();
    return;
  }

  state.board = candidateBoard;
  state.notes[state.selectedIndex].clear();
  removePeerNotes(state.selectedIndex, value);
  audio.play('peg');

  if (isSolved(state.board, state.solution)) {
    completePuzzle();
    return;
  }

  const nextIndex = findNextEditableIndex(state.selectedIndex);
  if (nextIndex !== state.selectedIndex) {
    state.selectedIndex = nextIndex;
  }

  renderBoard();
  updateHud();
  setStatus('Valid placement. Keep collapsing the open candidates.');
}

function clearSelectedCell() {
  if (state.generating || state.complete || state.selectedIndex === null || state.fixedCells.has(state.selectedIndex)) return;

  ensureTimerStarted();
  clearConflictFlash();
  state.conflicts.clear();

  if (state.board[state.selectedIndex] !== 0) {
    state.board[state.selectedIndex] = 0;
    setStatus('Value cleared from the selected cell.');
  } else {
    state.notes[state.selectedIndex].clear();
    setStatus('Notes cleared from the selected cell.');
  }

  renderBoard();
  updateHud();
  audio.play('click');
}

function moveSelection(direction) {
  if (state.selectedIndex === null || state.generating) return;

  let row = getRow(state.selectedIndex);
  let col = getCol(state.selectedIndex);

  switch (direction) {
    case 'up':
      row = row === 0 ? BOARD_SIZE - 1 : row - 1;
      break;
    case 'down':
      row = row === BOARD_SIZE - 1 ? 0 : row + 1;
      break;
    case 'left':
      col = col === 0 ? BOARD_SIZE - 1 : col - 1;
      break;
    case 'right':
      col = col === BOARD_SIZE - 1 ? 0 : col + 1;
      break;
  }

  selectIndex(row * BOARD_SIZE + col);
}

function handleBoardClick(event) {
  const cell = event.target.closest('.sudoku-cell');
  if (!cell) return;

  const index = Number(cell.dataset.index);
  if (Number.isNaN(index)) return;
  selectIndex(index);
}

function handleKeydown(event) {
  const section = document.getElementById('sudoku');
  if (!section || section.classList.contains('hidden')) return;

  if (/^[1-9]$/.test(event.key)) {
    event.preventDefault();
    placeValue(Number(event.key));
    return;
  }

  if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
    event.preventDefault();
    clearSelectedCell();
    return;
  }

  if (event.key.toLowerCase() === 'n') {
    event.preventDefault();
    toggleNotesMode();
    return;
  }

  if (event.key.toLowerCase() === 'a') {
    event.preventDefault();
    fillAllNotes();
    return;
  }

  const directionMap = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right'
  };

  const direction = directionMap[event.key];
  if (!direction) return;

  event.preventDefault();
  moveSelection(direction);
}

export function initSudoku() {
  const board = document.getElementById('sudokuBoard');
  if (!board || state.initialized) return;

  state.initialized = true;
  renderPad();
  updateHud();
  renderBoard();
  updateLoadingState();

  board.addEventListener('click', handleBoardClick);
  document.addEventListener('keydown', handleKeydown);

  document.getElementById('sudokuDifficulty')?.addEventListener('change', event => {
    state.difficulty = event.target.value;
    audio.play('click');
    startPuzzle();
  });

  document.getElementById('sudokuNewGame')?.addEventListener('click', () => {
    audio.play('click');
    startPuzzle();
  });

  document.getElementById('sudokuNotesToggle')?.addEventListener('click', toggleNotesMode);
  document.getElementById('sudokuAutoNotes')?.addEventListener('click', fillAllNotes);
  document.getElementById('sudokuClear')?.addEventListener('click', clearSelectedCell);
  document.getElementById('sudokuReset')?.addEventListener('click', () => {
    audio.play('click');
    resetBoard();
  });

  startPuzzle();
}
