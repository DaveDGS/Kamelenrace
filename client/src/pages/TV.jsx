import { useEffect, useState } from 'react'
import io from 'socket.io-client'

const socket = io('https://troy-electroosmotic-benignantly.ngrok-free.dev/')

function TV() {
  const [roomCode, setRoomCode] = useState('')
  const [players, setPlayers] = useState([])
  const [positions, setPositions] = useState({})
  const [gameStarted, setGameStarted] = useState(false)
  const [winner, setWinner] = useState(null)
  const [lastRoll, setLastRoll] = useState(null)
  const [bets, setBets] = useState({})
  const [drinkRules, setDrinkRules] = useState([])
  const [standings, setStandings] = useState([])

  useEffect(() => {
  if (!roomCode) {
    console.log('🔧 Creating room...')
    socket.emit('create-room')
  }

  socket.on('room-created', (code) => {
    console.log('🏠 Room created:', code)
    setRoomCode(code)
  })

  socket.on('players-update', ({ players: updatedPlayers, positions: updatedPositions }) => {
    console.log('👥 Players update:', updatedPlayers)
    setPlayers(updatedPlayers)
    setPositions(updatedPositions)
  })

  socket.on('bets-update', ({ bets: updatedBets }) => {
    console.log('💰 Bets update:', updatedBets)
    setBets(updatedBets)
  })

  socket.on('start-race', () => {
    console.log('🏁 TV: Game started!')
    setGameStarted(true)
  })

  socket.on('dice-rolled', ({ playerId, diceValue, positions: updatedPositions }) => {
    console.log('🎲 Dice rolled:', diceValue)
    setPositions(updatedPositions)
    const player = players.find(p => p.id === playerId)
    if (player) {
      setLastRoll({ player: player.name, value: diceValue })
      setTimeout(() => setLastRoll(null), 2500)
    }
  })

  socket.on('game-won', ({ winner: gameWinner, standings: gameStandings, drinkRules: rules }) => {
    console.log('🏆 Winner:', gameWinner)
    setWinner(gameWinner)
    setStandings(gameStandings)
    setDrinkRules(rules)
  })

  return () => {
    socket.off('room-created')
    socket.off('players-update')
    socket.off('bets-update')
    socket.off('start-race')
    socket.off('dice-rolled')
    socket.off('game-won')
  }
}, [])

  const startGame = () => {
    console.log('▶️ Starting game...')
    socket.emit('start-game', { roomCode })
  }

  const resetGame = () => {
    window.location.reload()
  }

  const colors = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500'
  }

  if (winner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 p-8 overflow-auto">
        <div className="text-center mb-8">
          <div className="text-9xl mb-4 animate-bounce">🏆</div>
          <h1 className="text-9xl font-black text-white mb-4 drop-shadow-2xl">
            {winner.name}
          </h1>
          <h2 className="text-6xl font-bold text-white mb-8">WINT!</h2>
        </div>

        <div className="max-w-4xl mx-auto mb-8">
          <h2 className="text-5xl font-black text-white text-center mb-6">
            🍺 DRINK REGELS 🍺
          </h2>
          <div className="space-y-4">
            {drinkRules.map((rule, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 shadow-2xl">
                <h3 className="text-3xl font-bold text-gray-800 mb-3">{rule.rule}</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {rule.players.map((playerName, i) => (
                    <span key={i} className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-xl">
                      {playerName}
                    </span>
                  ))}
                </div>
                <p className="text-4xl font-black text-red-600">{rule.action}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <h2 className="text-4xl font-black text-white text-center mb-4">Eindstand:</h2>
          <div className="bg-white rounded-3xl p-6 shadow-2xl">
            {standings.map((player, idx) => (
              <div key={player.id} className="flex items-center gap-4 py-3 border-b-2 last:border-0">
                <span className="text-4xl font-black text-gray-600">#{idx + 1}</span>
                <div className={`w-10 h-10 rounded-full ${colors[player.color]}`}></div>
                <span className="text-3xl font-bold flex-1">{player.name}</span>
                <span className="text-2xl font-semibold text-gray-600">{positions[player.id]}m</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={resetGame}
            className="bg-white text-orange-600 text-4xl font-bold py-8 px-16 rounded-3xl hover:scale-105 transition shadow-2xl"
          >
            🔄 Nieuwe Race
          </button>
        </div>
      </div>
    )
  }

  const allBetted = players.length > 0 && players.every(p => bets[p.id] !== undefined)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-300 via-yellow-200 to-orange-400 p-8">
      <div className="text-center mb-8">
        <h1 className="text-8xl font-black text-orange-900 mb-4 drop-shadow-lg">
          🐪 KAMELENRACE 🐪
        </h1>
        <div className="bg-white rounded-3xl inline-block px-12 py-6 shadow-2xl border-4 border-orange-600">
          <p className="text-6xl font-black text-orange-600">
            CODE: {roomCode || '----'}
          </p>
        </div>
      </div>

      {!gameStarted && (
        <div className="text-center mb-6">
          <div className="bg-purple-500 text-white rounded-2xl inline-block px-8 py-4 shadow-xl">
            <p className="text-3xl font-bold">
              🍺 {Object.keys(bets).length}/{players.length} spelers hebben gegokt
            </p>
          </div>
        </div>
      )}

      {lastRoll && (
        <div className="text-center mb-6 animate-pulse">
          <div className="bg-white rounded-2xl inline-block px-8 py-4 shadow-xl border-4 border-green-500">
            <p className="text-4xl font-bold text-green-600">
              🎲 {lastRoll.player} gooide {lastRoll.value}!
            </p>
          </div>
        </div>
      )}

      <div className="relative bg-gradient-to-r from-yellow-100 to-yellow-50 border-8 border-yellow-800 rounded-3xl p-8 mb-8 shadow-2xl" style={{ minHeight: '400px' }}>
        
        <div className="absolute left-4 top-0 h-full w-3 bg-green-600 rounded"></div>
        <div className="absolute left-8 top-1/2 -translate-y-1/2 text-4xl font-black text-green-700 transform -rotate-90">
          START
        </div>
        
        <div className="absolute right-4 top-0 h-full w-3 bg-red-600 rounded"></div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 text-4xl font-black text-red-700 transform rotate-90">
          FINISH
        </div>

        <div className="relative h-full pl-20 pr-20">
          {players.map((player, index) => {
            const position = positions[player.id] || 0
            const leftPosition = Math.min((position / 100) * 85, 85)
            
            const totalPlayers = players.length
            const verticalSpacing = totalPlayers <= 1 ? 50 : (10 + (index * (70 / (totalPlayers - 1))))
            
            return (
              <div
                key={player.id}
                className="absolute transition-all duration-700 ease-out"
                style={{
                  left: `${leftPosition}%`,
                  top: `${verticalSpacing}%`,
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="text-8xl drop-shadow-2xl">🐪</div>
                  <div className={`${colors[player.color]} text-white px-6 py-3 rounded-full font-black text-2xl shadow-xl mt-2 border-4 border-white`}>
                    {player.name}
                  </div>
                  <div className="text-gray-700 font-bold text-xl mt-1">
                    {position}m
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex justify-between items-start gap-8">
        
        <div className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-orange-400 flex-1">
          <h2 className="text-4xl font-black mb-6 text-orange-900">
            Spelers & Weddenschappen
          </h2>
          {players.length === 0 ? (
            <p className="text-2xl text-gray-500">Wachten op spelers...</p>
          ) : (
            <div className="space-y-4">
              {players.map(player => {
                const betData = bets[player.id]
                const betOnPlayer = betData ? players.find(p => p.id === betData.betOn) : null
                
                return (
                  <div key={player.id} className="bg-gray-50 p-4 rounded-2xl">
                    <div className="flex items-center gap-4 mb-2">
                      <div className={`w-12 h-12 rounded-full ${colors[player.color]} border-4 border-white shadow-lg`}></div>
                      <span className="text-3xl font-bold">{player.name}</span>
                    </div>
                    {betOnPlayer && (
                      <div className="ml-16 flex items-center gap-2">
                        <span className="text-lg text-gray-600">🍺 Gokt op:</span>
                        <div className={`${colors[betOnPlayer.color]} text-white px-3 py-1 rounded-full text-sm font-bold`}>
                          {betOnPlayer.name}
                        </div>
                        <span className="text-orange-600 font-bold">{betData.slokken} slok{betData.slokken > 1 ? 'ken' : ''}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {!gameStarted && players.length >= 1 && (
          <button
            onClick={startGame}
            className="bg-green-500 text-white text-5xl font-black py-10 px-16 rounded-3xl hover:bg-green-600 hover:scale-105 transition-all shadow-2xl border-4 border-green-700"
          >
            🏁<br/>START<br/>RACE
          </button>
        )}

        {gameStarted && (
          <div className="bg-green-500 rounded-3xl p-10 shadow-2xl border-4 border-green-700">
            <p className="text-5xl font-black text-white text-center">
              🏁<br/>RACE<br/>BEZIG!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TV