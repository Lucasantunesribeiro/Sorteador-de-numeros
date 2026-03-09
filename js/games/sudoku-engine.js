const BOARD_SIZE = 9;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const BOX_SIZE = 3;
const ALL_DIGITS_MASK = 0b1111111110;
const EMPTY_BOARD = Array(CELL_COUNT).fill(0);

export const DIFFICULTY_PRESETS = {
  easy: { label: 'Easy', targetClues: 40, minClues: 38, maxClues: 43 },
  medium: { label: 'Medium', targetClues: 34, minClues: 32, maxClues: 36 },
  hard: { label: 'Hard', targetClues: 29, minClues: 27, maxClues: 31 },
  expert: { label: 'Expert', targetClues: 25, minClues: 23, maxClues: 27 }
};

const CELL_META = Array.from({ length: CELL_COUNT }, (_, index) => {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  const box = Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(col / BOX_SIZE);
  return { row, col, box };
});

const RELATED_INDEXES = Array.from({ length: CELL_COUNT }, (_, index) => {
  const { row, col } = CELL_META[index];
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  const related = new Set();

  for (let cursor = 0; cursor < BOARD_SIZE; cursor++) {
    related.add(row * BOARD_SIZE + cursor);
    related.add(cursor * BOARD_SIZE + col);
  }

  for (let rowOffset = 0; rowOffset < BOX_SIZE; rowOffset++) {
    for (let colOffset = 0; colOffset < BOX_SIZE; colOffset++) {
      related.add((boxRow + rowOffset) * BOARD_SIZE + boxCol + colOffset);
    }
  }

  related.delete(index);
  return [...related].sort((a, b) => a - b);
});

export function createSeededRng(seed = Date.now()) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function parseBoard(serialized) {
  if (Array.isArray(serialized)) return serialized.map(Number);
  return serialized
    .trim()
    .split('')
    .map(value => (value === '.' ? 0 : Number(value)));
}

export function serializeBoard(board) {
  return board.join('');
}

export function countClues(board) {
  return board.reduce((total, value) => total + (value !== 0 ? 1 : 0), 0);
}

export function getRelatedIndexes(index) {
  return RELATED_INDEXES[index] ? [...RELATED_INDEXES[index]] : [];
}

function isDigit(value) {
  return Number.isInteger(value) && value >= 1 && value <= 9;
}

function bitCount(mask) {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1;
    count++;
  }
  return count;
}

function bitToDigit(bit) {
  return Math.log2(bit);
}

function maskToDigits(mask) {
  const digits = [];
  for (let digit = 1; digit <= 9; digit++) {
    if (mask & (1 << digit)) digits.push(digit);
  }
  return digits;
}

function shuffle(values, rng = Math.random) {
  const clone = [...values];
  for (let index = clone.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

function buildConstraintState(board) {
  if (!Array.isArray(board) || board.length !== CELL_COUNT) return null;

  const rows = Array(BOARD_SIZE).fill(0);
  const cols = Array(BOARD_SIZE).fill(0);
  const boxes = Array(BOARD_SIZE).fill(0);

  for (let index = 0; index < CELL_COUNT; index++) {
    const value = board[index];
    if (value === 0) continue;
    if (!isDigit(value)) return null;

    const { row, col, box } = CELL_META[index];
    const bit = 1 << value;

    if ((rows[row] & bit) || (cols[col] & bit) || (boxes[box] & bit)) {
      return null;
    }

    rows[row] |= bit;
    cols[col] |= bit;
    boxes[box] |= bit;
  }

  return { rows, cols, boxes };
}

function getCandidateMaskFromState(rows, cols, boxes, index) {
  const { row, col, box } = CELL_META[index];
  return ALL_DIGITS_MASK & ~(rows[row] | cols[col] | boxes[box]);
}

function findBestEmptyCell(board, rows, cols, boxes) {
  let bestIndex = -1;
  let bestMask = 0;
  let bestCount = 10;

  for (let index = 0; index < CELL_COUNT; index++) {
    if (board[index] !== 0) continue;

    const mask = getCandidateMaskFromState(rows, cols, boxes, index);
    const candidateCount = bitCount(mask);

    if (candidateCount === 0) return { index: -2, mask: 0 };
    if (candidateCount < bestCount) {
      bestIndex = index;
      bestMask = mask;
      bestCount = candidateCount;
      if (candidateCount === 1) break;
    }
  }

  return { index: bestIndex, mask: bestMask };
}

function solveInternal(initialBoard, options = {}) {
  const {
    limit = 1,
    randomize = false,
    rng = Math.random
  } = options;

  const board = [...initialBoard];
  const constraints = buildConstraintState(board);
  if (!constraints) {
    return { solution: null, count: 0 };
  }

  const { rows, cols, boxes } = constraints;
  let solution = null;
  let count = 0;

  function search() {
    if (count >= limit) return;

    const next = findBestEmptyCell(board, rows, cols, boxes);
    if (next.index === -2) return;

    if (next.index === -1) {
      count++;
      if (!solution) solution = [...board];
      return;
    }

    const digits = randomize
      ? shuffle(maskToDigits(next.mask), rng)
      : maskToDigits(next.mask);

    const { row, col, box } = CELL_META[next.index];

    for (const digit of digits) {
      const bit = 1 << digit;

      board[next.index] = digit;
      rows[row] |= bit;
      cols[col] |= bit;
      boxes[box] |= bit;

      search();

      board[next.index] = 0;
      rows[row] &= ~bit;
      cols[col] &= ~bit;
      boxes[box] &= ~bit;

      if (count >= limit) return;
    }
  }

  search();
  return { solution, count };
}

export function getCandidates(board, index) {
  if (index < 0 || index >= CELL_COUNT || board[index] !== 0) return [];
  const constraints = buildConstraintState(board);
  if (!constraints) return [];
  return maskToDigits(
    getCandidateMaskFromState(constraints.rows, constraints.cols, constraints.boxes, index)
  );
}

export function getConflictingIndexes(board, index, candidate = board[index]) {
  if (!isDigit(candidate)) return [];
  return getRelatedIndexes(index).filter(relatedIndex => board[relatedIndex] === candidate);
}

export function getBoardConflictSet(board) {
  const conflicts = new Set();

  for (let index = 0; index < CELL_COUNT; index++) {
    const value = board[index];
    if (!isDigit(value)) continue;
    const related = getConflictingIndexes(board, index, value);
    if (related.length === 0) continue;

    conflicts.add(index);
    related.forEach(relatedIndex => conflicts.add(relatedIndex));
  }

  return conflicts;
}

export function isBoardValid(board) {
  return buildConstraintState(board) !== null;
}

export function canPlaceValue(board, index, value) {
  if (value === 0) return true;
  if (!isDigit(value)) return false;

  const candidateBoard = [...board];
  candidateBoard[index] = value;
  return isBoardValid(candidateBoard);
}

export function solveSudoku(board, options = {}) {
  return solveInternal(board, { ...options, limit: 1 }).solution;
}

export function countSolutions(board, limit = 2) {
  return solveInternal(board, { limit }).count;
}

export function isSolved(board, solution = null) {
  if (board.length !== CELL_COUNT || board.some(value => value === 0)) return false;
  if (!isBoardValid(board)) return false;
  return solution ? board.every((value, index) => value === solution[index]) : true;
}

export function generateSolvedBoard(rng = Math.random) {
  return solveSudoku(EMPTY_BOARD, { randomize: true, rng });
}

function buildSymmetricGroups(rng) {
  const groups = [];
  const seen = new Set();

  for (let index = 0; index < CELL_COUNT; index++) {
    if (seen.has(index)) continue;
    const mirror = CELL_COUNT - 1 - index;
    if (mirror === index) {
      groups.push([index]);
      seen.add(index);
      continue;
    }

    groups.push([index, mirror]);
    seen.add(index);
    seen.add(mirror);
  }

  return shuffle(groups, rng);
}

function tryCarveWithSymmetry(solution, preset, rng) {
  const puzzle = [...solution];
  let clues = CELL_COUNT;

  for (const group of buildSymmetricGroups(rng)) {
    if (clues <= preset.targetClues) break;
    if (clues - group.length < preset.targetClues) continue;

    const backup = group.map(index => puzzle[index]);
    group.forEach(index => {
      puzzle[index] = 0;
    });

    if (countSolutions(puzzle, 2) !== 1) {
      group.forEach((index, valueIndex) => {
        puzzle[index] = backup[valueIndex];
      });
      continue;
    }

    clues -= group.length;
  }

  if (clues > preset.targetClues) {
    const singles = shuffle(
      Array.from({ length: CELL_COUNT }, (_, index) => index).filter(index => puzzle[index] !== 0),
      rng
    );

    for (const index of singles) {
      if (clues <= preset.targetClues) break;

      const backup = puzzle[index];
      puzzle[index] = 0;

      if (countSolutions(puzzle, 2) !== 1) {
        puzzle[index] = backup;
        continue;
      }

      clues--;
    }
  }

  return { puzzle, clues: countClues(puzzle) };
}

export function generatePuzzle(difficulty = 'medium', rng = Math.random) {
  const preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.medium;
  let bestResult = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const solution = generateSolvedBoard(rng);
    const carved = tryCarveWithSymmetry(solution, preset, rng);
    const result = {
      difficulty,
      puzzle: carved.puzzle,
      solution,
      clues: carved.clues
    };

    const withinRange = result.clues >= preset.minClues && result.clues <= preset.maxClues;
    if (!bestResult || Math.abs(result.clues - preset.targetClues) < Math.abs(bestResult.clues - preset.targetClues)) {
      bestResult = result;
    }

    if (withinRange) {
      return result;
    }
  }

  return bestResult;
}
