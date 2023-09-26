const star = '⭐'
const bomb = '💣'
const explosion = '💥'

const webSocket = new WebSocket("ws://16.170.220.55:3500");

const player = { name: null, stars: 1 }

let gameState
let autoDecisionTimeoutId
let timerIntervalId
let registered = false
let timerMillis = 3000
let myPlayerDiv
let gameEnded = false
let choiceMadeAudio, goodDecisionAudio, badDecisionAudio

document.querySelector('#reset').style.display = 'none'
hideGameControls()

webSocket.onopen = () => {
    console.log('connected')
};



webSocket.onmessage = (event) => {
    console.log(event.data + "")
    updateGameState(event)
};

function loadAudio() {
    choiceMadeAudio = new Audio('choice-made.mp3')
    // badDecisionAudio = new Audio('bad-decision.mp3')
    // goodDecisionAudio = new Audio('good-decision.mp3')
}


function prepareAutoDecisionIfItsMyTurn() {
    if (autoDecisionTimeoutId) {
        clearTimeout(autoDecisionTimeoutId)
    }
    if (gameState.keeper !== player.name) {
        return
    }
    autoDecisionTimeoutId = setTimeout(() => {
        if (gameState.item === 'bomb') {
            keep()
        } else {
            pass()
        }
    }, timerMillis)
}

function updateGameState(event) {
    gameState = JSON.parse(event.data)
    renderPlayers()
    if (registered && gameState.players.length > 1) {
        renderResultsIfGameEnded()
        if (!gameEnded) {
            showGameControlsIfItsMyTurn()
            renderTimerIfItsMyTurn()
            prepareAutoDecisionIfItsMyTurn()
        }
    }

}

function hideGameControls() {
    document.querySelector('#pass').style.display = 'none'
    document.querySelector('#keep').style.display = 'none'
}

function showGameControlsIfItsMyTurn() {
    document.querySelector('#pass').style.display = gameState.keeper === player.name ? 'block' : 'none'
    document.querySelector('#keep').style.display = gameState.keeper === player.name ? 'block' : 'none'
    if(player.name && player.name.toLowerCase() === 'adnan') {
        document.querySelector('#reset').style.display = 'block'
    }

}

function showRegistrationControls() {
    document.querySelector('#name').style.display = 'block'
    document.querySelector('#register').style.display = 'block'
}

function hideRegistrationControls() {
    document.querySelector('#name').style.display = 'none'
    document.querySelector('#register').style.display = 'none'
}

document.querySelector('#register').addEventListener('click', () => {
    const name = document.querySelector('#name').value
    player.name = name
    const register = { action: 'register', player }
    registered = true
    webSocket.send(JSON.stringify(register))
    hideRegistrationControls()
    loadAudio()
})

document.querySelector('#pass').addEventListener('click', () => {
    pass()
})

document.querySelector('#keep').addEventListener('click', () => {
    keep()
})

document.querySelector('#reset').addEventListener('click', () => {
    restartGame()
})

function addStar() {
    // goodDecisionAudio.play()
    setTimeout(() => {
        player.stars++
        const updatePlayer = { action: 'updatePlayer', player }
        webSocket.send(JSON.stringify(updatePlayer))
    }, 1000)
}

function explodeAndRemoveStar() {
    myPlayerDiv.classList.remove('keeper-bomb')
    myPlayerDiv.classList.add('keeper-explosion')
    // badDecisionAudio.play()
    setTimeout(() => {
        player.stars--
        const updatePlayer = { action: 'updatePlayer', player }
        webSocket.send(JSON.stringify(updatePlayer))
    }, 1000)
}

function renderResultsIfGameEnded() {
    let allPlayers = gameState.players
    let remainingPlayers = gameState.players.filter((pl) => pl.stars > 0)
    let playersWith5Stars = gameState.players.filter((pl) => pl.stars >= 5)
    if (allPlayers.length > 1 && (remainingPlayers.length === 1 || playersWith5Stars.length === 1)) {
        gameEnded = true
        let winner = remainingPlayers[0]
        if (playersWith5Stars.length === 1) {
            winner = playersWith5Stars[0]
        }
        document.querySelector('#players').innerHTML = `<div id="winner">${winner.name} wins!</div>`
        stopTimer()
        document.querySelector('#reset').innerHTML = 'PLAY AGAIN'
        hideGameControls()
    }
}


function keep() {
    stopTimer()
    if (autoDecisionTimeoutId) {
        clearTimeout(autoDecisionTimeoutId)
    }
    choiceMadeAudio.play()
    setTimeout(() => {
        if (gameState.item === 'bomb') {
            explodeAndRemoveStar()
        } else {
            addStar()
        }
        pass(false)
    }, 1000)
}

function pass(withSound = true) {
    stopTimer()
    if (autoDecisionTimeoutId) {
        clearTimeout(autoDecisionTimeoutId)
    }
    if(withSound) {
        choiceMadeAudio.play()
    }
    setTimeout(() => {
        const pass = { action: 'pass', player }
        webSocket.send(JSON.stringify(pass))
    }, 1000)
}

function renderPlayers() {
    document.querySelector('#players').innerHTML = ''
    for (let pl of gameState.players) {
        let isKeeper = pl.name === gameState.keeper && gameState.keeper !== null
        let isDead = pl.stars === 0
        const name = pl.name === player.name ? 'You' : pl.name
        const stars = star.repeat(pl.stars)
        const div = document.createElement('div')
        if (player.name === pl.name) {
            myPlayerDiv = div
        }
        div.classList.add('player')
        if (isKeeper && !isDead) {
            div.classList.add('keeper')
            div.classList.add('keeper-' + gameState.item)
        }
        if (isDead) {
            div.classList.add('dead')
        }
        div.innerHTML = `<div>
        <div class='health'>${stars}</div>
        <div>${name}</div>
        </div>`
        document.querySelector('#players').appendChild(div)
    }
}


function renderTimerIfItsMyTurn() {
    if (timerIntervalId) {
        clearInterval(timerIntervalId)
    }
    if (gameState.keeper !== player.name) {
        document.querySelector('#timer').innerHTML = ''
        return
    }
    let ms = timerMillis
    document.querySelector('#timer').innerHTML = (ms/1000) + 's'
    timerIntervalId = setInterval(() => {
        ms -= 1000
        document.querySelector('#timer').innerHTML = (ms/1000) + 's'
    }, 1000)
}

function stopTimer() {
    if (timerIntervalId) {
        clearInterval(timerIntervalId)
    }
}

function restartGame() {
    gameEnded = false
    player.stars = 1
    player.name = null
    const reset = { action: 'reset' }
    webSocket.send(JSON.stringify(reset))
    setTimeout(() => {
        window.location.reload()
    }, 300)
}