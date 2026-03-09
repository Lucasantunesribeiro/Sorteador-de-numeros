import { audio } from '../audio.js';
import { showToast } from '../ui.js';
import { addStat, stats, checkAchievements } from '../stats.js';

const BOARD_SIZE = 4;
const SWIPE_THRESHOLD = 24;
const CELL_ANIMATION_CLASSES = ['spawn', 'merge', 'pending'];
const TILE_STYLES = {
  0: { background: 'rgba(255,255,255,0.7)', color: 'transparent', shadow: 'none' },
  2: { background: '#f8fafc', color: '#334155', shadow: '0 16px 24px -20px rgba(15,23,42,0.35)' },
  4: { background: '#ffedd5', color: '#9a3412', shadow: '0 16px 24px -20px rgba(249,115,22,0.35)' },
  8: { background: '#fdba74', color: '#7c2d12', shadow: '0 18px 28px -20px rgba(249,115,22,0.45)' },
  16: { background: '#fb923c', color: '#ffffff', shadow: '0 18px 28px -18px rgba(234,88,12,0.5)' },
  32: { background: '#f97316', color: '#ffffff', shadow: '0 18px 28px -18px rgba(194,65,12,0.55)' },
  64: { background: '#ea580c', color: '#ffffff', shadow: '0 18px 28px -18px rgba(154,52,18,0.58)' },
  128: { background: '#0f172a', color: '#fde68a', shadow: '0 20px 34px -20px rgba(15,23,42,0.9)' },
  256: { background: '#1d4ed8', color: '#dbeafe', shadow: '0 20px 34px -20px rgba(29,78,216,0.8)' },
  512: { background: '#7c3aed', color: '#ede9fe', shadow: '0 20px 34px -20px rgba(124,58,237,0.8)' },
  1024: { background: '#be123c', color: '#ffe4e6', shadow: '0 20px 34px -20px rgba(190,24,93,0.82)' },
  2048: { background: '#111827', color: '#fef3c7', shadow: '0 24px 40px -24px rgba(17,24,39,0.95)' }
};

const state = {
  board: [],
  score: 0,
  bestScore: 0,
  highestTile: 0,
  hasWon: false,
  finished: false,
  moved: false,
  touchStart: null,
  cells: [],
  overlay: null,
  animating: false,
  initialized: false
};

export function createEmptyBoard(size = BOARD_SIZE) {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

export function cloneBoard(board) {
  return board.map(row => [...row]);
}

function getEmptyCells(board) {
  const cells = [];
  board.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value === 0) cells.push([rowIndex, colIndex]);
    });
  });
  return cells;
}

export function spawnTile(board, rng = Math.random) {
  const emptyCells = getEmptyCells(board);
  const nextBoard = cloneBoard(board);
  if (emptyCells.length === 0) {
    return { board: nextBoard, spawned: false, row: -1, col: -1, value: 0 };
  }

  const [row, col] = emptyCells[Math.floor(rng() * emptyCells.length)];
  const value = rng() < 0.9 ? 2 : 4;
  nextBoard[row][col] = value;
  return { board: nextBoard, spawned: true, row, col, value };
}

export function slideLine(line) {
  const result = collapseLine(line);
  return {
    line: result.line,
    scoreGained: result.scoreGained,
    moved: result.moved
  };
}

function collapseLine(line) {
  const compact = line.filter(value => value !== 0);
  const merged = [];
  let scoreGained = 0;
  const steps = [];

  const indexedItems = line
    .map((value, index) => ({ value, index }))
    .filter(item => item.value !== 0);

  for (let index = 0; index < indexedItems.length; index++) {
    const current = indexedItems[index];
    const next = indexedItems[index + 1];

    if (next && current.value === next.value) {
      const targetIndex = merged.length;
      const value = current.value * 2;
      merged.push(value);
      scoreGained += value;
      steps.push(
        {
          from: current.index,
          to: targetIndex,
          value: current.value,
          merged: true,
          mergeTargetValue: value
        },
        {
          from: next.index,
          to: targetIndex,
          value: next.value,
          merged: true,
          mergeTargetValue: value
        }
      );
      index++;
      continue;
    }

    const targetIndex = merged.length;
    merged.push(current.value);
    steps.push({
      from: current.index,
      to: targetIndex,
      value: current.value,
      merged: false,
      mergeTargetValue: current.value
    });
  }

  while (merged.length < line.length) {
    merged.push(0);
  }

  return {
    line: merged,
    scoreGained,
    moved: merged.some((value, index) => value !== line[index]),
    steps
  };
}

function transposeBoard(board) {
  return board[0].map((_, colIndex) => board.map(row => row[colIndex]));
}

function reverseRows(board) {
  return board.map(row => [...row].reverse());
}

function mapOrientedToActual(rowIndex, colIndex, direction) {
  switch (direction) {
    case 'right':
      return { row: rowIndex, col: BOARD_SIZE - 1 - colIndex };
    case 'up':
      return { row: colIndex, col: rowIndex };
    case 'down':
      return { row: BOARD_SIZE - 1 - colIndex, col: rowIndex };
    case 'left':
    default:
      return { row: rowIndex, col: colIndex };
  }
}

export function shiftBoard(board, direction) {
  let workingBoard = cloneBoard(board);
  let reverse = false;
  let transpose = false;

  if (direction === 'right') {
    reverse = true;
  } else if (direction === 'up') {
    transpose = true;
  } else if (direction === 'down') {
    transpose = true;
    reverse = true;
  }

  if (transpose) workingBoard = transposeBoard(workingBoard);
  if (reverse) workingBoard = reverseRows(workingBoard);

  let moved = false;
  let scoreGained = 0;
  const movements = [];
  const mergedTargets = [];
  const mergedTargetKeys = new Set();

  const nextBoard = workingBoard.map((row, rowIndex) => {
    const result = collapseLine(row);
    moved = moved || result.moved;
    scoreGained += result.scoreGained;

    result.steps.forEach(step => {
      const from = mapOrientedToActual(rowIndex, step.from, direction);
      const to = mapOrientedToActual(rowIndex, step.to, direction);
      movements.push({
        fromRow: from.row,
        fromCol: from.col,
        toRow: to.row,
        toCol: to.col,
        value: step.value,
        merged: step.merged,
        mergeTargetValue: step.mergeTargetValue
      });

      if (step.merged) {
        const key = `${to.row}-${to.col}`;
        if (!mergedTargetKeys.has(key)) {
          mergedTargetKeys.add(key);
          mergedTargets.push({
            row: to.row,
            col: to.col,
            value: step.mergeTargetValue
          });
        }
      }
    });

    return result.line;
  });

  let normalizedBoard = nextBoard;
  if (reverse) normalizedBoard = reverseRows(normalizedBoard);
  if (transpose) normalizedBoard = transposeBoard(normalizedBoard);

  return { board: normalizedBoard, moved, scoreGained, movements, mergedTargets };
}

export function moveBoard(board, direction, rng = Math.random) {
  const shifted = shiftBoard(board, direction);
  if (!shifted.moved) {
    return {
      board: cloneBoard(board),
      moved: false,
      scoreGained: 0,
      spawned: false
    };
  }

  const spawned = spawnTile(shifted.board, rng);
  return {
    board: spawned.board,
    moved: true,
    scoreGained: shifted.scoreGained,
    spawned: spawned.spawned,
    spawn: { row: spawned.row, col: spawned.col, value: spawned.value },
    movements: shifted.movements,
    mergedTargets: shifted.mergedTargets
  };
}

export function hasAvailableMoves(board) {
  if (getEmptyCells(board).length > 0) return true;

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const value = board[row][col];
      if (board[row]?.[col + 1] === value || board[row + 1]?.[col] === value) {
        return true;
      }
    }
  }

  return false;
}

export function getHighestTile(board) {
  return Math.max(...board.flat());
}

function formatStatus(message) {
  const status = document.getElementById('g2048Status');
  if (status) status.textContent = message;
}

function getTileStyle(value) {
  return TILE_STYLES[value] || {
    background: '#0f172a',
    color: '#fef3c7',
    shadow: '0 24px 38px -24px rgba(15,23,42,0.95)'
  };
}

function getCellIndex(row, col) {
  return row * BOARD_SIZE + col;
}

function getCellKey(row, col) {
  return `${row}-${col}`;
}

function clearCellAnimationClasses(cell) {
  cell.classList.remove(...CELL_ANIMATION_CLASSES);
}

function ensureGridCells() {
  const grid = document.getElementById('g2048Grid');
  if (!grid) return;

  if (state.cells.length === BOARD_SIZE * BOARD_SIZE) return;

  grid.innerHTML = '';
  state.cells = [];
  for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index++) {
    const cell = document.createElement('div');
    cell.className = 'g2048-cell';
    const label = document.createElement('span');
    label.className = 'g2048-cell-value';
    cell.appendChild(label);
    grid.appendChild(cell);
    state.cells.push(cell);
  }

  const overlay = document.createElement('div');
  overlay.className = 'g2048-motion-layer';
  grid.appendChild(overlay);
  state.overlay = overlay;
}

function paintBoard(pendingTargets = new Set()) {
  ensureGridCells();
  if (state.cells.length === 0) return;

  state.cells.forEach((cell, index) => {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const value = state.board[row][col];
    const style = getTileStyle(value);
    const label = cell.firstElementChild || cell;

    clearCellAnimationClasses(cell);
    cell.style.background = style.background;
    cell.style.color = style.color;
    cell.style.boxShadow = style.shadow;
    cell.dataset.value = String(value);
    cell.classList.toggle('is-empty', value === 0);
    cell.classList.toggle('pending', pendingTargets.has(getCellKey(row, col)));
    label.textContent = value === 0 ? '' : String(value);
  });
}

function clearOverlay() {
  if (state.overlay) state.overlay.innerHTML = '';
}

function buildPendingTargets(movements, spawn) {
  const targets = new Set();
  movements.forEach(movement => {
    if (movement.fromRow !== movement.toRow || movement.fromCol !== movement.toCol || movement.merged) {
      targets.add(getCellKey(movement.toRow, movement.toCol));
    }
  });

  if (spawn && spawn.row >= 0 && spawn.col >= 0) {
    targets.add(getCellKey(spawn.row, spawn.col));
  }

  return targets;
}

function addPulseToTargets(mergedTargets, spawn) {
  mergedTargets.forEach(target => {
    const cell = state.cells[getCellIndex(target.row, target.col)];
    if (cell) cell.classList.add('merge');
  });

  if (spawn && spawn.row >= 0 && spawn.col >= 0) {
    const spawnCell = state.cells[getCellIndex(spawn.row, spawn.col)];
    if (spawnCell) spawnCell.classList.add('spawn');
  }
}

function createFloatingTile(movement, gridRect) {
  const fromCell = state.cells[getCellIndex(movement.fromRow, movement.fromCol)];
  const toCell = state.cells[getCellIndex(movement.toRow, movement.toCol)];
  if (!fromCell || !toCell || !state.overlay) return null;

  const fromRect = fromCell.getBoundingClientRect();
  const toRect = toCell.getBoundingClientRect();
  const style = getTileStyle(movement.value);
  const tile = document.createElement('div');
  tile.className = 'g2048-floating-tile';
  tile.textContent = String(movement.value);
  tile.style.left = `${fromRect.left - gridRect.left}px`;
  tile.style.top = `${fromRect.top - gridRect.top}px`;
  tile.style.width = `${fromRect.width}px`;
  tile.style.height = `${fromRect.height}px`;
  tile.style.background = style.background;
  tile.style.color = style.color;
  tile.style.boxShadow = style.shadow;

  return {
    tile,
    deltaX: toRect.left - fromRect.left,
    deltaY: toRect.top - fromRect.top
  };
}

function playMoveAnimations(movements) {
  if (!state.overlay) return Promise.resolve();

  const animatedMoves = movements.filter(movement => (
    movement.fromRow !== movement.toRow
    || movement.fromCol !== movement.toCol
    || movement.merged
  ));

  clearOverlay();
  if (animatedMoves.length === 0) return Promise.resolve();

  const grid = document.getElementById('g2048Grid');
  const gridRect = grid?.getBoundingClientRect();
  if (!gridRect) return Promise.resolve();

  const animationPromises = animatedMoves
    .map(movement => createFloatingTile(movement, gridRect))
    .filter(Boolean)
    .map(({ tile, deltaX, deltaY }) => {
      state.overlay.appendChild(tile);

      return new Promise(resolve => {
        let settled = false;
        const settle = () => {
          if (settled) return;
          settled = true;
          tile.remove();
          resolve();
        };

        tile.addEventListener('transitionend', settle, { once: true });
        setTimeout(settle, 260);

        requestAnimationFrame(() => {
          tile.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        });
      });
    });

  return Promise.all(animationPromises).then(() => {
    clearOverlay();
  });
}

async function renderBoard({ movements = [], mergedTargets = [], spawn = null, animate = false } = {}) {
  ensureGridCells();
  if (state.cells.length === 0) return;

  if (!animate) {
    paintBoard();
    clearOverlay();
    return;
  }

  const pendingTargets = buildPendingTargets(movements, spawn);
  paintBoard(pendingTargets);
  await playMoveAnimations(movements);
  paintBoard();
  requestAnimationFrame(() => addPulseToTargets(mergedTargets, spawn));
}

function updateHud() {
  const highestTile = getHighestTile(state.board);
  state.highestTile = highestTile;
  state.bestScore = Math.max(state.bestScore, state.score, stats.games.game2048?.bestScore || 0);

  const score = document.getElementById('g2048Score');
  if (score) score.textContent = String(state.score);

  const bestScore = document.getElementById('g2048BestScore');
  if (bestScore) bestScore.textContent = String(state.bestScore);

  const tile = document.getElementById('g2048BestTile');
  if (tile) tile.textContent = String(highestTile);

  const wins = document.getElementById('g2048Wins');
  if (wins) wins.textContent = String(stats.games.game2048?.won || 0);

  const highestOverall = document.getElementById('g2048HighestOverall');
  if (highestOverall) {
    highestOverall.textContent = String(Math.max(stats.games.game2048?.bestTile || 0, highestTile));
  }
}

function recordRun() {
  if (state.finished || (!state.moved && !state.hasWon)) return;

  state.finished = true;
  const payload = { score: state.score, tile: getHighestTile(state.board) };
  addStat('game2048', state.hasWon, payload);
  checkAchievements('game2048', payload);
  updateHud();
}

function evaluateBoardState() {
  const highestTile = getHighestTile(state.board);

  if (!state.hasWon && highestTile >= 2048) {
    state.hasWon = true;
    audio.playWin();
    formatStatus('2048 reached. Keep pushing for a cleaner board.');
    showToast('2048 unlocked. You can keep playing until the board locks.', 'success', 4200);
  } else if (!state.finished) {
    formatStatus(highestTile >= 512 ? 'Keep the corner stable and hunt the next merge.' : 'Build your lane.');
  }

  if (!hasAvailableMoves(state.board)) {
    recordRun();
    if (state.hasWon) {
      formatStatus('Board locked, but the 2048 run counts as a win.');
      showToast('Run complete. The board is locked.', 'info', 3200);
    } else {
      formatStatus('No moves left. Reset and try a cleaner opening.');
      audio.play('error');
      showToast('No moves left. Start a new run.', 'error', 3200);
    }
  }
}

function resetGame() {
  let board = createEmptyBoard();
  board = spawnTile(board).board;
  board = spawnTile(board).board;

  state.board = board;
  state.score = 0;
  state.highestTile = getHighestTile(board);
  state.hasWon = false;
  state.finished = false;
  state.moved = false;
  state.touchStart = null;
  state.animating = false;
  state.bestScore = Math.max(stats.games.game2048?.bestScore || 0, state.bestScore || 0);

  renderBoard({ animate: false });
  updateHud();
  formatStatus('Build your lane.');
}

async function handleMove(direction) {
  const section = document.getElementById('game-2048');
  if (!section || section.classList.contains('hidden') || state.finished || state.animating) return;

  const result = moveBoard(state.board, direction);
  if (!result.moved) return;

  state.animating = true;
  state.board = result.board;
  state.score += result.scoreGained;
  state.moved = true;

  audio.play(result.scoreGained > 0 ? 'match' : 'click');
  await renderBoard({
    movements: result.movements,
    mergedTargets: result.mergedTargets,
    spawn: result.spawn,
    animate: true
  });
  state.animating = false;
  updateHud();
  evaluateBoardState();
}

function attachTouchControls(grid) {
  grid.addEventListener('touchstart', event => {
    const touch = event.changedTouches[0];
    state.touchStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });

  grid.addEventListener('touchend', event => {
    if (!state.touchStart) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - state.touchStart.x;
    const deltaY = touch.clientY - state.touchStart.y;
    state.touchStart = null;

    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < SWIPE_THRESHOLD) return;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      handleMove(deltaX > 0 ? 'right' : 'left');
    } else {
      handleMove(deltaY > 0 ? 'down' : 'up');
    }
  }, { passive: true });
}

function handleKeydown(event) {
  const directionMap = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right'
  };

  const direction = directionMap[event.key];
  if (!direction) return;
  const section = document.getElementById('game-2048');
  if (!section || section.classList.contains('hidden')) return;

  event.preventDefault();
  handleMove(direction);
}

export function init2048() {
  const grid = document.getElementById('g2048Grid');
  if (!grid || state.initialized) return;

  state.initialized = true;
  state.bestScore = stats.games.game2048?.bestScore || 0;

  document.getElementById('g2048NewGame')?.addEventListener('click', () => {
    recordRun();
    resetGame();
    audio.play('click');
  });

  document.getElementById('g2048Up')?.addEventListener('click', () => handleMove('up'));
  document.getElementById('g2048Down')?.addEventListener('click', () => handleMove('down'));
  document.getElementById('g2048Left')?.addEventListener('click', () => handleMove('left'));
  document.getElementById('g2048Right')?.addEventListener('click', () => handleMove('right'));

  attachTouchControls(grid);
  document.addEventListener('keydown', handleKeydown);

  resetGame();
}
