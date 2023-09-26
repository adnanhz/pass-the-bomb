import { WebSocketServer, WebSocket } from 'ws';

let player = { name: 'sample', stars: 0 }
let initialGameState = {
    players: [],
    keeper: null,
    item: 'bomb', // or star
}
let gameState = {
    ...initialGameState
}


const wss = new WebSocketServer({ port: 3500 });

wss.on('connection', function connection(ws) {

    ws.on('message', function message(data) {
        const { action, player } = JSON.parse(data)
        if (action === 'reset') {
            gameState = initialGameState
            gameState.players = []
            gameState.keeper = null
        }
        else if (action === 'register') {
            if (!gameState.keeper) {
                gameState.keeper = player.name
            }
            gameState.players.push(player)
        } else if (action === 'pass') {
            const item = Math.random() < 0.5 ? 'bomb' : 'star'
            gameState.item = item
            if (gameState.keeper === player.name) {
                let remainingPlayers = gameState.players.filter((p) => p.stars > 0)
                if(remainingPlayers.length > 0) {
                    let myIndex = remainingPlayers.findIndex(p => p.name === gameState.keeper)
                    let nextIndex = myIndex+1
                    if(nextIndex >= remainingPlayers.length) {
                        nextIndex = 0
                    }
                    gameState.keeper = remainingPlayers[nextIndex].name
                }
            }
        } else if (action === 'updatePlayer') {
            let playerIndex = gameState.players.findIndex((p) => p.name === player.name)
            gameState.players[playerIndex] = player
        }
        console.log(gameState)
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(gameState));
            }
        });

    });

    ws.send(JSON.stringify(gameState));

});
