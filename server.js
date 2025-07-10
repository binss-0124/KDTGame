// server.js

const http = require('http');
const express = require('express');
const path = require('path');
const { Server } = require('socket.io');

const app = express();

// 정적 파일 제공
app.use(express.static(path.join(__dirname)));

// 기본 접속시 start.html로 리다이렉트
app.get('/', (req, res) => {
    res.redirect('/start.html');
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// 방에 접속한 플레이어 정보 저장
const rooms = {}; // { roomCode: { socketId: {x, y, color} ... } }

io.on('connection', (socket) => {
    let currentRoom = null;

    socket.on('joinRoom', ({ roomCode, player }) => {
        if (!roomCode || roomCode.length < 4) {
            socket.emit('roomError', '잘못된 방 코드');
            return;
        }
        socket.join(roomCode);
        currentRoom = roomCode;

        // 플레이어 정보 저장 (기본 위치, 랜덤 색상)
        if (!rooms[roomCode]) rooms[roomCode] = {};
        rooms[roomCode][socket.id] = {
            x: player?.x || 100 + Math.random() * 200,
            y: player?.y || 100 + Math.random() * 200,
            color: player?.color || '#'+Math.floor(Math.random()*16777215).toString(16)
        };

        // 입장한 방의 모든 플레이어 정보 전송
        io.to(roomCode).emit('players', rooms[roomCode]);
    });

    // 위치 동기화
    socket.on('move', ({ roomCode, x, y }) => {
        if (rooms[roomCode] && rooms[roomCode][socket.id]) {
            rooms[roomCode][socket.id].x = x;
            rooms[roomCode][socket.id].y = y;
            io.to(roomCode).emit('players', rooms[roomCode]);
        }
    });

    // 연결 해제 시 플레이어 제거
    socket.on('disconnect', () => {
        if (currentRoom && rooms[currentRoom]) {
            delete rooms[currentRoom][socket.id];
            io.to(currentRoom).emit('players', rooms[currentRoom]);
            // 방이 비면 삭제
            if (Object.keys(rooms[currentRoom]).length === 0) {
                delete rooms[currentRoom];
            }
        }
    });
});

server.listen(3000, () => {
    console.log('서버 실행 중: http://localhost:3000');
});
