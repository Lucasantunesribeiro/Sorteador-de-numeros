const assert = require('node:assert/strict');

async function run() {
  const {
    DIFFICULTY_PRESETS,
    parseBoard,
    createSeededRng,
    getCandidates,
    getConflictingIndexes,
    getBoardConflictSet,
    isBoardValid,
    canPlaceValue,
    solveSudoku,
    countSolutions,
    generateSolvedBoard,
    generatePuzzle,
    isSolved
  } = await import('./js/games/sudoku-engine.js');

  const puzzle = parseBoard('530070000600195000098000060800060003400803001700020006060000280000419005000080079');
  const solution = parseBoard('534678912672195348198342567859761423426853791713924856961537284287419635345286179');

  assert.equal(puzzle.length, 81, 'O parser deve produzir 81 celulas');
  assert.deepEqual(getCandidates(puzzle, 2), [1, 2, 4], 'Os candidatos da casa R1C3 devem respeitar linha, coluna e bloco');
  assert.equal(canPlaceValue(puzzle, 2, 4), true, 'A colocacao valida deve ser aceita');
  assert.equal(canPlaceValue(puzzle, 2, 5), false, 'Nao pode repetir o mesmo numero na linha');

  const locallyValidButDeadEnd = [...puzzle];
  locallyValidButDeadEnd[2] = 1;
  assert.equal(canPlaceValue(puzzle, 2, 1), true, 'A jogada pode ser localmente valida pelas regras imediatas');
  assert.equal(
    solveSudoku(locallyValidButDeadEnd),
    null,
    'Uma jogada localmente valida, mas errada, deve deixar o puzzle sem solucao'
  );

  const rowConflictBoard = [...solution];
  rowConflictBoard[0] = 1;
  assert.deepEqual(getConflictingIndexes(rowConflictBoard, 0, 1).sort((a, b) => a - b), [7, 18], 'Deve detectar conflitos diretos da celula em linha e coluna');
  assert.equal(isBoardValid(rowConflictBoard), false, 'Tabuleiro com duplicata deve ser invalido');
  assert.deepEqual(
    [...getBoardConflictSet(rowConflictBoard)].sort((a, b) => a - b),
    [0, 7, 18],
    'O conflito global deve marcar todas as casas envolvidas'
  );

  const solved = solveSudoku(puzzle);
  assert.deepEqual(solved, solution, 'O solver deve resolver um puzzle conhecido');
  assert.equal(countSolutions(puzzle), 1, 'O puzzle de referencia deve ter solucao unica');
  assert.equal(isSolved(solution, solution), true, 'Uma solucao completa deve ser reconhecida');
  assert.equal(isSolved(puzzle, solution), false, 'Tabuleiro incompleto nao pode ser resolvido');

  const solvedBoard = generateSolvedBoard(createSeededRng(20260309));
  assert.equal(solvedBoard.length, 81, 'A geracao de solucao deve preencher 81 casas');
  assert.equal(isBoardValid(solvedBoard), true, 'A solucao gerada deve ser valida');
  assert.equal(isSolved(solvedBoard), true, 'A grade resolvida gerada deve ser reconhecida como completa');

  const difficulties = ['easy', 'medium', 'hard', 'expert'];
  const generated = difficulties.map((difficulty, index) =>
    generatePuzzle(difficulty, createSeededRng(1000 + index))
  );

  generated.forEach(result => {
    const preset = DIFFICULTY_PRESETS[result.difficulty];
    assert.equal(result.puzzle.length, 81, `Puzzle ${result.difficulty} deve ter 81 casas`);
    assert.equal(result.solution.length, 81, `Solucao ${result.difficulty} deve ter 81 casas`);
    assert.equal(countSolutions(result.puzzle), 1, `Puzzle ${result.difficulty} deve ter solucao unica`);
    assert.equal(isBoardValid(result.solution), true, `Solucao ${result.difficulty} deve ser valida`);
    assert.ok(
      result.clues >= preset.minClues && result.clues <= preset.maxClues,
      `Puzzle ${result.difficulty} deve respeitar o range de clues configurado`
    );
  });

  assert.ok(generated[0].clues > generated[1].clues, 'Easy deve revelar mais numeros do que Medium');
  assert.ok(generated[1].clues > generated[2].clues, 'Medium deve revelar mais numeros do que Hard');
  assert.ok(generated[2].clues > generated[3].clues, 'Hard deve revelar mais numeros do que Expert');

  console.log('Sudoku logic: todos os testes passaram.');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
