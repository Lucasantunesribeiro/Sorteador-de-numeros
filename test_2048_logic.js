const assert = require('node:assert/strict');

async function run() {
  const {
    slideLine,
    shiftBoard,
    moveBoard,
    hasAvailableMoves,
    getHighestTile
  } = await import('./js/games/game-2048.js');

  const merged = slideLine([2, 2, 2, 0]);
  assert.deepEqual(merged.line, [4, 2, 0, 0], 'A linha deve mesclar apenas uma vez por movimento');
  assert.equal(merged.scoreGained, 4, 'A pontuacao do merge 2+2 deve ser 4');

  const shifted = shiftBoard([
    [2, 0, 2, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ], 'left');
  assert.deepEqual(shifted.board[0], [4, 2, 0, 0], 'O shift para a esquerda deve consolidar a linha corretamente');
  assert.equal(shifted.scoreGained, 4, 'O shift deve acumular a pontuacao do merge');

  const noMove = moveBoard([
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [512, 1024, 2, 4],
    [8, 16, 32, 64]
  ], 'left', () => 0);
  assert.equal(noMove.moved, false, 'Nao deve haver movimento quando a direcao nao altera o tabuleiro');
  assert.equal(noMove.spawned, false, 'Nao deve nascer nova peca sem movimento valido');

  const withSpawn = moveBoard([
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ], 'right', () => 0);
  assert.equal(withSpawn.moved, true, 'O tabuleiro deve mover para a direita');
  assert.equal(withSpawn.spawned, true, 'Uma nova peca deve aparecer apos movimento valido');
  assert.equal(withSpawn.board.flat().filter(value => value !== 0).length, 2, 'O tabuleiro deve ter duas pecas apos o movimento inicial');

  const lockedBoard = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 8]
  ];
  assert.equal(hasAvailableMoves(lockedBoard), false, 'Um tabuleiro cheio sem adjacencias iguais deve encerrar o jogo');
  assert.equal(getHighestTile(lockedBoard), 8, 'A maior peca deve ser detectada corretamente');

  console.log('2048 logic: todos os testes passaram.');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
