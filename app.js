// Navegação entre jogos
const menuBtns = document.querySelectorAll('.menu-btn');
const gameSections = document.querySelectorAll('.game-section');

menuBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        menuBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const game = btn.getAttribute('data-game');
        gameSections.forEach(sec => sec.classList.remove('active'));
        document.getElementById('game-' + game).classList.add('active');
    });
});

// --- Sorteador de Números ---
function renderSorteador() {
    document.getElementById('game-sorteador').innerHTML = `
        <h1>Sorteador <span class="container__texto-azul">de Números</span></h1>
        <div class="input-group">
            <label class="input-label">Quantidade de números</label>
            <input class="input-field" id="quantidade" type="number" min="1">
            <label class="input-label">Do número</label>
            <input class="input-field" id="de" type="number" min="1">
            <label class="input-label">Até o número</label>
            <input class="input-field" id="ate" type="number" min="1">
        </div>
        <div class="btn-group">
            <button class="btn" id="btn-sortear">Sortear</button>
            <button class="btn" id="btn-reiniciar" disabled>Reiniciar</button>
        </div>
        <div class="result-area" id="resultado">Números sorteados: nenhum até agora</div>
    `;
    document.getElementById('btn-sortear').onclick = sortear;
    document.getElementById('btn-reiniciar').onclick = reiniciar;
}

function sortear() {
    let quantidade = parseInt(document.getElementById('quantidade').value);
    let de = parseInt(document.getElementById('de').value);
    let ate = parseInt(document.getElementById('ate').value);
    let resultado = document.getElementById('resultado');
    let btnReiniciar = document.getElementById('btn-reiniciar');

    if (isNaN(quantidade) || isNaN(de) || isNaN(ate)) {
        resultado.textContent = 'Preencha todos os campos corretamente!';
        return;
    }
    if (de >= ate) {
        resultado.textContent = 'O campo "Do número" deve ser menor que "Até o número".';
        return;
    }
    if (quantidade > (ate - de + 1)) {
        resultado.textContent = 'A quantidade deve ser menor ou igual ao intervalo.';
        return;
    }

    let sorteados = [];
    while (sorteados.length < quantidade) {
        let numero = obterNumeroAleatorio(de, ate);
        if (!sorteados.includes(numero)) sorteados.push(numero);
    }
    sorteados.sort((a, b) => a - b);
    resultado.innerHTML = `Números sorteados: <b>${sorteados.join(', ')}</b>`;
    btnReiniciar.disabled = false;
}

function obterNumeroAleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function reiniciar() {
    document.getElementById('quantidade').value = '';
    document.getElementById('de').value = '';
    document.getElementById('ate').value = '';
    document.getElementById('resultado').textContent = 'Números sorteados: nenhum até agora';
    document.getElementById('btn-reiniciar').disabled = true;
}

// --- Adivinhação ---
function renderAdivinhacao() {
    document.getElementById('game-adivinhacao').innerHTML = `
        <h1>Adivinhação</h1>
        <div class="input-group">
            <label class="input-label">Escolha um intervalo</label>
            <input class="input-field" id="adivinha-de" type="number" placeholder="De" min="1">
            <input class="input-field" id="adivinha-ate" type="number" placeholder="Até" min="1">
        </div>
        <div class="btn-group">
            <button class="btn" id="btn-iniciar-adivinha">Iniciar</button>
        </div>
        <div class="result-area" id="adivinha-resultado">Tente adivinhar o número!</div>
    `;
    document.getElementById('btn-iniciar-adivinha').onclick = iniciarAdivinhacao;
}

// --- Par ou Ímpar ---
function renderParImpar() {
    document.getElementById('game-parimpar').innerHTML = `
        <h1>Par ou Ímpar</h1>
        <div class="input-group">
            <label class="input-label">Escolha:</label>
            <div class="btn-group">
                <button class="btn" id="btn-par">Par</button>
                <button class="btn" id="btn-impar">Ímpar</button>
            </div>
        </div>
        <div class="result-area" id="parimpar-resultado">Escolha par ou ímpar para jogar!</div>
    `;
    document.getElementById('btn-par').onclick = () => jogarParImpar('par');
    document.getElementById('btn-impar').onclick = () => jogarParImpar('impar');
}

// --- Roleta ---
function renderRoleta() {
    document.getElementById('game-roleta').innerHTML = `
        <h1>Roleta</h1>
        <div class="btn-group">
            <button class="btn" id="btn-girar-roleta">Girar Roleta</button>
        </div>
        <div class="result-area" id="roleta-resultado">Gire a roleta para um número aleatório!</div>
    `;
    document.getElementById('btn-girar-roleta').onclick = girarRoleta;
}

// Inicialização dos jogos
renderSorteador();
renderAdivinhacao();
renderParImpar();
renderRoleta();
renderVinteUm();

// --- Lógica completa dos jogos ---

// Adivinhação
let numeroAdivinha = null;
let tentativasAdivinha = 0;
function iniciarAdivinhacao() {
    const de = parseInt(document.getElementById('adivinha-de').value);
    const ate = parseInt(document.getElementById('adivinha-ate').value);
    const resultado = document.getElementById('adivinha-resultado');
    if (isNaN(de) || isNaN(ate) || de >= ate) {
        resultado.textContent = 'Preencha o intervalo corretamente!';
        return;
    }
    numeroAdivinha = obterNumeroAleatorio(de, ate);
    tentativasAdivinha = 0;
    resultado.innerHTML = `Tente adivinhar o número entre <b>${de}</b> e <b>${ate}</b>!<br><input class="input-field" id="adivinha-chute" type="number" placeholder="Seu palpite"><button class="btn" id="btn-chutar">Chutar</button> <button class="btn" id="btn-reiniciar-adivinha">Reiniciar</button><div id="adivinha-feedback"></div>`;
    document.getElementById('btn-chutar').onclick = chutarAdivinhacao;
    document.getElementById('btn-reiniciar-adivinha').onclick = renderAdivinhacao;
}
function chutarAdivinhacao() {
    const chute = parseInt(document.getElementById('adivinha-chute').value);
    const feedback = document.getElementById('adivinha-feedback');
    tentativasAdivinha++;
    if (isNaN(chute)) {
        feedback.textContent = 'Digite um número válido!';
        return;
    }
    if (chute === numeroAdivinha) {
        feedback.innerHTML = `<b>Parabéns! Você acertou em ${tentativasAdivinha} tentativa(s)!</b>`;
        document.getElementById('btn-chutar').disabled = true;
    } else if (chute < numeroAdivinha) {
        feedback.textContent = 'Tente um número maior!';
    } else {
        feedback.textContent = 'Tente um número menor!';
    }
}

// Par ou Ímpar
function jogarParImpar(escolha) {
    const resultado = document.getElementById('parimpar-resultado');
    resultado.innerHTML = `
        <div class="input-group">
            <label class="input-label">Escolha um número de 0 a 10:</label>
            <input class="input-field" id="parimpar-num" type="number" min="0" max="10">
        </div>
        <div class="btn-group">
            <button class="btn" id="btn-jogar-parimpar">Jogar</button>
            <button class="btn" id="btn-reiniciar-parimpar">Reiniciar</button>
        </div>
        <div id="parimpar-feedback"></div>
    `;
    document.getElementById('btn-jogar-parimpar').onclick = () => executarParImpar(escolha);
    document.getElementById('btn-reiniciar-parimpar').onclick = renderParImpar;
}
function executarParImpar(escolha) {
    const numUser = parseInt(document.getElementById('parimpar-num').value);
    const numPC = obterNumeroAleatorio(0, 10);
    const soma = numUser + numPC;
    const paridade = soma % 2 === 0 ? 'par' : 'impar';
    let msg = `<b>Você escolheu ${escolha.toUpperCase()}.</b><br>Seu número: <b>${numUser}</b> | Número do sistema: <b>${numPC}</b><br>Soma: <b>${soma}</b> (${paridade.toUpperCase()})<br>`;
    if (escolha === paridade) {
        msg += '<span style="color:#2ecc40">Você venceu! 🎉</span>';
    } else {
        msg += '<span style="color:#e74c3c">Você perdeu!</span>';
    }
    document.getElementById('parimpar-feedback').innerHTML = msg;
    document.getElementById('btn-jogar-parimpar').disabled = true;
}

// Roleta
function girarRoleta() {
    const resultado = document.getElementById('roleta-resultado');
    const numero = obterNumeroAleatorio(1, 10);
    const frases = [
        'Hoje é seu dia de sorte?',
        'Tente novamente!',
        'Quase lá!',
        'Você é sortudo!',
        'A roleta girou forte!',
        'O universo sorriu pra você!',
        'Mais uma vez?',
        'A sorte está lançada!',
        'Incrível!',
        'Continue tentando!'
    ];
    const frase = frases[obterNumeroAleatorio(0, frases.length - 1)];
    resultado.innerHTML = `<b>Número sorteado: ${numero}</b><br>${frase}<br><button class="btn" id="btn-girar-novamente">Girar novamente</button>`;
    document.getElementById('btn-girar-novamente').onclick = girarRoleta;
}

// --- Jogo do 21 (Blackjack simplificado) ---
let maoUsuario21 = [];
let maoPC21 = [];
let fim21 = false;
function renderVinteUm() {
    document.getElementById('game-vinteum').innerHTML = `
        <h1>Jogo do 21</h1>
        <div class="result-area" id="vinteum-area">
            <button class="btn" id="btn-iniciar-21">Iniciar Jogo</button>
        </div>
    `;
    document.getElementById('btn-iniciar-21').onclick = iniciar21;
}
function iniciar21() {
    maoUsuario21 = [carta21(), carta21()];
    maoPC21 = [carta21(), carta21()];
    fim21 = false;
    atualizar21();
}
function carta21() {
    return obterNumeroAleatorio(1, 11);
}
function soma21(mao) {
    return mao.reduce((a, b) => a + b, 0);
}
function atualizar21(msg = '') {
    const area = document.getElementById('vinteum-area');
    const somaUser = soma21(maoUsuario21);
    area.innerHTML = `
        Suas cartas: <b>${maoUsuario21.join(', ')}</b> (Total: <b>${somaUser}</b>)<br>
        <button class="btn" id="btn-pedir-21" ${fim21 ? 'disabled' : ''}>Pedir carta</button>
        <button class="btn" id="btn-parar-21" ${fim21 ? 'disabled' : ''}>Parar</button>
        <button class="btn" id="btn-reiniciar-21">Reiniciar</button>
        <div id="vinteum-feedback">${msg}</div>
    `;
    document.getElementById('btn-pedir-21').onclick = pedir21;
    document.getElementById('btn-parar-21').onclick = parar21;
    document.getElementById('btn-reiniciar-21').onclick = renderVinteUm;
    if (somaUser > 21) {
        fim21 = true;
        atualizar21('<span style="color:#e74c3c">Você estourou! Perdeu!</span>');
    }
}
function pedir21() {
    if (fim21) return;
    maoUsuario21.push(carta21());
    atualizar21();
}
function parar21() {
    fim21 = true;
    // PC joga
    while (soma21(maoPC21) < 17) {
        maoPC21.push(carta21());
    }
    const somaUser = soma21(maoUsuario21);
    const somaPC = soma21(maoPC21);
    let msg = `Cartas do sistema: <b>${maoPC21.join(', ')}</b> (Total: <b>${somaPC}</b>)<br>`;
    if (somaPC > 21 || somaUser > somaPC) {
        msg += '<span style="color:#2ecc40">Você venceu! 🎉</span>';
    } else if (somaUser === somaPC) {
        msg += 'Empate!';
    } else {
        msg += '<span style="color:#e74c3c">Você perdeu!</span>';
    }
    atualizar21(msg);
}

