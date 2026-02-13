import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('✅ Nieuwe connectie:', socket.id);

  socket.on('create-room', () => {
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    rooms[roomCode] = {
      tvId: socket.id,
      players: [],
      camelPositions: {},
      bets: {},
      gameStarted: false,
      finishLine: 100
    };
    socket.join(roomCode);
    console.log('🏠 Room aangemaakt:', roomCode);
    socket.emit('room-created', roomCode);
  });

  socket.on('join-room', (data) => {
    console.log('📱 Join poging:', data);
    const { roomCode, playerName, camelColor } = data;
    
    if (rooms[roomCode]) {
      socket.join(roomCode);
      
      const player = { 
        id: socket.id, 
        name: playerName, 
        color: camelColor,
        position: 0
      };
      
      rooms[roomCode].players.push(player);
      rooms[roomCode].camelPositions[socket.id] = 0;
      
      console.log('✅ Speler toegevoegd:', player.name, 'Socket ID:', socket.id);
      
      io.to(roomCode).emit('players-update', {
        players: rooms[roomCode].players,
        positions: rooms[roomCode].camelPositions
      });

      socket.emit('join-success', { roomCode, player });
    } else {
      console.log('❌ Room niet gevonden:', roomCode);
      socket.emit('join-error', 'Room niet gevonden');
    }
  });

  socket.on('place-bet', ({ roomCode, betOnPlayerId, slokken }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].bets[socket.id] = {
        betOn: betOnPlayerId,
        slokken: slokken
      };
      console.log(`🍺 ${socket.id} gokt ${slokken} slokken op ${betOnPlayerId}`);
      
      io.to(roomCode).emit('bets-update', {
        bets: rooms[roomCode].bets
      });
    }
  });

  socket.on('start-game', ({ roomCode }) => {
    if (rooms[roomCode]) {
      rooms[roomCode].gameStarted = true;
      
      console.log('🏁 Game gestart in room:', roomCode);
      console.log('📤 Versturen START naar alle clients in room...');
      console.log('Clients in room:', io.sockets.adapter.rooms.get(roomCode));
      
      // BROADCAST DRIE KEER OM ZEKER TE ZIJN
      io.to(roomCode).emit('start-race');
      setTimeout(() => io.to(roomCode).emit('start-race'), 100);
      setTimeout(() => io.to(roomCode).emit('start-race'), 200);
    }
  });

  socket.on('roll-dice', ({ roomCode }) => {
    console.log('🎲 Dobbelsteen gegooid door:', socket.id);
    
    if (!rooms[roomCode]) return;
    
    const diceValue = Math.floor(Math.random() * 6) + 1;
    const currentPosition = rooms[roomCode].camelPositions[socket.id] || 0;
    const newPosition = currentPosition + (diceValue * 10);
    
    rooms[roomCode].camelPositions[socket.id] = newPosition;
    
    console.log(`🎲 Worp: ${diceValue}, Nieuwe positie: ${newPosition}`);
    
    io.to(roomCode).emit('dice-rolled', {
      playerId: socket.id,
      diceValue: diceValue,
      newPosition: newPosition,
      positions: rooms[roomCode].camelPositions
    });

    if (newPosition >= rooms[roomCode].finishLine) {
      const winner = rooms[roomCode].players.find(p => p.id === socket.id);
      
      const sortedPlayers = [...rooms[roomCode].players].sort((a, b) => {
        return (rooms[roomCode].camelPositions[b.id] || 0) - (rooms[roomCode].camelPositions[a.id] || 0);
      });

      const bets = rooms[roomCode].bets;
      const drinkRules = [];

      const correctBettors = [];
      const wrongBettors = [];

      Object.keys(bets).forEach(bettorId => {
        const bet = bets[bettorId];
        const bettor = rooms[roomCode].players.find(p => p.id === bettorId);
        
        if (bet.betOn === winner.id) {
          correctBettors.push({ player: bettor, slokken: bet.slokken });
        } else {
          wrongBettors.push({ player: bettor, slokken: bet.slokken });
        }
      });

      if (correctBettors.length > 0) {
        const totalSlokken = correctBettors.reduce((sum, b) => sum + b.slokken, 0);
        drinkRules.push({
          rule: '✅ Goed gegokt!',
          players: correctBettors.map(b => b.player.name),
          action: `SAFE! Anderen drinken ${totalSlokken} slok${totalSlokken > 1 ? 'ken' : ''}!`
        });
      }

      wrongBettors.forEach(b => {
        drinkRules.push({
          rule: '❌ Fout gegokt!',
          players: [b.player.name],
          action: `DRINK ${b.slokken} slok${b.slokken > 1 ? 'ken' : ''}! 🍺`
        });
      });

      const lastPlace = sortedPlayers[sortedPlayers.length - 1];
      const lastPlaceBet = bets[lastPlace.id];
      const lastPlaceSlokken = lastPlaceBet ? lastPlaceBet.slokken * 3 : 3;
      
      drinkRules.push({
        rule: '🐢 Laatste plaats!',
        players: [lastPlace.name],
        action: `DRINK ${lastPlaceSlokken} slokken! 🍺🍺🍺`
      });

      io.to(roomCode).emit('game-won', { 
        winner: winner,
        standings: sortedPlayers,
        drinkRules: drinkRules
      });
      
      console.log('🏆 Winnaar:', winner.name);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnect:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🐪 Kamelenrace server draait op http://localhost:${PORT}`);
});