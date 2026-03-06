const KEYS = {
  STATS: 'lgs:stats',
  SETTINGS: 'lgs:settings',
  ACHIEVEMENTS: 'lgs:achievements'
};

const DEFAULT_STATS = {
  totalGames: 0,
  totalWins: 0,
  currentStreak: 0,
  bestStreak: 0,
  playTime: 0,
  games: {
    numberGuess: { played: 0, won: 0, bestAttempts: null },
    memory:      { played: 0, won: 0, bestTime: null, bestMoves: null },
    oddEven:     { played: 0, bestStreak: 0 },
    reaction:    { played: 0, bestTime: null },
    mastermind:  { played: 0, won: 0, bestTurns: null }
  }
};

const DEFAULT_SETTINGS = {
  theme: 'dark',
  soundEnabled: true
};

function _get(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function _set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Storage write failed:', e);
  }
}

export function loadStats() {
  const saved = _get(KEYS.STATS, null);
  if (!saved) {
    return JSON.parse(JSON.stringify(DEFAULT_STATS));
  }
  return {
    ...DEFAULT_STATS,
    ...saved,
    games: { ...DEFAULT_STATS.games, ...saved.games }
  };
}

export function saveStats(stats) {
  _set(KEYS.STATS, stats);
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ..._get(KEYS.SETTINGS, {}) };
}

export function saveSettings(settings) {
  _set(KEYS.SETTINGS, settings);
}

export function loadAchievements() {
  return _get(KEYS.ACHIEVEMENTS, []);
}

export function saveAchievements(achievements) {
  _set(KEYS.ACHIEVEMENTS, achievements);
}
