const assert = require('node:assert/strict');

async function run() {
  const { evaluateGuess, generateSecretCode, generateAllCombinations } = await import('./js/games/mastermind.js');

  const scenarios = [
    {
      label: 'Mapeia feedback por peca (1-2 / 3-4)',
      secret: ['green', 'yellow', 'orange', 'red'],
      guess: ['red', 'blue', 'green', 'yellow'],
      expected: { blacks: 0, whites: 3, slots: ['white', 'empty', 'white', 'white'] }
    },
    {
      label: 'Acerto exato em posicao correta',
      secret: ['green', 'yellow', 'orange', 'red'],
      guess: ['green', 'purple', 'orange', 'blue'],
      expected: { blacks: 2, whites: 0, slots: ['black', 'empty', 'black', 'empty'] }
    },
    {
      label: 'Cores corretas em posicoes erradas',
      secret: ['green', 'yellow', 'orange', 'red'],
      guess: ['yellow', 'green', 'red', 'orange'],
      expected: { blacks: 0, whites: 4, slots: ['white', 'white', 'white', 'white'] }
    }
  ];

  scenarios.forEach((scenario, idx) => {
    const received = evaluateGuess(scenario.guess, scenario.secret);
    assert.deepEqual(received, scenario.expected, `Falhou no cenario ${idx + 1}: ${scenario.label}`);
  });

  const colors = [
    { id: 'red' },
    { id: 'blue' },
    { id: 'green' },
    { id: 'yellow' },
    { id: 'purple' },
    { id: 'orange' }
  ];
  for (let i = 0; i < 50; i++) {
    const secret = generateSecretCode(4, colors);
    assert.equal(secret.length, 4, 'Senha deve ter 4 pecas');
    assert.equal(new Set(secret).size, 4, 'Senha nao pode repetir cor');
  }

  const combos = generateAllCombinations(4, ['red', 'blue', 'green', 'yellow']);
  assert.equal(combos.length, 24, 'Permutacoes sem repeticao para 4 cores devem ser 24');
  combos.forEach((combo, index) => {
    assert.equal(new Set(combo).size, combo.length, `Combinacao ${index + 1} repetiu cor`);
  });

  console.log('Mastermind logic: todos os testes passaram.');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
