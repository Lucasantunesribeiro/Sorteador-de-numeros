
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
  // Senha Hipotética: Green, Yellow, Orange, Red (142, 48, 24, 0)
  {
    secret: ['green', 'yellow', 'orange', 'red'],
    guess: ['red', 'blue', 'green', 'yellow'],
    expected: { blacks: 0, whites: 3 },
    label: "Usuário Turno 1 (Red, Blue, Green, Yellow) -> 3 Brancos (Red, Green, Yellow presentes)"
  },
  {
    secret: ['green', 'yellow', 'orange', 'red'],
    guess: ['orange', 'purple', 'yellow', 'green'],
    expected: { blacks: 0, whites: 3 },
    label: "Usuário Turno 2 (Orange, Purple, Yellow, Green) -> 3 Brancos? (Orange, Yellow, Green presentes)"
  },
  {
    secret: ['green', 'yellow', 'orange', 'red'],
    guess: ['red', 'blue', 'orange', 'purple'],
    expected: { blacks: 1, whites: 1 },
    label: "Usuário Turno 4 (Red, Blue, Orange, Purple) -> 1 Black (Orange), 1 White (Red)"
  }
];

tests.forEach((t, i) => {
  const res = evaluateGuess(t.guess, t.secret);
  const passed = res.blacks === t.expected.blacks && res.whites === t.expected.whites;
  console.log(`Test ${i + 1}: ${passed ? 'PASSED' : 'FAILED'} | ${t.label}`);
  if (!passed) {
    console.log(`  Expected: B${t.expected.blacks} W${t.expected.whites} | Got: B${res.blacks} W${res.whites}`);
  }
});
