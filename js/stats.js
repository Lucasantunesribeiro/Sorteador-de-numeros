import { loadStats, saveStats, loadAchievements, saveAchievements } from './storage.js';
import { showToast } from './ui.js';

export let stats = loadStats();
export let achievements = loadAchievements();

export function addStat(game, won, data = null) {
  stats.totalGames++;
  stats.games[game].played++;

  if (won) {
    stats.totalWins++;
    if (stats.games[game].won !== undefined) stats.games[game].won++;
    stats.currentStreak++;
    if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
  } else {
    stats.currentStreak = 0;
  }

  switch (game) {
    case 'numberGuess':
      if (won && (stats.games[game].bestAttempts === null || data < stats.games[game].bestAttempts)) {
        stats.games[game].bestAttempts = data;
      }
      break;
    case 'memory':
      if (won && data) {
        if (stats.games[game].bestTime === null || data.time < stats.games[game].bestTime) {
          stats.games[game].bestTime = data.time;
        }
        if (stats.games[game].bestMoves === null || data.moves < stats.games[game].bestMoves) {
          stats.games[game].bestMoves = data.moves;
        }
      }
      break;
    case 'game2048':
      if (data) {
        stats.games[game].bestTile = Math.max(stats.games[game].bestTile || 0, data.tile || 0);
        stats.games[game].bestScore = Math.max(stats.games[game].bestScore || 0, data.score || 0);
      }
      break;
    case 'sudoku':
      if (won && data) {
        if (stats.games[game].bestTime === null || data.time < stats.games[game].bestTime) {
          stats.games[game].bestTime = data.time;
        }
        if (stats.games[game].bestMistakes === null || data.mistakes < stats.games[game].bestMistakes) {
          stats.games[game].bestMistakes = data.mistakes;
        }
      }
      break;
    case 'lightsOut':
      if (won && data) {
        if (stats.games[game].bestMoves === null || data.moves < stats.games[game].bestMoves) {
          stats.games[game].bestMoves = data.moves;
        }
        if (stats.games[game].bestTime === null || data.time < stats.games[game].bestTime) {
          stats.games[game].bestTime = data.time;
        }
      }
      break;
    case 'reaction':
      if (stats.games[game].bestTime === null || data < stats.games[game].bestTime) {
        stats.games[game].bestTime = data;
      }
      break;
    case 'oddEven':
      if (data > (stats.games[game].bestStreak || 0)) {
        stats.games[game].bestStreak = data;
      }
      break;
    case 'mastermind':
      if (won && (stats.games[game].bestTurns === null || data < stats.games[game].bestTurns)) {
        stats.games[game].bestTurns = data;
      }
      break;
  }

  saveStats(stats);
  updateSidebarStats();
}

export function updateSidebarStats() {
  if (!stats) return;
  const winRate = stats.totalGames > 0
    ? Math.round((stats.totalWins / stats.totalGames) * 100)
    : 0;

  const elTotalGames = document.getElementById('totalGames');
  if (elTotalGames) elTotalGames.textContent = stats.totalGames;

  const elWinRate = document.getElementById('winRate');
  if (elWinRate) elWinRate.textContent = `${winRate}%`;

  const elBestStreak = document.getElementById('bestStreak');
  if (elBestStreak) elBestStreak.textContent = stats.bestStreak || 0;

  const elAchievements = document.getElementById('achievements');
  if (elAchievements) elAchievements.textContent = achievements ? achievements.length : 0;
}

export function updateDashboard() {
  updateSidebarStats();

  const dashboardStats = loadStats();
  const dashboardAchievements = loadAchievements();

  const elTotalGames = document.getElementById('totalGames');
  if (elTotalGames) elTotalGames.textContent = dashboardStats.totalGames;

  const elWinRate = document.getElementById('winRate');
  if (elWinRate) {
    const rate = dashboardStats.totalGames > 0
      ? Math.round((dashboardStats.totalWins / dashboardStats.totalGames) * 100)
      : 0;
    elWinRate.textContent = `${rate}%`;
  }

  const elBestStreak = document.getElementById('bestStreak');
  if (elBestStreak) elBestStreak.textContent = dashboardStats.bestStreak || 0;

  const elDashStreak = document.getElementById('dashStreak');
  if (elDashStreak) elDashStreak.textContent = dashboardStats.currentStreak || 0;

  const progressLabel = document.getElementById('dashboardProgressLabel');
  const progressBar = document.getElementById('dashboardProgress');
  if (progressBar || progressLabel) {
    const rate = dashboardStats.totalGames > 0
      ? Math.round((dashboardStats.totalWins / dashboardStats.totalGames) * 100)
      : 0;
    if (progressBar) progressBar.style.width = `${rate}%`;
    if (progressLabel) progressLabel.textContent = `${rate}%`;
  }

  _renderAchievements(dashboardAchievements);
}

function _renderAchievements(achievementList) {
  const container = document.getElementById('achievements');
  if (!container) return;

  if (achievementList.length === 0) {
    container.textContent = '0';
    return;
  }

  container.textContent = achievementList.length;
}

export function checkAchievements(game, data) {
  const newOnes = [];
  const has = id => achievements.find(achievement => achievement.id === id);
  const add = (id, title, description) => {
    newOnes.push({ id, title, description, date: new Date().toISOString() });
  };

  switch (game) {
    case 'numberGuess':
      if (data <= 3 && !has('lucky_guess')) {
        add('lucky_guess', 'Lucky Guess', 'Acertou o numero em 3 tentativas ou menos');
      }
      if (data === 1 && !has('mind_reader')) {
        add('mind_reader', 'Mind Reader', 'Acertou na primeira tentativa');
      }
      break;
    case 'memory':
      if (data.moves <= 16 && !has('memory_master')) {
        add('memory_master', 'Memory Master', 'Concluiu o jogo de memoria em 16 movimentos ou menos');
      }
      if (data.time <= 60 && !has('speed_demon')) {
        add('speed_demon', 'Speed Demon', 'Concluiu o jogo de memoria em menos de 60 segundos');
      }
      break;
    case 'game2048':
      if (data.tile >= 512 && !has('tile_512')) {
        add('tile_512', 'Tile 512', 'Alcancou a peca 512 no 2048');
      }
      if (data.tile >= 1024 && !has('tile_1024')) {
        add('tile_1024', 'Tile 1024', 'Alcancou a peca 1024 no 2048');
      }
      if (data.tile >= 2048 && !has('tile_2048')) {
        add('tile_2048', 'Tile 2048', 'Alcancou a peca 2048 no 2048');
      }
      break;
    case 'sudoku':
      if (data.mistakes === 0 && !has('sudoku_perfect')) {
        add('sudoku_perfect', 'Sudoku Perfect', 'Resolveu um Sudoku sem erros');
      }
      if (data.time <= 300 && !has('sudoku_sprinter')) {
        add('sudoku_sprinter', 'Sudoku Sprinter', 'Resolveu um Sudoku em ate 5 minutos');
      }
      break;
    case 'lightsOut':
      if (data.moves <= 12 && !has('lights_out_efficiency')) {
        add('lights_out_efficiency', 'Lights Out Efficient', 'Resolveu Lights Out em 12 movimentos ou menos');
      }
      if (data.time <= 45 && !has('lights_out_quick')) {
        add('lights_out_quick', 'Lights Out Quick', 'Resolveu Lights Out em menos de 45 segundos');
      }
      break;
    case 'reaction':
      if (data < 200 && !has('lightning_reflexes')) {
        add('lightning_reflexes', 'Lightning Reflexes', 'Tempo de reacao abaixo de 200ms');
      }
      if (data < 150 && !has('superhuman')) {
        add('superhuman', 'Superhuman', 'Tempo de reacao abaixo de 150ms');
      }
      break;
    case 'mastermind':
      if (data <= 3 && !has('codebreaker')) {
        add('codebreaker', 'Codebreaker', 'Decifrou o codigo do Mastermind em 3 turnos ou menos');
      }
      break;
  }

  if (stats.totalGames >= 10 && !has('dedicated_player')) {
    add('dedicated_player', 'Dedicated Player', 'Jogou 10 partidas');
  }
  if (stats.totalGames >= 50 && !has('veteran')) {
    add('veteran', 'Veteran', 'Jogou 50 partidas');
  }
  if (stats.bestStreak >= 5 && !has('streak_master')) {
    add('streak_master', 'Streak Master', 'Venceu 5 jogos seguidos');
  }
  if (stats.bestStreak >= 10 && !has('unstoppable')) {
    add('unstoppable', 'Unstoppable', 'Venceu 10 jogos seguidos');
  }

  newOnes.forEach(achievement => {
    achievements.push(achievement);
    showToast(`Achievement: ${achievement.title}`, 'success', 5000);
  });

  if (newOnes.length > 0) {
    saveAchievements(achievements);
    updateSidebarStats();
  }
}
