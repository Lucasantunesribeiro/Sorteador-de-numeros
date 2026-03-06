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
      if (won && (stats.games[game].bestAttempts === null || data < stats.games[game].bestAttempts))
        stats.games[game].bestAttempts = data;
      break;
    case 'memory':
      if (won) {
        if (stats.games[game].bestTime === null || data.time < stats.games[game].bestTime)
          stats.games[game].bestTime = data.time;
        if (stats.games[game].bestMoves === null || data.moves < stats.games[game].bestMoves)
          stats.games[game].bestMoves = data.moves;
      }
      break;
    case 'reaction':
      if (stats.games[game].bestTime === null || data < stats.games[game].bestTime)
        stats.games[game].bestTime = data;
      break;
    case 'oddEven':
      if (data > (stats.games[game].bestStreak || 0))
        stats.games[game].bestStreak = data;
      break;
    case 'mastermind':
      if (won && (stats.games[game].bestTurns === null || data < stats.games[game].bestTurns))
        stats.games[game].bestTurns = data;
      break;
  }

  saveStats(stats);
  updateSidebarStats();
}

export function updateSidebarStats() {
  const winRate = stats.totalGames > 0
    ? Math.round((stats.totalWins / stats.totalGames) * 100)
    : 0;
  document.getElementById('totalGames').textContent  = stats.totalGames;
  document.getElementById('winRate').textContent     = `${winRate}%`;
  document.getElementById('bestStreak').textContent  = stats.bestStreak;
  document.getElementById('achievements').textContent = achievements.length;
}

export function updateDashboard() {
  document.getElementById('dashTotalGames').textContent = stats.totalGames;
  document.getElementById('dashWins').textContent       = stats.totalWins;
  document.getElementById('dashStreak').textContent     = stats.currentStreak;
  document.getElementById('dashTime').textContent       = Math.round(stats.playTime / 60000);
  _renderAchievements();
}

function _renderAchievements() {
  const container = document.getElementById('recentAchievements');
  if (achievements.length === 0) {
    container.innerHTML = '<p class="empty-state">Jogue para desbloquear conquistas! 🎮</p>';
    return;
  }
  container.innerHTML = achievements.slice(-5).reverse().map(a => `
    <div class="achievement-item">
      <div class="achievement-icon">${a.title.split(' ')[0]}</div>
      <div class="achievement-info">
        <div class="achievement-title">${a.title.substring(2)}</div>
        <div class="achievement-desc">${a.description}</div>
      </div>
      <div class="achievement-date">${new Date(a.date).toLocaleDateString('pt-BR')}</div>
    </div>
  `).join('');
}

export function checkAchievements(game, data) {
  const newOnes = [];
  const has = id => achievements.find(a => a.id === id);
  const add = (id, title, desc) => newOnes.push({ id, title, description: desc, date: new Date().toISOString() });

  switch (game) {
    case 'numberGuess':
      if (data <= 3 && !has('lucky_guess'))
        add('lucky_guess', '🍀 Lucky Guess', 'Acertou o numero em 3 tentativas ou menos');
      if (data === 1 && !has('mind_reader'))
        add('mind_reader', '🔮 Leitor de Mentes', 'Acertou na primeira tentativa!');
      break;
    case 'memory':
      if (data.moves <= 16 && !has('memory_master'))
        add('memory_master', '🧠 Memory Master', 'Concluiu o jogo de memoria em 16 movimentos ou menos');
      if (data.time <= 60 && !has('speed_demon'))
        add('speed_demon', '⚡ Speed Demon', 'Concluiu o jogo de memoria em menos de 60 segundos');
      break;
    case 'reaction':
      if (data < 200 && !has('lightning_reflexes'))
        add('lightning_reflexes', '🚀 Reflexos de Relampago', 'Tempo de reacao abaixo de 200ms');
      if (data < 150 && !has('superhuman'))
        add('superhuman', '🦸 Super-Humano', 'Tempo de reacao abaixo de 150ms');
      break;
    case 'mastermind':
      if (data <= 3 && !has('codebreaker'))
        add('codebreaker', '💎 Mestre Decifrador', 'Decifrou o codigo do Mastermind em 3 turnos ou menos');
      break;
  }

  if (stats.totalGames >= 10 && !has('dedicated_player'))
    add('dedicated_player', '🎮 Jogador Dedicado', 'Jogou 10 partidas');
  if (stats.totalGames >= 50 && !has('veteran'))
    add('veteran', '🏅 Veterano', 'Jogou 50 partidas');
  if (stats.bestStreak >= 5 && !has('streak_master'))
    add('streak_master', '🔥 Streak Master', 'Venceu 5 jogos seguidos');
  if (stats.bestStreak >= 10 && !has('unstoppable'))
    add('unstoppable', '💫 Imparavel', 'Venceu 10 jogos seguidos');

  newOnes.forEach(a => {
    achievements.push(a);
    showToast(`🏆 Conquista: ${a.title}`, 'success', 5000);
  });

  if (newOnes.length > 0) {
    saveAchievements(achievements);
    updateSidebarStats();
  }
}
