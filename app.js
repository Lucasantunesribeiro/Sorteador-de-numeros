class LogicGamesSuite {\n    constructor() {\n        this.currentGame = 'dashboard';\n        this.stats = this.loadStats();\n        this.settings = this.loadSettings();\n        this.achievements = this.loadAchievements();\n        this.audioContext = null;\n        this.gameStates = {};\n\n        this.init();\n        this.setupEventListeners();\n        this.updateStats();\n    }\n\n    init() {\n        // Initialize audio context\n        this.initAudio();\n\n        // Apply saved settings\n        this.applyTheme();\n        this.applySoundSetting();\n\n        // Initialize games\n        this.initNumberGuess();\n        this.initMemoryGame();\n        this.initOddEven();\n        this.initReactionTime();\n        this.initMastermind();\n\n        // Show dashboard by default\n        this.showGame('dashboard');\n    }\n\n    initAudio() {\n        try {\n            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();\n        } catch (e) {\n            console.warn('Audio not supported');\n        }\n    }\n\n    playSound(type, frequency = 440, duration = 200) {\n        if (!this.settings.soundEnabled || !this.audioContext) return;\n\n        const oscillator = this.audioContext.createOscillator();\n        const gainNode = this.audioContext.createGain();\n\n        oscillator.connect(gainNode);\n        gainNode.connect(this.audioContext.destination);\n\n        const soundMap = {\n            click: { freq: 800, dur: 100 },\n            success: { freq: 660, dur: 300 },\n            error: { freq: 200, dur: 400 },\n            flip: { freq: 440, dur: 150 },\n            match: { freq: 880, dur: 250 },\n            win: { freq: 523, dur: 500 }\n        };\n\n        const sound = soundMap[type] || { freq: frequency, dur: duration };\n\n        oscillator.frequency.setValueAtTime(sound.freq, this.audioContext.currentTime);\n        oscillator.type = 'sine';\n\n        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);\n        gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.01);\n        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + sound.dur / 1000);\n\n        oscillator.start(this.audioContext.currentTime);\n        oscillator.stop(this.audioContext.currentTime + sound.dur / 1000);\n    }\n\n    setupEventListeners() {\n        // Navigation\n        document.querySelectorAll('.game-btn').forEach(btn => {\n            btn.addEventListener('click', (e) => {\n                const gameId = e.currentTarget.dataset.game;\n                this.showGame(gameId);\n                this.playSound('click');\n            });\n        });\n\n        // Control buttons\n        document.getElementById('soundToggle').addEventListener('click', () => {\n            this.toggleSound();\n        });\n\n        document.getElementById('themeToggle').addEventListener('click', () => {\n            this.toggleTheme();\n        });\n\n        document.getElementById('fullscreenToggle').addEventListener('click', () => {\n            this.toggleFullscreen();\n        });\n\n        // Keyboard shortcuts\n        document.addEventListener('keydown', (e) => {\n            if (e.ctrlKey || e.metaKey) {\n                switch (e.key) {\n                    case 's':\n                        e.preventDefault();\n                        this.toggleSound();\n                        break;\n                    case 't':\n                        e.preventDefault();\n                        this.toggleTheme();\n                        break;\n                }\n            }\n        });\n    }\n\n    showGame(gameId) {\n        // Update navigation\n        document.querySelectorAll('.game-btn').forEach(btn => {\n            btn.classList.toggle('active', btn.dataset.game === gameId);\n        });\n\n        // Show game section\n        document.querySelectorAll('.game-section').forEach(section => {\n            section.classList.toggle('active', section.id === gameId);\n        });\n\n        this.currentGame = gameId;\n\n        // Update stats when showing dashboard\n        if (gameId === 'dashboard') {\n            this.updateDashboard();\n        }\n    }\n\n    // Number Guessing Game\n    initNumberGuess() {\n        this.gameStates.numberGuess = {\n            target: 0,\n            attempts: 0,\n            maxAttempts: 10,\n            min: 1,\n            max: 100,\n            gameActive: false\n        };\n\n        document.getElementById('guessSubmit').addEventListener('click', () => {\n            this.submitGuess();\n        });\n\n        document.getElementById('guessInput').addEventListener('keypress', (e) => {\n            if (e.key === 'Enter') {\n                this.submitGuess();\n            }\n        });\n\n        document.getElementById('guessNewGame').addEventListener('click', () => {\n            this.newNumberGuessGame();\n        });\n\n        this.newNumberGuessGame();\n    }\n\n    newNumberGuessGame() {\n        const state = this.gameStates.numberGuess;\n        state.target = Math.floor(Math.random() * (state.max - state.min + 1)) + state.min;\n        state.attempts = 0;\n        state.gameActive = true;\n\n        document.getElementById('guessInput').value = '';\n        document.getElementById('guessHint').style.display = 'none';\n        document.getElementById('guessAttempts').textContent = '0';\n        document.getElementById('guessProgress').style.width = '0%';\n        document.getElementById('guessRange').textContent = `${state.min}-${state.max}`;\n\n        this.playSound('click');\n    }\n\n    submitGuess() {\n        const state = this.gameStates.numberGuess;\n        if (!state.gameActive) return;\n\n        const guess = parseInt(document.getElementById('guessInput').value);\n        if (isNaN(guess) || guess < state.min || guess > state.max) {\n            this.showToast('Please enter a valid number!', 'error');\n            return;\n        }\n\n        state.attempts++;\n        document.getElementById('guessAttempts').textContent = state.attempts;\n\n        const progress = (state.attempts / state.maxAttempts) * 100;\n        document.getElementById('guessProgress').style.width = `${progress}%`;\n\n        const hintElement = document.getElementById('guessHint');\n        hintElement.style.display = 'block';\n\n        if (guess === state.target) {\n            hintElement.textContent = `🎉 Correct! You found ${state.target} in ${state.attempts} attempts!`;\n            hintElement.className = 'hint correct';\n            state.gameActive = false;\n            this.playSound('win');\n            this.addStat('numberGuess', true, state.attempts);\n            this.checkAchievements('numberGuess', state.attempts);\n        } else if (state.attempts >= state.maxAttempts) {\n            hintElement.textContent = `😔 Game Over! The number was ${state.target}`;\n            hintElement.className = 'hint too-high';\n            state.gameActive = false;\n            this.playSound('error');\n            this.addStat('numberGuess', false, state.attempts);\n        } else {\n            if (guess > state.target) {\n                hintElement.textContent = `📉 Too high! Try a smaller number.`;\n                hintElement.className = 'hint too-high';\n            } else {\n                hintElement.textContent = `📈 Too low! Try a larger number.`;\n                hintElement.className = 'hint too-low';\n            }\n            this.playSound('click');\n        }\n\n        document.getElementById('guessInput').value = '';\n    }\n\n    // Memory Game\n    initMemoryGame() {\n        this.gameStates.memory = {\n            cards: [],\n            flippedCards: [],\n            matchedPairs: 0,\n            moves: 0,\n            startTime: 0,\n            timer: null,\n            lockBoard: false\n        };\n\n        const emojis = ['🎮', '🎯', '🎲', '🃏', '🎭', '🎪', '🎨', '🎬'];\n        this.gameStates.memory.symbols = [...emojis, ...emojis];\n\n        document.getElementById('memoryNewGame').addEventListener('click', () => {\n            this.newMemoryGame();\n        });\n\n        document.getElementById('memoryHint').addEventListener('click', () => {\n            this.showMemoryHint();\n        });\n\n        this.newMemoryGame();\n    }\n\n    newMemoryGame() {\n        const state = this.gameStates.memory;\n\n        // Reset state\n        state.flippedCards = [];\n        state.matchedPairs = 0;\n        state.moves = 0;\n        state.lockBoard = false;\n        state.startTime = Date.now();\n\n        // Shuffle cards\n        state.cards = [...state.symbols].sort(() => Math.random() - 0.5);\n\n        // Update UI\n        document.getElementById('memoryMoves').textContent = '0';\n        document.getElementById('memoryTime').textContent = '00:00';\n        document.getElementById('memoryPairs').textContent = '0/8';\n\n        // Create grid\n        this.createMemoryGrid();\n\n        // Start timer\n        if (state.timer) clearInterval(state.timer);\n        state.timer = setInterval(() => {\n            const elapsed = Math.floor((Date.now() - state.startTime) / 1000);\n            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');\n            const seconds = (elapsed % 60).toString().padStart(2, '0');\n            document.getElementById('memoryTime').textContent = `${minutes}:${seconds}`;\n        }, 1000);\n\n        this.playSound('click');\n    }\n\n    createMemoryGrid() {\n        const grid = document.getElementById('memoryGrid');\n        grid.innerHTML = '';\n\n        this.gameStates.memory.cards.forEach((symbol, index) => {\n            const card = document.createElement('div');\n            card.className = 'memory-card';\n            card.dataset.symbol = symbol;\n            card.dataset.index = index;\n\n            card.innerHTML = `\n                <div class="card-face card-back"></div>\n                <div class="card-face card-front">${symbol}</div>\n            `;\n\n            card.addEventListener('click', () => this.flipCard(card, index));\n            grid.appendChild(card);\n        });\n    }\n\n    flipCard(card, index) {\n        const state = this.gameStates.memory;\n\n        if (state.lockBoard || card.classList.contains('flipped') ||\n            card.classList.contains('matched')) return;\n\n        card.classList.add('flipped');\n        state.flippedCards.push({ card, index });\n        this.playSound('flip');\n\n        if (state.flippedCards.length === 2) {\n            state.moves++;\n            document.getElementById('memoryMoves').textContent = state.moves;\n            state.lockBoard = true;\n\n            setTimeout(() => this.checkMemoryMatch(), 600);\n        }\n    }\n\n    checkMemoryMatch() {\n        const state = this.gameStates.memory;\n        const [first, second] = state.flippedCards;\n\n        if (first.card.dataset.symbol === second.card.dataset.symbol) {\n            // Match found\n            first.card.classList.add('matched');\n            second.card.classList.add('matched');\n            state.matchedPairs++;\n\n            document.getElementById('memoryPairs').textContent = `${state.matchedPairs}/8`;\n            this.playSound('match');\n\n            if (state.matchedPairs === 8) {\n                // Game won\n                clearInterval(state.timer);\n                const elapsed = Math.floor((Date.now() - state.startTime) / 1000);\n                this.playSound('win');\n                this.addStat('memory', true, { moves: state.moves, time: elapsed });\n                this.checkAchievements('memory', { moves: state.moves, time: elapsed });\n                this.showToast(`🎉 You won in ${state.moves} moves and ${elapsed} seconds!`, 'success');\n            }\n        } else {\n            // No match\n            first.card.classList.add('shake');\n            second.card.classList.add('shake');\n\n            setTimeout(() => {\n                first.card.classList.remove('flipped', 'shake');\n                second.card.classList.remove('flipped', 'shake');\n            }, 800);\n\n            this.playSound('error');\n        }\n\n        state.flippedCards = [];\n        state.lockBoard = false;\n    }\n\n    showMemoryHint() {\n        const state = this.gameStates.memory;\n        if (state.matchedPairs >= 6) return; // No hints near the end\n\n        // Briefly show all cards\n        document.querySelectorAll('.memory-card:not(.matched)').forEach(card => {\n            card.classList.add('flipped');\n        });\n\n        setTimeout(() => {\n            document.querySelectorAll('.memory-card:not(.matched)').forEach(card => {\n                if (!state.flippedCards.find(f => f.card === card)) {\n                    card.classList.remove('flipped');\n                }\n            });\n        }, 1000);\n\n        this.playSound('click');\n        this.showToast('💡 Hint used! Cards revealed briefly.', 'warning');\n    }\n\n    // Random Number Generator\n    initRNG() {\n        let history = [];\n\n        document.getElementById('rngGenerate').addEventListener('click', () => {\n            const min = parseInt(document.getElementById('rngMin').value) || 1;\n            const max = parseInt(document.getElementById('rngMax').value) || 100;\n\n            if (min >= max) {\n                this.showToast('Minimum must be less than maximum!', 'error');\n                return;\n            }\n\n            const result = Math.floor(Math.random() * (max - min + 1)) + min;\n            document.getElementById('rngResult').textContent = result;\n\n            history.unshift({ number: result, range: `${min}-${max}`, time: new Date().toLocaleTimeString() });\n            if (history.length > 10) history.pop();\n\n            this.updateRNGHistory(history);\n            this.playSound('success');\n        });\n    }\n\n    updateRNGHistory(history) {\n        const historyEl = document.getElementById('rngHistory');\n        if (history.length === 0) {\n            historyEl.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No numbers generated yet</p>';\n            return;\n        }\n\n        historyEl.innerHTML = history.map(item =>\n            `<div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">\n                <span style="font-weight: 600; color: var(--accent-primary);">${item.number}</span>\n                <span style="color: var(--text-muted); font-size: 0.875rem;">${item.range} • ${item.time}</span>\n            </div>`\n        ).join('');\n    }\n\n    // Odd or Even Game\n    initOddEven() {\n        this.gameStates.oddEven = {\n            currentNumber: 0,\n            score: 0,\n            streak: 0,\n            bestStreak: this.stats.oddEven?.bestStreak || 0,\n            gameActive: false\n        };\n\n        document.getElementById('guessOdd').addEventListener('click', () => {\n            this.makeOddEvenGuess('odd');\n        });\n\n        document.getElementById('guessEven').addEventListener('click', () => {\n            this.makeOddEvenGuess('even');\n        });\n\n        document.getElementById('oeNewGame').addEventListener('click', () => {\n            this.newOddEvenGame();\n        });\n\n        this.newOddEvenGame();\n    }\n\n    newOddEvenGame() {\n        const state = this.gameStates.oddEven;\n        state.score = 0;\n        state.streak = 0;\n        state.gameActive = true;\n\n        this.generateNextOddEvenNumber();\n        this.updateOddEvenUI();\n        document.getElementById('oeResult').innerHTML = '';\n        this.playSound('click');\n    }\n\n    generateNextOddEvenNumber() {\n        this.gameStates.oddEven.currentNumber = Math.floor(Math.random() * 100) + 1;\n        document.getElementById('oeNumber').textContent = this.gameStates.oddEven.currentNumber;\n    }\n\n    makeOddEvenGuess(guess) {\n        const state = this.gameStates.oddEven;\n        if (!state.gameActive) return;\n\n        const isOdd = state.currentNumber % 2 === 1;\n        const correct = (guess === 'odd' && isOdd) || (guess === 'even' && !isOdd);\n\n        const resultEl = document.getElementById('oeResult');\n\n        if (correct) {\n            state.score += 10;\n            state.streak++;\n            if (state.streak > state.bestStreak) {\n                state.bestStreak = state.streak;\n            }\n\n            resultEl.innerHTML = `<div class="achievement">✅ Correct! +10 points</div>`;\n            this.playSound('success');\n\n            setTimeout(() => {\n                this.generateNextOddEvenNumber();\n                resultEl.innerHTML = '';\n            }, 1500);\n        } else {\n            resultEl.innerHTML = `<div style="color: var(--accent-danger); font-weight: 600;">❌ Wrong! The number ${state.currentNumber} is ${isOdd ? 'odd' : 'even'}</div>`;\n            state.streak = 0;\n            this.playSound('error');\n            this.addStat('oddEven', false, state.score);\n\n            setTimeout(() => {\n                this.newOddEvenGame();\n            }, 2000);\n        }\n\n        this.updateOddEvenUI();\n    }\n\n    updateOddEvenUI() {\n        const state = this.gameStates.oddEven;\n        document.getElementById('oeScore').textContent = state.score;\n        document.getElementById('oeStreak').textContent = state.streak;\n        document.getElementById('oeBest').textContent = state.bestStreak;\n    }\n\n    // Reaction Time Game\n    initReactionTime() {\n        this.gameStates.reaction = {\n            startTime: 0,\n            isWaiting: false,\n            isReady: false,\n            times: [],\n            bestTime: this.stats.reaction?.bestTime || null\n        };\n\n        const area = document.getElementById('reactionArea');\n        const text = document.getElementById('reactionText');\n\n        area.addEventListener('click', () => {\n            this.handleReactionClick();\n        });\n\n        document.getElementById('reactionStart').addEventListener('click', () => {\n            this.startReactionTest();\n        });\n\n        document.getElementById('reactionReset').addEventListener('click', () => {\n            this.resetReactionStats();\n        });\n\n        this.updateReactionUI();\n    }\n\n    startReactionTest() {\n        const state = this.gameStates.reaction;\n        const area = document.getElementById('reactionArea');\n        const text = document.getElementById('reactionText');\n\n        area.style.background = 'var(--accent-danger)';\n        text.innerHTML = '<h3>Wait...</h3><p>Get ready to click when it turns green!</p>';\n\n        state.isWaiting = true;\n        state.isReady = false;\n\n        // Random delay between 2-6 seconds\n        const delay = Math.random() * 4000 + 2000;\n\n        setTimeout(() => {\n            if (!state.isWaiting) return; // User clicked too early\n\n            area.style.background = 'var(--accent-success)';\n            text.innerHTML = '<h3>CLICK NOW!</h3>';\n            state.startTime = Date.now();\n            state.isReady = true;\n        }, delay);\n\n        this.playSound('click');\n    }\n\n    handleReactionClick() {\n        const state = this.gameStates.reaction;\n        const area = document.getElementById('reactionArea');\n        const text = document.getElementById('reactionText');\n\n        if (state.isWaiting && !state.isReady) {\n            // Too early\n            area.style.background = 'var(--bg-secondary)';\n            text.innerHTML = '<h3>Too Early!</h3><p>Click "Start Test" to try again</p>';\n            state.isWaiting = false;\n            this.playSound('error');\n            return;\n        }\n\n        if (state.isReady) {\n            // Calculate reaction time\n            const reactionTime = Date.now() - state.startTime;\n            state.times.push(reactionTime);\n\n            // Update best time\n            if (!state.bestTime || reactionTime < state.bestTime) {\n                state.bestTime = reactionTime;\n            }\n\n            area.style.background = 'var(--bg-secondary)';\n            text.innerHTML = `<h3>${reactionTime}ms</h3><p>Click "Start Test" to try again</p>`;\n\n            state.isWaiting = false;\n            state.isReady = false;\n\n            this.updateReactionUI();\n            this.addStat('reaction', true, reactionTime);\n            this.playSound('success');\n\n            if (reactionTime < 200) {\n                this.showToast('🚀 Lightning fast reflexes!', 'success');\n            } else if (reactionTime < 300) {\n                this.showToast('⚡ Great reaction time!', 'success');\n            }\n        }\n    }\n\n    updateReactionUI() {\n        const state = this.gameStates.reaction;\n        const lastTime = state.times[state.times.length - 1] || 0;\n        const average = state.times.length > 0\n            ? Math.round(state.times.reduce((a, b) => a + b, 0) / state.times.length)\n            : 0;\n\n        document.getElementById('reactionTime').textContent = `${lastTime}ms`;\n        document.getElementById('reactionAverage').textContent = `${average}ms`;\n        document.getElementById('reactionBest').textContent = state.bestTime ? `${state.bestTime}ms` : '-';\n    }\n\n    resetReactionStats() {\n        this.gameStates.reaction.times = [];\n        this.gameStates.reaction.bestTime = null;\n        this.updateReactionUI();\n        this.playSound('click');\n        this.showToast('Reaction time stats reset!', 'success');\n    }\n\n    // Mastermind Game
    initMastermind() {
        this.gameStates.mastermind = {
            isPlaying: false,
            secretCode: [],
            attempts: [],
            maxAttempts: 10,
            pegs: 4,
            colors: 6,
            mode: 'player_guess', // 'player_guess' or 'pc_guess'
            currentGuess: [],
            setupGuess: [], // used when the player sets the code for the PC
            availableColors: ['#ff3b30', '#34c759', '#007aff', '#ffcc00', '#5856d6', '#ff9500', '#ff2d55', '#5ac8fa']
        };

        // UI Listeners
        document.getElementById('mmNewGame').addEventListener('click', () => this.resetMastermindToSettings());
        
        document.getElementById('mmApplySettings').addEventListener('click', () => this.applyMastermindSettings());

        document.getElementById('mmPegs').addEventListener('change', (e) => {
            this.gameStates.mastermind.pegs = parseInt(e.target.value);
        });

        document.getElementById('mmColors').addEventListener('change', (e) => {
            this.gameStates.mastermind.colors = parseInt(e.target.value);
        });

        document.getElementById('mmMode').addEventListener('change', (e) => {
            this.gameStates.mastermind.mode = e.target.value;
        });

        // Current guess and Setup pegs removal
        const handlePegRemoval = (e, isSetup) => {
            const peg = e.target.closest('.color-peg');
            const state = this.gameStates.mastermind;
            if (peg && state.isPlaying) {
                const index = parseInt(peg.dataset.index);
                if (isSetup && state.mode === 'pc_guess' && document.getElementById('mmConfirmSetup').disabled === false) {
                    state.setupGuess.splice(index, 1);
                    this.renderMastermindCurrentRow(true);
                } else if (!isSetup && state.mode === 'player_guess') {
                    state.currentGuess.splice(index, 1);
                    this.renderMastermindCurrentRow(false);
                }
            }
        };

        document.getElementById('mmCurrentRow').addEventListener('click', (e) => handlePegRemoval(e, false));
        document.getElementById('mmSetupRow').addEventListener('click', (e) => handlePegRemoval(e, true));

        // Submit Guess
        document.getElementById('mmSubmit').addEventListener('click', () => {
            if (this.gameStates.mastermind.isPlaying) {
                this.submitMastermindGuess();
            }
        });
        
        // Confirm Setup (for PC Guess Mode)
        document.getElementById('mmConfirmSetup').addEventListener('click', () => {
             const state = this.gameStates.mastermind;
             state.secretCode = [...state.setupGuess];
             
             document.getElementById('mmSetupSecret').style.display = 'none';
             document.getElementById('mmControlsArea').style.display = 'none';
             this.showToast('Código definido! O PC começará a decifrar.', 'info');
             this.playSound('click');
             
             this.startPCDeciphers();
        });

        // Palette click
        document.getElementById('mmPalette').addEventListener('click', (e) => {
            const peg = e.target.closest('.color-peg');
            const state = this.gameStates.mastermind;
            
            if (peg && state.isPlaying) {
                const colorIdx = parseInt(peg.dataset.colorIdx);
                
                if (state.mode === 'player_guess') {
                    this.addMastermindColor(colorIdx, false);
                } else if (state.mode === 'pc_guess' && document.getElementById('mmSetupSecret').style.display !== 'none') {
                    this.addMastermindColor(colorIdx, true);
                }
            }
        });
    }
    
    resetMastermindToSettings() {
        const state = this.gameStates.mastermind;
        state.isPlaying = false;
        
        document.querySelector('.mm-settings').style.display = 'flex';
        document.getElementById('mmBoard').innerHTML = '';
        document.getElementById('mmControlsArea').style.display = 'none';
        document.getElementById('mmSecretReveal').style.display = 'none';
        document.getElementById('mmSetupSecret').style.display = 'none';
        
        document.getElementById('mmTurn').textContent = '1';
        document.getElementById('mmWins').textContent = '0'; // We dont reset wins, but this puts default if not loaded
        this.updateMastermindStatsUI();
        this.playSound('click');
    }

    applyMastermindSettings() {
        const state = this.gameStates.mastermind;
        state.isPlaying = true;
        state.attempts = [];
        state.currentGuess = [];
        state.setupGuess = [];
        
        // Hide settings
        document.querySelector('.mm-settings').style.display = 'none';
        document.getElementById('mmSecretReveal').style.display = 'none';
        document.getElementById('mmBoard').innerHTML = '';
        
        document.getElementById('mmMaxTurns').textContent = state.maxAttempts;
        document.getElementById('mmTurn').textContent = '1';
        this.updateMastermindStatsUI();

        this.renderMastermindPalette();

        if (state.mode === 'player_guess') {
            document.getElementById('mmControlsArea').style.display = 'flex';
            document.getElementById('mmSetupSecret').style.display = 'none';
            this.renderMastermindCurrentRow(false);
            this.generateMastermindSecretCode();
            this.showToast('Jogo Iniciado! Decifre o código.', 'success');
        } else {
            // PC Deciphers mode
            document.getElementById('mmSetupSecret').style.display = 'flex';
            document.getElementById('mmControlsArea').style.display = 'flex'; // show palette
            document.getElementById('mmCurrentRow').style.display = 'none'; // hide normal row
            document.getElementById('mmSubmit').style.display = 'none';
            this.renderMastermindCurrentRow(true);
            this.showToast('Crie a senha para o PC.', 'info');
        }

        this.playSound('click');
    }

    renderMastermindPalette() {
        const palette = document.getElementById('mmPalette');
        palette.innerHTML = '';
        const state = this.gameStates.mastermind;
        
        for (let i = 0; i < state.colors; i++) {
            const color = state.availableColors[i];
            const peg = document.createElement('div');
            peg.className = 'color-peg interactive';
            peg.style.backgroundColor = color;
            peg.dataset.colorIdx = i;
            palette.appendChild(peg);
        }
    }
    
    renderMastermindCurrentRow(isSetup = false) {
        const state = this.gameStates.mastermind;
        const rowId = isSetup ? 'mmSetupRow' : 'mmCurrentRow';
        const currentRow = document.getElementById(rowId);
        currentRow.innerHTML = '';
        
        const guessArray = isSetup ? state.setupGuess : state.currentGuess;
        
        for (let i = 0; i < state.pegs; i++) {
            const peg = document.createElement('div');
            peg.className = 'color-peg';
            if (i < guessArray.length) {
                peg.style.backgroundColor = state.availableColors[guessArray[i]];
                peg.className += ' interactive'; // allow clicking to remove
                peg.dataset.index = i;
            } else {
                peg.classList.add('empty');
            }
            currentRow.appendChild(peg);
        }
        
        if (isSetup) {
            document.getElementById('mmConfirmSetup').disabled = guessArray.length < state.pegs;
        } else {
            document.getElementById('mmSubmit').disabled = guessArray.length < state.pegs;
        }
    }
    
    addMastermindColor(colorIdx, isSetup) {
        const state = this.gameStates.mastermind;
        const guessArray = isSetup ? state.setupGuess : state.currentGuess;
        
        if (guessArray.length < state.pegs) {
            guessArray.push(colorIdx);
            this.renderMastermindCurrentRow(isSetup);
            this.playSound('click');
        }
    }

    generateMastermindSecretCode() {
        const state = this.gameStates.mastermind;
        state.secretCode = [];
        for (let i = 0; i < state.pegs; i++) {
            state.secretCode.push(Math.floor(Math.random() * state.colors));
        }
        console.log("Secret Code Generado:", state.secretCode);
    }
    
    startPCDeciphers() {
        // Here we initiate the PC attempt to guess
        const state = this.gameStates.mastermind;
        // Basic heuristic: Keep known correct colors, vary others
        this.runPCDecipherLogic();
    }

    submitMastermindGuess() {
        const state = this.gameStates.mastermind;
        if (!state.isPlaying || state.currentGuess.length < state.pegs) return;

        let guess = [...state.currentGuess];
        const feedback = this.evaluateMastermindGuess(guess, state.secretCode);

        state.attempts.push({ guess: guess, feedback: feedback });
        this.renderMastermindRow(guess, feedback);
        
        // Reset current guess
        state.currentGuess = [];
        this.renderMastermindCurrentRow(false);

        if (feedback.black === state.pegs) {
            this.endMastermindGame(true);
        } else if (state.attempts.length >= state.maxAttempts) {
            this.endMastermindGame(false);
        } else {
            document.getElementById('mmTurn').textContent = state.attempts.length + 1;
            this.playSound('click');
        }
    }

    evaluateMastermindGuess(guess, secret) {
        let black = 0;
        let white = 0;
        let guessCopy = [...guess];
        let secretCopy = [...secret];

        // Check exact matches (Black pegs)
        for (let i = guessCopy.length - 1; i >= 0; i--) {
            if (guessCopy[i] === secretCopy[i]) {
                black++;
                guessCopy.splice(i, 1);
                secretCopy.splice(i, 1);
            }
        }

        // Check color matches (White pegs)
        for (let i = 0; i < guessCopy.length; i++) {
            const indexMatch = secretCopy.indexOf(guessCopy[i]);
            if (indexMatch !== -1) {
                white++;
                secretCopy.splice(indexMatch, 1);
            }
        }

        return { black, white };
    }

    renderMastermindRow(guess, feedback) {
        const board = document.getElementById('mmBoard');
        const state = this.gameStates.mastermind;
        const row = document.createElement('div');
        row.className = 'mm-row';

        const guessContainer = document.createElement('div');
        guessContainer.style.display = 'flex';
        guessContainer.style.gap = '0.5rem';

        guess.forEach(colorIdx => {
            const peg = document.createElement('div');
            peg.className = 'color-peg';
            peg.style.backgroundColor = state.availableColors[colorIdx];
            guessContainer.appendChild(peg);
        });

        const feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'mm-feedback';

        for (let i = 0; i < feedback.black; i++) {
            const fp = document.createElement('div');
            fp.className = 'mm-fb-peg black';
            feedbackContainer.appendChild(fp);
        }
        for (let i = 0; i < feedback.white; i++) {
            const fp = document.createElement('div');
            fp.className = 'mm-fb-peg white';
            feedbackContainer.appendChild(fp);
        }
        for (let i = 0; i < state.pegs - feedback.black - feedback.white; i++) {
            const fp = document.createElement('div');
            fp.className = 'mm-fb-peg'; // empty feedback
            feedbackContainer.appendChild(fp);
        }

        row.appendChild(guessContainer);
        row.appendChild(feedbackContainer);
        board.appendChild(row);
        board.scrollTop = board.scrollHeight;
    }

    endMastermindGame(isWin) {
        const state = this.gameStates.mastermind;
        state.isPlaying = false;
        
        document.getElementById('mmControlsArea').style.display = 'none';

        if (isWin) {
            this.showToast(`Vitória! Você decifrou em ${state.attempts.length} tentativas.`, 'success');
            this.playSound('success');
            document.getElementById('mmBoard').lastChild.classList.add('win-pulse');
            
            if (state.mode === 'player_guess') {
                this.addStat('mastermind', true, { attempts: state.attempts.length });
                this.updateMastermindStatsUI();
            }
        } else {
            this.showToast('Derrota! Fim de jogo.', 'error');
            this.playSound('error');
            if (state.mode === 'player_guess') {
                this.addStat('mastermind', false);
            }
        }
        
        this.revealMastermindSecret();
    }
    
    revealMastermindSecret() {
        const state = this.gameStates.mastermind;
        document.getElementById('mmSecretReveal').style.display = 'block';
        const secretRow = document.getElementById('mmSecretRow');
        secretRow.innerHTML = '';
        
        state.secretCode.forEach(colorIdx => {
            const peg = document.createElement('div');
            peg.className = 'color-peg';
            peg.style.backgroundColor = state.availableColors[colorIdx];
            secretRow.appendChild(peg);
        });
    }
    
    runPCDecipherLogic() {
        const state = this.gameStates.mastermind;
        if (!state.isPlaying) return;

        // Basic heuristic: completely random for now (or improve for better "AI" feel) -- this is a simple AI
        let guess = [];
        if (state.attempts.length === 0) {
            // First guess is randomized colors (like 0,1,2,3 or random)
            for(let i=0; i < state.pegs; i++) {
                guess.push(Math.floor(Math.random() * state.colors));
            }
        } else {
             // To make it a bit realistic without full minimax: just guess completely random till it matches feedback.
             // Warning: naive random might take > 1000 tries.
             let possibleGuesses = [];
             for(let i=0; i<1000; i++) {
                 let rndGuess = [];
                 for(let j=0; j<state.pegs; j++) rndGuess.push(Math.floor(Math.random() * state.colors));
                 
                 // check if this guess aligns with previous feedbacks
                 let isValid = true;
                 for (let att of state.attempts) {
                     const fb = this.evaluateMastermindGuess(rndGuess, att.guess);
                     if (fb.black !== att.feedback.black || fb.white !== att.feedback.white) {
                         isValid = false; break;
                     }
                 }
                 if(isValid) {
                     guess = rndGuess;
                     break;
                 }
             }
             if (guess.length === 0) {
                 // fallback just in case
                 for(let i=0; i < state.pegs; i++) guess.push(Math.floor(Math.random() * state.colors));
             }
        }
        
        const feedback = this.evaluateMastermindGuess(guess, state.secretCode);
        state.attempts.push({ guess: guess, feedback: feedback });
        this.renderMastermindRow(guess, feedback);
        document.getElementById('mmTurn').textContent = state.attempts.length + 1;

        if (feedback.black === state.pegs) {
            // PC won
            this.showToast(`O PC decifrou seu código em ${state.attempts.length} turnos!`, 'info');
            this.playSound('success');
            state.isPlaying = false;
            this.revealMastermindSecret();
        } else if (state.attempts.length >= state.maxAttempts) {
            // PC lost
            this.showToast('Você vendeu o PC! O PC não conseguiu decifrar.', 'success');
            this.playSound('success');
            state.isPlaying = false;
            this.revealMastermindSecret();
        } else {
            // next turn
            setTimeout(() => {
                this.runPCDecipherLogic();
                this.playSound('click');
            }, 1000); // 1 sec delay per turn
        }
    }
    
    updateMastermindStatsUI() {
        if (!this.stats || !this.stats.games) return;
        const mmStats = this.stats.games.mastermind;
        document.getElementById('mmWins').textContent = mmStats.won || 0;
        document.getElementById('mmBest').textContent = mmStats.bestAttempts || '-';
    }

\n    // Statistics and Data Management\n    loadStats() {\n        const saved = localStorage.getItem('logicGamesStats');\n        return saved ? JSON.parse(saved) : {\n            totalGames: 0,\n            totalWins: 0,\n            currentStreak: 0,\n            bestStreak: 0,\n            playTime: 0,\n            games: {\n                numberGuess: { played: 0, won: 0, bestAttempts: null },\n                memory: { played: 0, won: 0, bestTime: null, bestMoves: null },\n                oddEven: { played: 0, bestStreak: 0 },\n                reaction: { played: 0, bestTime: null, averageTime: null },\n                mastermind: { played: 0, won: 0, bestAttempts: null }\n            }\n        };\n    }\n\n    saveStats() {\n        localStorage.setItem('logicGamesStats', JSON.stringify(this.stats));\n    }\n\n    loadSettings() {\n        const saved = localStorage.getItem('logicGamesSettings');\n        return saved ? JSON.parse(saved) : {\n            theme: 'dark',\n            soundEnabled: true,\n            language: 'en'\n        };\n    }\n\n    saveSettings() {\n        localStorage.setItem('logicGamesSettings', JSON.stringify(this.settings));\n    }\n\n    loadAchievements() {\n        const saved = localStorage.getItem('logicGamesAchievements');\n        return saved ? JSON.parse(saved) : [];\n    }\n\n    saveAchievements() {\n        localStorage.setItem('logicGamesAchievements', JSON.stringify(this.achievements));\n    }\n\n    addStat(game, won, data = null) {\n        this.stats.totalGames++;\n        this.stats.games[game].played++;\n\n        if (won) {\n            this.stats.totalWins++;\n            this.stats.games[game].won++;\n            this.stats.currentStreak++;\n            if (this.stats.currentStreak > this.stats.bestStreak) {\n                this.stats.bestStreak = this.stats.currentStreak;\n            }\n        } else {\n            this.stats.currentStreak = 0;\n        }\n\n        // Game-specific stat updates\n        switch (game) {\n            case 'numberGuess':\n                if (won && (this.stats.games[game].bestAttempts === null || data < this.stats.games[game].bestAttempts)) {\n                    this.stats.games[game].bestAttempts = data;\n                }\n                break;\n            case 'memory':\n                if (won) {\n                    if (this.stats.games[game].bestTime === null || data.time < this.stats.games[game].bestTime) {\n                        this.stats.games[game].bestTime = data.time;\n                    }\n                    if (this.stats.games[game].bestMoves === null || data.moves < this.stats.games[game].bestMoves) {\n                        this.stats.games[game].bestMoves = data.moves;\n                    }\n                }\n                break;\n            case 'reaction':\n                if (this.stats.games[game].bestTime === null || data < this.stats.games[game].bestTime) {\n                    this.stats.games[game].bestTime = data;\n                }\n                break;\n            case 'oddEven':\n                if (data > this.stats.games[game].bestStreak) {\n                    this.stats.games[game].bestStreak = data;\n                }\n                break;\n        }\n\n        this.saveStats();\n        this.updateStats();\n    }\n\n    updateStats() {\n        const winRate = this.stats.totalGames > 0\n            ? Math.round((this.stats.totalWins / this.stats.totalGames) * 100)\n            : 0;\n\n        // Sidebar stats\n        document.getElementById('totalGames').textContent = this.stats.totalGames;\n        document.getElementById('winRate').textContent = `${winRate}%`;\n        document.getElementById('bestStreak').textContent = this.stats.bestStreak;\n        document.getElementById('achievements').textContent = this.achievements.length;\n\n        // Game-specific best scores\n        const numberGuessGame = this.stats.games.numberGuess;\n        if (numberGuessGame.bestAttempts) {\n            document.getElementById('guessBest').textContent = numberGuessGame.bestAttempts;\n        }\n    }\n\n    updateDashboard() {\n        document.getElementById('dashTotalGames').textContent = this.stats.totalGames;\n        document.getElementById('dashWins').textContent = this.stats.totalWins;\n        document.getElementById('dashStreak').textContent = this.stats.currentStreak;\n        document.getElementById('dashTime').textContent = Math.round(this.stats.playTime / 60000); // Convert to minutes\n\n        this.updateRecentAchievements();\n    }\n\n    checkAchievements(game, data) {\n        const newAchievements = [];\n\n        switch (game) {\n            case 'numberGuess':\n                if (data <= 3 && !this.achievements.find(a => a.id === 'lucky_guess')) {\n                    newAchievements.push({\n                        id: 'lucky_guess',\n                        title: '🍀 Lucky Guess',\n                        description: 'Guessed the number in 3 attempts or less',\n                        date: new Date().toISOString()\n                    });\n                }\n                break;\n            case 'memory':\n                if (data.moves <= 16 && !this.achievements.find(a => a.id === 'memory_master')) {\n                    newAchievements.push({\n                        id: 'memory_master',\n                        title: '🧠 Memory Master',\n                        description: 'Completed memory game in 16 moves or less',\n                        date: new Date().toISOString()\n                    });\n                }\n                if (data.time <= 60 && !this.achievements.find(a => a.id === 'speed_demon')) {\n                    newAchievements.push({\n                        id: 'speed_demon',\n                        title: '⚡ Speed Demon',\n                        description: 'Completed memory game in under 60 seconds',\n                        date: new Date().toISOString()\n                    });\n                }\n                break;\n            case 'reaction':\n                if (data < 200 && !this.achievements.find(a => a.id === 'lightning_reflexes')) {\n                    newAchievements.push({\n                        id: 'lightning_reflexes',\n                        title: '🚀 Lightning Reflexes',\n                        description: 'Reaction time under 200ms',\n                        date: new Date().toISOString()\n                    });\n                }\n                break;\n        }\n\n        // General achievements\n        if (this.stats.totalGames >= 10 && !this.achievements.find(a => a.id === 'dedicated_player')) {\n            newAchievements.push({\n                id: 'dedicated_player',\n                title: '🎮 Dedicated Player',\n                description: 'Played 10 games',\n                date: new Date().toISOString()\n            });\n        }\n\n        if (this.stats.bestStreak >= 5 && !this.achievements.find(a => a.id === 'streak_master')) {\n            newAchievements.push({\n                id: 'streak_master',\n                title: '🔥 Streak Master',\n                description: 'Won 5 games in a row',\n                date: new Date().toISOString()\n            });\n        }\n\n        // Add new achievements\n        newAchievements.forEach(achievement => {\n            this.achievements.push(achievement);\n            this.showToast(`🏆 Achievement Unlocked: ${achievement.title}`, 'success', 5000);\n        });\n\n        if (newAchievements.length > 0) {\n            this.saveAchievements();\n            this.updateStats();\n        }\n    }\n\n    updateRecentAchievements() {\n        const container = document.getElementById('recentAchievements');\n\n        if (this.achievements.length === 0) {\n            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">Play games to unlock achievements!</p>';\n            return;\n        }\n\n        const recent = this.achievements.slice(-5).reverse();\n        container.innerHTML = recent.map(achievement => `\n            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--surface); border-radius: var(--border-radius); margin-bottom: 0.5rem;">\n                <div style="font-size: 2rem;">${achievement.title.split(' ')[0]}</div>\n                <div>\n                    <div style="font-weight: 600;">${achievement.title.substring(2)}</div>\n                    <div style="color: var(--text-muted); font-size: 0.875rem;">${achievement.description}</div>\n                </div>\n                <div style="margin-left: auto; color: var(--text-muted); font-size: 0.75rem;">\n                    ${new Date(achievement.date).toLocaleDateString()}\n                </div>\n            </div>\n        `).join('');\n    }\n\n    // UI Controls\n    toggleTheme() {\n        this.settings.theme = this.settings.theme === 'dark' ? 'light' : 'dark';\n        this.applyTheme();\n        this.saveSettings();\n        this.playSound('click');\n    }\n\n    applyTheme() {\n        document.documentElement.setAttribute('data-theme', this.settings.theme);\n        const themeToggle = document.getElementById('themeToggle');\n        themeToggle.textContent = this.settings.theme === 'dark' ? '☀️' : '🌙';\n    }\n\n    toggleSound() {\n        this.settings.soundEnabled = !this.settings.soundEnabled;\n        this.applySoundSetting();\n        this.saveSettings();\n        this.playSound('click');\n    }\n\n    applySoundSetting() {\n        const soundToggle = document.getElementById('soundToggle');\n        soundToggle.textContent = this.settings.soundEnabled ? '🔊' : '🔇';\n\n        if (this.settings.soundEnabled && !this.audioContext) {\n            this.initAudio();\n        }\n    }\n\n    toggleFullscreen() {\n        if (!document.fullscreenElement) {\n            document.documentElement.requestFullscreen().catch(err => {\n                console.log(`Error attempting to enable fullscreen: ${err.message}`);\n            });\n        } else {\n            document.exitFullscreen();\n        }\n        this.playSound('click');\n    }\n\n    showToast(message, type = 'success', duration = 3000) {\n        const container = document.getElementById('toastContainer');\n        const toast = document.createElement('div');\n        toast.className = `toast ${type}`;\n        toast.textContent = message;\n\n        container.appendChild(toast);\n\n        // Auto remove\n        setTimeout(() => {\n            toast.remove();\n        }, duration);\n\n        // Remove on click\n        toast.addEventListener('click', () => {\n            toast.remove();\n        });\n    }\n}\n\n// Initialize the application\ndocument.addEventListener('DOMContentLoaded', () => {\n    window.gamesSuite = new LogicGamesSuite();\n\n    // Initialize RNG separately since it's simpler\n    let rngHistory = [];\n\n    document.getElementById('rngGenerate').addEventListener('click', () => {\n        const min = parseInt(document.getElementById('rngMin').value) || 1;\n        const max = parseInt(document.getElementById('rngMax').value) || 100;\n\n        if (min >= max) {\n            window.gamesSuite.showToast('Minimum must be less than maximum!', 'error');\n            return;\n        }\n\n        const result = Math.floor(Math.random() * (max - min + 1)) + min;\n        document.getElementById('rngResult').textContent = result;\n\n        rngHistory.unshift({\n            number: result,\n            range: `${min}-${max}`,\n            time: new Date().toLocaleTimeString()\n        });\n        if (rngHistory.length > 10) rngHistory.pop();\n\n        updateRNGHistory(rngHistory);\n        window.gamesSuite.playSound('success');\n    });\n\n    function updateRNGHistory(history) {\n        const historyEl = document.getElementById('rngHistory');\n        if (history.length === 0) {\n            historyEl.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No numbers generated yet</p>';\n            return;\n        }\n\n        historyEl.innerHTML = history.map(item =>\n            `<div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);">\n                <span style="font-weight: 600; color: var(--accent-primary);">${item.number}</span>\n                <span style="color: var(--text-muted); font-size: 0.875rem;">${item.range} • ${item.time}</span>\n            </div>`\n        ).join('');\n    }\n});