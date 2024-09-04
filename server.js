const WebSocket = require('ws');
const http = require('http');

// HTTPサーバーの作成
const server = http.createServer();
const wss = new WebSocket.Server({ server });

let players = {}; // プレイヤーを追跡するためのオブジェクト

// WebSocket接続のイベントリスナー
wss.on('connection', (ws) => {
    const id = Date.now().toString(); // プレイヤーのIDを生成
    players[id] = { x: 400, y: 300, hp: 100, color: '#' + Math.floor(Math.random()*16777215).toString(16) };

    ws.send(JSON.stringify({ type: 'init', id }));

    // 接続した他のプレイヤーに新しいプレイヤー情報を送信
    for (let playerId in players) {
        ws.send(JSON.stringify({ type: 'update', id: playerId, player: players[playerId] }));
    }

    // クライアントからメッセージを受信
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'move') {
            players[data.player.id] = data.player;

            // 全プレイヤーに送信
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'update', id: data.player.id, player: data.player }));
                }
            });
        } else if (data.type === 'chat') {
            // チャットメッセージを全クライアントに送信
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'chat', message: data.message }));
                }
            });
        }
    });

    // プレイヤーの切断時の処理
    ws.on('close', () => {
        delete players[id];

        // 全クライアントにプレイヤーの削除を通知
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'remove', id }));
            }
        });
    });
});

// サーバーのリッスン
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`サーバーがポート${PORT}でリッスン中です...`);
});
