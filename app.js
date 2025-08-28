class LogicGamesSuite {
    constructor() {
        this.currentGame = 'dashboard';
        this.stats = this.loadStats();
        this.settings = this.loadSettings();
        this.achievements = this.loadAchievements();
        this.audioContext = null;
        this.gameStates = {};
        
        this.init();
        this.setupEventListeners();
        this.updateStats();
    }

    init() {
        // Initialize audio context
        this.initAudio();
        
        // Apply saved settings
        this.applyTheme();
        this.applySoundSetting();
        
        // Initialize games
        this.initNumberGuess();
        this.initMemoryGame();
        this.initOddEven();
        this.initReactionTime();
        
        // Show dashboard by default
        this.showGame('dashboard');
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Audio not supported');
        }
    }

    playSound(type, frequency = 440, duration = 200) {
        if (!this.settings.soundEnabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const soundMap = {
            click: { freq: 800, dur: 100 },
            success: { freq: 660, dur: 300 },
            error: { freq: 200, dur: 400 },
            flip: { freq: 440, dur: 150 },
            match: { freq: 880, dur: 250 },
            win: { freq: 523, dur: 500 }
        };

        const sound = soundMap[type] || { freq: frequency, dur: duration };
        
        oscillator.frequency.setValueAtTime(sound.freq, this.audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + sound.dur / 1000);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + sound.dur / 1000);
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.game-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gameId = e.currentTarget.dataset.game;
                this.showGame(gameId);
                this.playSound('click');
            });
        });

        // Control buttons
        document.getElementById('soundToggle').addEventListener('click', () => {
            this.toggleSound();
        });

        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        document.getElementById('fullscreenToggle').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        this.toggleSound();
                        break;
                    case 't':
                        e.preventDefault();
                        this.toggleTheme();
                        break;
                }
            }
        });
    }

    showGame(gameId) {
        // Update navigation
        document.querySelectorAll('.game-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.game === gameId);
        });

        // Show game section
        document.querySelectorAll('.game-section').forEach(section => {
            section.classList.toggle('active', section.id === gameId);
        });

        this.currentGame = gameId;
        
        // Update stats when showing dashboard
        if (gameId === 'dashboard') {
            this.updateDashboard();
        }
    }

    // Number Guessing Game
    initNumberGuess() {
        this.gameStates.numberGuess = {
            target: 0,
            attempts: 0,
            maxAttempts: 10,
            min: 1,
            max: 100,
            gameActive: false
        };

        document.getElementById('guessSubmit').addEventListener('click', () => {
            this.submitGuess();
        });

        document.getElementById('guessInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitGuess();
            }
        });

        document.getElementById('guessNewGame').addEventListener('click', () => {
            this.newNumberGuessGame();
        });

        this.newNumberGuessGame();
    }

    newNumberGuessGame() {
        const state = this.gameStates.numberGuess;
        state.target = Math.floor(Math.random() * (state.max - state.min + 1)) + state.min;
        state.attempts = 0;
        state.gameActive = true;

        document.getElementById('guessInput').value = '';
        document.getElementById('guessHint').style.display = 'none';
        document.getElementById('guessAttempts').textContent = '0';
        document.getElementById('guessProgress').style.width = '0%';
        document.getElementById('guessRange').textContent = `${state.min}-${state.max}`;
        
        this.playSound('click');
    }

    submitGuess() {
        const state = this.gameStates.numberGuess;
        if (!state.gameActive) return;

        const guess = parseInt(document.getElementById('guessInput').value);
        if (isNaN(guess) || guess < state.min || guess > state.max) {
            this.showToast('Please enter a valid number!', 'error');
            return;
        }

        state.attempts++;
        document.getElementById('guessAttempts').textContent = state.attempts;
        
        const progress = (state.attempts / state.maxAttempts) * 100;
        document.getElementById('guessProgress').style.width = `${progress}%`;

        const hintElement = document.getElementById('guessHint');
        hintElement.style.display = 'block';

        if (guess === state.target) {
            hintElement.textContent = `🎉 Correct! You found ${state.target} in ${state.attempts} attempts!`;
            hintElement.className = 'hint correct';
            state.gameActive = false;
            this.playSound('win');
            this.addStat('numberGuess', true, state.attempts);
            this.checkAchievements('numberGuess', state.attempts);
        } else if (state.attempts >= state.maxAttempts) {
            hintElement.textContent = `😔 Game Over! The number was ${state.target}`;
            hintElement.className = 'hint too-high';
            state.gameActive = false;
            this.playSound('error');
            this.addStat('numberGuess', false, state.attempts);
        } else {
            if (guess > state.target) {
                hintElement.textContent = `📉 Too high! Try a smaller number.`;
                hintElement.className = 'hint too-high';
            } else {
                hintElement.textContent = `📈 Too low! Try a larger number.`;
                hintElement.className = 'hint too-low';
            }
            this.playSound('click');
        }

        document.getElementById('guessInput').value = '';
    }

    // Memory Game
    initMemoryGame() {
        this.gameStates.memory = {
            cards: [],
            flippedCards: [],
            matchedPairs: 0,
            moves: 0,
            startTime: 0,
            timer: null,
            lockBoard: false
        };

        const emojis = ['🎮', '🎯', '🎲', '🃏', '🎭', '🎪', '🎨', '🎬'];
        this.gameStates.memory.symbols = [...emojis, ...emojis];

        document.getElementById('memoryNewGame').addEventListener('click', () => {
            this.newMemoryGame();
        });

        document.getElementById('memoryHint').addEventListener('click', () => {
            this.showMemoryHint();
        });

        this.newMemoryGame();
    }

    newMemoryGame() {
        const state = this.gameStates.memory;
        
        // Reset state
        state.flippedCards = [];
        state.matchedPairs = 0;
        state.moves = 0;
        state.lockBoard = false;
        state.startTime = Date.now();
        
        // Shuffle cards
        state.cards = [...state.symbols].sort(() => Math.random() - 0.5);
        
        // Update UI
        document.getElementById('memoryMoves').textContent = '0';
        document.getElementById('memoryTime').textContent = '00:00';
        document.getElementById('memoryPairs').textContent = '0/8';
        
        // Create grid
        this.createMemoryGrid();
        
        // Start timer
        if (state.timer) clearInterval(state.timer);
        state.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            document.getElementById('memoryTime').textContent = `${minutes}:${seconds}`;
        }, 1000);

        this.playSound('click');
    }

    createMemoryGrid() {
        const grid = document.getElementById('memoryGrid');
        grid.innerHTML = '';
        
        this.gameStates.memory.cards.forEach((symbol, index) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.dataset.symbol = symbol;
            card.dataset.index = index;
            
            card.innerHTML = `
                <div class="card-face card-back"></div>
                <div class="card-face card-front">${symbol}</div>
            `;
            
            card.addEventListener('click', () => this.flipCard(card, index));
            grid.appendChild(card);
        });
    }

    flipCard(card, index) {
        const state = this.gameStates.memory;
        
        if (state.lockBoard || card.classList.contains('flipped') || 
            card.classList.contains('matched')) return;
        
        card.classList.add('flipped');
        state.flippedCards.push({ card, index });
        this.playSound('flip');
        
        if (state.flippedCards.length === 2) {
            state.moves++;
            document.getElementById('memoryMoves').textContent = state.moves;
            state.lockBoard = true;
            
            setTimeout(() => this.checkMemoryMatch(), 600);
        }
    }

    checkMemoryMatch() {
        const state = this.gameStates.memory;
        const [first, second] = state.flippedCards;
        
        if (first.card.dataset.symbol === second.card.dataset.symbol) {
            // Match found
            first.card.classList.add('matched');
            second.card.classList.add('matched');
            state.matchedPairs++;
            
            document.getElementById('memoryPairs').textContent = `${state.matchedPairs}/8`;
            this.playSound('match');
            
            if (state.matchedPairs === 8) {
                // Game won
                clearInterval(state.timer);
                const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
                this.playSound('win');
                this.addStat('memory', true, { moves: state.moves, time: elapsed });
                this.checkAchievements('memory', { moves: state.moves, time: elapsed });
                this.showToast(`🎉 You won in ${state.moves} moves and ${elapsed} seconds!`, 'success');
            }
        } else {
            // No match
            first.card.classList.add('shake');
            second.card.classList.add('shake');
            
            setTimeout(() => {
                first.card.classList.remove('flipped', 'shake');
                second.card.classList.remove('flipped', 'shake');
            }, 800);
            
            this.playSound('error');
        }
        
        state.flippedCards = [];
        state.lockBoard = false;
    }

    showMemoryHint() {
        const state = this.gameStates.memory;
        if (state.matchedPairs >= 6) return; // No hints near the end
        
        // Briefly show all cards
        document.querySelectorAll('.memory-card:not(.matched)').forEach(card => {
            card.classList.add('flipped');
        });
        
        setTimeout(() => {
            document.querySelectorAll('.memory-card:not(.matched)').forEach(card => {
                if (!state.flippedCards.find(f => f.card === card)) {
                    card.classList.remove('flipped');
                }
            });
        }, 1000);
        
        this.playSound('click');
        this.showToast('💡 Hint used! Cards revealed briefly.', 'warning');
    }

    // Random Number Generator
    initRNG() {
        let history = [];
        
        document.getElementById('rngGenerate').addEventListener('click', () => {
            const min = parseInt(document.getElementById('rngMin').value) || 1;
            const max = parseInt(document.getElementById('rngMax').value) || 100;
            
            if (min >= max) {
                this.showToast('Minimum must be less than maximum!', 'error');
                return;
            }
            
            const result = Math.floor(Math.random() * (max - min + 1)) + min;
            document.getElementById('rngResult').textContent = result;
            
            history.unshift({ number: result, range: `${min}-${max}`, time: new Date().toLocaleTimeString() });
            if (history.length > 10) history.pop();
            
            this.updateRNGHistory(history);
            this.playSound('success');
        });
    }

    updateRNGHistory(history) {
        const historyEl = document.getElementById('rngHistory');
        if (history.length === 0) {
            historyEl.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No numbers generated yet</p>';
            return;
        }
        
        historyEl.innerHTML = history.map(item => 
            `<div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span style="font-weight: 600; color: var(--accent-primary);">${item.number}</span>
                <span style="color: var(--text-muted); font-size: 0.875rem;">${item.range} • ${item.time}</span>
            </div>`
        ).join('');
    }

    // Odd or Even Game
    initOddEven() {
        this.gameStates.oddEven = {
            currentNumber: 0,
            score: 0,
            streak: 0,
            bestStreak: this.stats.oddEven?.bestStreak || 0,
            gameActive: false
        };

        document.getElementById('guessOdd').addEventListener('click', () => {
            this.makeOddEvenGuess('odd');
        });

        document.getElementById('guessEven').addEventListener('click', () => {
            this.makeOddEvenGuess('even');
        });

        document.getElementById('oeNewGame').addEventListener('click', () => {
            this.newOddEvenGame();
        });

        this.newOddEvenGame();
    }

    newOddEvenGame() {
        const state = this.gameStates.oddEven;
        state.score = 0;
        state.streak = 0;
        state.gameActive = true;
        
        this.generateNextOddEvenNumber();
        this.updateOddEvenUI();
        document.getElementById('oeResult').innerHTML = '';
        this.playSound('click');
    }

    generateNextOddEvenNumber() {
        this.gameStates.oddEven.currentNumber = Math.floor(Math.random() * 100) + 1;
        document.getElementById('oeNumber').textContent = this.gameStates.oddEven.currentNumber;
    }

    makeOddEvenGuess(guess) {
        const state = this.gameStates.oddEven;
        if (!state.gameActive) return;

        const isOdd = state.currentNumber % 2 === 1;
        const correct = (guess === 'odd' && isOdd) || (guess === 'even' && !isOdd);
        
        const resultEl = document.getElementById('oeResult');
        
        if (correct) {
            state.score += 10;
            state.streak++;
            if (state.streak > state.bestStreak) {
                state.bestStreak = state.streak;
            }
            
            resultEl.innerHTML = `<div class="achievement">✅ Correct! +10 points</div>`;
            this.playSound('success');
            
            setTimeout(() => {
                this.generateNextOddEvenNumber();
                resultEl.innerHTML = '';
            }, 1500);
        } else {
            resultEl.innerHTML = `<div style="color: var(--accent-danger); font-weight: 600;">❌ Wrong! The number ${state.currentNumber} is ${isOdd ? 'odd' : 'even'}</div>`;
            state.streak = 0;
            this.playSound('error');
            this.addStat('oddEven', false, state.score);
            
            setTimeout(() => {
                this.newOddEvenGame();
            }, 2000);
        }
        
        this.updateOddEvenUI();
    }

    updateOddEvenUI() {
        const state = this.gameStates.oddEven;
        document.getElementById('oeScore').textContent = state.score;
        document.getElementById('oeStreak').textContent = state.streak;
        document.getElementById('oeBest').textContent = state.bestStreak;
    }

    // Reaction Time Game
    initReactionTime() {
        this.gameStates.reaction = {
            startTime: 0,
            isWaiting: false,
            isReady: false,
            times: [],
            bestTime: this.stats.reaction?.bestTime || null
        };

        const area = document.getElementById('reactionArea');
        const text = document.getElementById('reactionText');

        area.addEventListener('click', () => {
            this.handleReactionClick();
        });

        document.getElementById('reactionStart').addEventListener('click', () => {
            this.startReactionTest();
        });

        document.getElementById('reactionReset').addEventListener('click', () => {
            this.resetReactionStats();
        });

        this.updateReactionUI();
    }

    startReactionTest() {
        const state = this.gameStates.reaction;
        const area = document.getElementById('reactionArea');
        const text = document.getElementById('reactionText');
        
        area.style.background = 'var(--accent-danger)';
        text.innerHTML = '<h3>Wait...</h3><p>Get ready to click when it turns green!</p>';
        
        state.isWaiting = true;
        state.isReady = false;
        
        // Random delay between 2-6 seconds
        const delay = Math.random() * 4000 + 2000;
        
        setTimeout(() => {
            if (!state.isWaiting) return; // User clicked too early
            
            area.style.background = 'var(--accent-success)';
            text.innerHTML = '<h3>CLICK NOW!</h3>';
            state.startTime = Date.now();
            state.isReady = true;
        }, delay);

        this.playSound('click');
    }

    handleReactionClick() {
        const state = this.gameStates.reaction;
        const area = document.getElementById('reactionArea');
        const text = document.getElementById('reactionText');
        
        if (state.isWaiting && !state.isReady) {
            // Too early
            area.style.background = 'var(--bg-secondary)';
            text.innerHTML = '<h3>Too Early!</h3><p>Click "Start Test" to try again</p>';
            state.isWaiting = false;
            this.playSound('error');
            return;
        }
        
        if (state.isReady) {
            // Calculate reaction time
            const reactionTime = Date.now() - state.startTime;
            state.times.push(reactionTime);
            
            // Update best time
            if (!state.bestTime || reactionTime < state.bestTime) {
                state.bestTime = reactionTime;
            }
            
            area.style.background = 'var(--bg-secondary)';
            text.innerHTML = `<h3>${reactionTime}ms</h3><p>Click "Start Test" to try again</p>`;
            
            state.isWaiting = false;
            state.isReady = false;
            
            this.updateReactionUI();
            this.addStat('reaction', true, reactionTime);
            this.playSound('success');
            
            if (reactionTime < 200) {
                this.showToast('🚀 Lightning fast reflexes!', 'success');
            } else if (reactionTime < 300) {
                this.showToast('⚡ Great reaction time!', 'success');
            }
        }
    }

    updateReactionUI() {
        const state = this.gameStates.reaction;
        const lastTime = state.times[state.times.length - 1] || 0;
        const average = state.times.length > 0 
            ? Math.round(state.times.reduce((a, b) => a + b, 0) / state.times.length)
            : 0;
        
        document.getElementById('reactionTime').textContent = `${lastTime}ms`;
        document.getElementById('reactionAverage').textContent = `${average}ms`;
        document.getElementById('reactionBest').textContent = state.bestTime ? `${state.bestTime}ms` : '-';
    }

    resetReactionStats() {
        this.gameStates.reaction.times = [];
        this.gameStates.reaction.bestTime = null;
        this.updateReactionUI();
        this.playSound('click');
        this.showToast('Reaction time stats reset!', 'success');
    }

    // Statistics and Data Management
    loadStats() {
        const saved = localStorage.getItem('logicGamesStats');
        return saved ? JSON.parse(saved) : {
            totalGames: 0,
            totalWins: 0,
            currentStreak: 0,
            bestStreak: 0,
            playTime: 0,
            games: {
                numberGuess: { played: 0, won: 0, bestAttempts: null },
                memory: { played: 0, won: 0, bestTime: null, bestMoves: null },
                oddEven: { played: 0, bestStreak: 0 },
                reaction: { played: 0, bestTime: null, averageTime: null }
            }
        };
    }

    saveStats() {
        localStorage.setItem('logicGamesStats', JSON.stringify(this.stats));
    }

    loadSettings() {
        const saved = localStorage.getItem('logicGamesSettings');
        return saved ? JSON.parse(saved) : {
            theme: 'dark',
            soundEnabled: true,
            language: 'en'
        };
    }

    saveSettings() {
        localStorage.setItem('logicGamesSettings', JSON.stringify(this.settings));
    }

    loadAchievements() {
        const saved = localStorage.getItem('logicGamesAchievements');
        return saved ? JSON.parse(saved) : [];
    }

    saveAchievements() {
        localStorage.setItem('logicGamesAchievements', JSON.stringify(this.achievements));
    }

    addStat(game, won, data = null) {
        this.stats.totalGames++;
        this.stats.games[game].played++;
        
        if (won) {
            this.stats.totalWins++;
            this.stats.games[game].won++;
            this.stats.currentStreak++;
            if (this.stats.currentStreak > this.stats.bestStreak) {
                this.stats.bestStreak = this.stats.currentStreak;
            }
        } else {
            this.stats.currentStreak = 0;
        }

        // Game-specific stat updates
        switch(game) {
            case 'numberGuess':
                if (won && (this.stats.games[game].bestAttempts === null || data < this.stats.games[game].bestAttempts)) {
                    this.stats.games[game].bestAttempts = data;
                }
                break;
            case 'memory':
                if (won) {
                    if (this.stats.games[game].bestTime === null || data.time < this.stats.games[game].bestTime) {
                        this.stats.games[game].bestTime = data.time;
                    }
                    if (this.stats.games[game].bestMoves === null || data.moves < this.stats.games[game].bestMoves) {
                        this.stats.games[game].bestMoves = data.moves;
                    }
                }
                break;
            case 'reaction':
                if (this.stats.games[game].bestTime === null || data < this.stats.games[game].bestTime) {
                    this.stats.games[game].bestTime = data;
                }
                break;
            case 'oddEven':
                if (data > this.stats.games[game].bestStreak) {
                    this.stats.games[game].bestStreak = data;
                }
                break;
        }

        this.saveStats();
        this.updateStats();
    }

    updateStats() {
        const winRate = this.stats.totalGames > 0 
            ? Math.round((this.stats.totalWins / this.stats.totalGames) * 100)
            : 0;

        // Sidebar stats
        document.getElementById('totalGames').textContent = this.stats.totalGames;
        document.getElementById('winRate').textContent = `${winRate}%`;
        document.getElementById('bestStreak').textContent = this.stats.bestStreak;
        document.getElementById('achievements').textContent = this.achievements.length;

        // Game-specific best scores
        const numberGuessGame = this.stats.games.numberGuess;
        if (numberGuessGame.bestAttempts) {
            document.getElementById('guessBest').textContent = numberGuessGame.bestAttempts;
        }
    }

    updateDashboard() {
        document.getElementById('dashTotalGames').textContent = this.stats.totalGames;
        document.getElementById('dashWins').textContent = this.stats.totalWins;
        document.getElementById('dashStreak').textContent = this.stats.currentStreak;
        document.getElementById('dashTime').textContent = Math.round(this.stats.playTime / 60000); // Convert to minutes
        
        this.updateRecentAchievements();
    }

    checkAchievements(game, data) {
        const newAchievements = [];
        
        switch(game) {
            case 'numberGuess':
                if (data <= 3 && !this.achievements.find(a => a.id === 'lucky_guess')) {
                    newAchievements.push({
                        id: 'lucky_guess',
                        title: '🍀 Lucky Guess',
                        description: 'Guessed the number in 3 attempts or less',
                        date: new Date().toISOString()
                    });
                }
                break;
            case 'memory':
                if (data.moves <= 16 && !this.achievements.find(a => a.id === 'memory_master')) {
                    newAchievements.push({
                        id: 'memory_master',
                        title: '🧠 Memory Master',
                        description: 'Completed memory game in 16 moves or less',
                        date: new Date().toISOString()
                    });
                }
                if (data.time <= 60 && !this.achievements.find(a => a.id === 'speed_demon')) {
                    newAchievements.push({
                        id: 'speed_demon',
                        title: '⚡ Speed Demon',
                        description: 'Completed memory game in under 60 seconds',
                        date: new Date().toISOString()
                    });
                }
                break;
            case 'reaction':
                if (data < 200 && !this.achievements.find(a => a.id === 'lightning_reflexes')) {
                    newAchievements.push({
                        id: 'lightning_reflexes',
                        title: '🚀 Lightning Reflexes',
                        description: 'Reaction time under 200ms',
                        date: new Date().toISOString()
                    });
                }
                break;
        }

        // General achievements
        if (this.stats.totalGames >= 10 && !this.achievements.find(a => a.id === 'dedicated_player')) {
            newAchievements.push({
                id: 'dedicated_player',
                title: '🎮 Dedicated Player',
                description: 'Played 10 games',
                date: new Date().toISOString()
            });
        }

        if (this.stats.bestStreak >= 5 && !this.achievements.find(a => a.id === 'streak_master')) {
            newAchievements.push({
                id: 'streak_master',
                title: '🔥 Streak Master',
                description: 'Won 5 games in a row',
                date: new Date().toISOString()
            });
        }

        // Add new achievements
        newAchievements.forEach(achievement => {
            this.achievements.push(achievement);
            this.showToast(`🏆 Achievement Unlocked: ${achievement.title}`, 'success', 5000);
        });

        if (newAchievements.length > 0) {
            this.saveAchievements();
            this.updateStats();
        }
    }

    updateRecentAchievements() {
        const container = document.getElementById('recentAchievements');
        
        if (this.achievements.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">Play games to unlock achievements!</p>';
            return;
        }

        const recent = this.achievements.slice(-5).reverse();
        container.innerHTML = recent.map(achievement => `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--surface); border-radius: var(--border-radius); margin-bottom: 0.5rem;">
                <div style="font-size: 2rem;">${achievement.title.split(' ')[0]}</div>
                <div>
                    <div style="font-weight: 600;">${achievement.title.substring(2)}</div>
                    <div style="color: var(--text-muted); font-size: 0.875rem;">${achievement.description}</div>
                </div>
                <div style="margin-left: auto; color: var(--text-muted); font-size: 0.75rem;">
                    ${new Date(achievement.date).toLocaleDateString()}
                </div>
            </div>
        `).join('');
    }

    // UI Controls
    toggleTheme() {
        this.settings.theme = this.settings.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        this.saveSettings();
        this.playSound('click');
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = this.settings.theme === 'dark' ? '☀️' : '🌙';
    }

    toggleSound() {
        this.settings.soundEnabled = !this.settings.soundEnabled;
        this.applySoundSetting();
        this.saveSettings();
        this.playSound('click');
    }

    applySoundSetting() {
        const soundToggle = document.getElementById('soundToggle');
        soundToggle.textContent = this.settings.soundEnabled ? '🔊' : '🔇';
        
        if (this.settings.soundEnabled && !this.audioContext) {
            this.initAudio();
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
        this.playSound('click');
    }

    showToast(message, type = 'success', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.remove();
        }, duration);

        // Remove on click
        toast.addEventListener('click', () => {
            toast.remove();
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.gamesSuite = new LogicGamesSuite();
    
    // Initialize RNG separately since it's simpler
    let rngHistory = [];
    
    document.getElementById('rngGenerate').addEventListener('click', () => {
        const min = parseInt(document.getElementById('rngMin').value) || 1;
        const max = parseInt(document.getElementById('rngMax').value) || 100;
        
        if (min >= max) {
            window.gamesSuite.showToast('Minimum must be less than maximum!', 'error');
            return;
        }
        
        const result = Math.floor(Math.random() * (max - min + 1)) + min;
        document.getElementById('rngResult').textContent = result;
        
        rngHistory.unshift({ 
            number: result, 
            range: `${min}-${max}`, 
            time: new Date().toLocaleTimeString() 
        });
        if (rngHistory.length > 10) rngHistory.pop();
        
        updateRNGHistory(rngHistory);
        window.gamesSuite.playSound('success');
    });
    
    function updateRNGHistory(history) {
        const historyEl = document.getElementById('rngHistory');
        if (history.length === 0) {
            historyEl.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No numbers generated yet</p>';
            return;
        }
        
        historyEl.innerHTML = history.map(item => 
            `<div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span style="font-weight: 600; color: var(--accent-primary);">${item.number}</span>
                <span style="color: var(--text-muted); font-size: 0.875rem;">${item.range} • ${item.time}</span>
            </div>`
        ).join('');
    }
});