
// Mock do estado e objetos necessários se houver dependência
// Aqui testamos a função pura evaluateGuess

function evaluateGuess(guess, secret) {
  let blacks = 0;
  let whites = 0;
  const secretCopy = [...secret];
  const guessCopy = [...guess];

  for (let i = 0; i < guessCopy.length; i++) {
    if (guessCopy[i] !== null && guessCopy[i] === secretCopy[i]) {
      blacks++;
      secretCopy[i] = "MATCHED";
      guessCopy[i] = "MATCHED";
    }
  }

  for (let i = 0; i < guessCopy.length; i++) {
    if (guessCopy[i] === "MATCHED" || guessCopy[i] === null) continue;
    const idx = secretCopy.indexOf(guessCopy[i]);
    if (idx !== -1) {
      whites++;
      secretCopy[idx] = "MATCHED";
    }
  }
  return { blacks, whites };
}

const tests = [
  { secret: [1, 2, 3, 4], guess: [1, 2, 3, 4], expected: { blacks: 4, whites: 0 } },
  { secret: [1, 2, 3, 4], guess: [4, 3, 2, 1], expected: { blacks: 0, whites: 4 } },
  { secret: [1, 1, 2, 2], guess: [1, 2, 1, 1], expected: { blacks: 1, whites: 2 } },
  { secret: [1, 2, 3, 4], guess: [1, 1, 1, 1], expected: { blacks: 1, whites: 0 } }, // Caso do usuário se a cor 1 tiver na senha
  { secret: [2, 3, 4, 5], guess: [1, 1, 1, 1], expected: { blacks: 0, whites: 0 } }
];

tests.forEach((t, i) => {
  const res = evaluateGuess(t.guess, t.secret);
  const passed = res.blacks === t.expected.blacks && res.whites === t.expected.whites;
  console.log(`Test ${i + 1}: ${passed ? 'PASSED' : 'FAILED'} | Secret: [${t.secret}] Guess: [${t.guess}] | Expected: B${t.expected.blacks} W${t.expected.whites} Got: B${res.blacks} W${res.whites}`);
});
