const assert = require('node:assert/strict');

async function run() {
  const {
    createLightsBoard,
    toggleLightsCell,
    isSolved,
    scrambleLightsBoard
  } = await import('./js/games/lights-out.js');

  const centerToggle = toggleLightsCell(createLightsBoard(5), 2, 2);
  assert.equal(centerToggle[2][2], true, 'A celula central deve alternar');
  assert.equal(centerToggle[1][2], true, 'A celula acima deve alternar');
  assert.equal(centerToggle[3][2], true, 'A celula abaixo deve alternar');
  assert.equal(centerToggle[2][1], true, 'A celula da esquerda deve alternar');
  assert.equal(centerToggle[2][3], true, 'A celula da direita deve alternar');

  const cornerToggle = toggleLightsCell(createLightsBoard(5), 0, 0);
  assert.equal(cornerToggle[0][0], true, 'O canto deve alternar');
  assert.equal(cornerToggle[1][0], true, 'O vizinho vertical do canto deve alternar');
  assert.equal(cornerToggle[0][1], true, 'O vizinho horizontal do canto deve alternar');
  assert.equal(cornerToggle[1][1], false, 'A diagonal nao deve ser afetada');

  const scrambled = scrambleLightsBoard(5, 6, () => 0.4);
  let replay = createLightsBoard(5);
  scrambled.sequence.forEach(([row, col]) => {
    replay = toggleLightsCell(replay, row, col);
  });

  assert.deepEqual(scrambled.board, replay, 'A sequencia de scramble deve reconstruir o tabuleiro final');
  assert.equal(isSolved(createLightsBoard(5)), true, 'Tabuleiro vazio deve estar resolvido');
  assert.equal(isSolved(scrambled.board), false, 'Scramble nao deve produzir tabuleiro resolvido');

  console.log('Lights Out logic: todos os testes passaram.');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
