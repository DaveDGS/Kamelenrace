import { useState, useEffect } from 'react'
import io from 'socket.io-client'

const socket = io('https://troy-electroosmotic-benignantly.ngrok-free.dev/')

function Phone() {
  const [screen, setScreen] = useState('join')
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [error, setError] = useState('')
  
  const [allPlayers, setAllPlayers] = useState([])
  const [myPlayer, setMyPlayer] = useState(null)
  const [myBet, setMyBet] = useState(null)
  const [allBets, setAllBets] = useState({})
  const [selectedSlokken, setSelectedSlokken] = useState(2)
  
  const [canRoll, setCanRoll] = useState(true)
  const [rolling, setRolling] = useState(false)
  const [diceResult, setDiceResult] = useState(null)

  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'pink']
  const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

  const colorMap = {
    red: { bg: 'bg-red-500', name: 'Rood' },
    blue: { bg: 'bg-blue-500', name: 'Blauw' },
    green: { bg: 'bg-green-500', name: 'Groen' },
    yellow: { bg: 'bg-yellow-400', name: 'Geel' },
    purple: { bg: 'bg-purple-500', name: 'Paars' },
    pink: { bg: 'bg-pink-500', name: 'Roze' }
  }

  useEffect(() => {
    socket.on('join-success', ({ player }) => {
      console.log('✅ Joined successfully:', player)
      setMyPlayer(player)
      setScreen('betting')
    })

    socket.on('players-update', ({ players }) => {
      console.log('👥 Players:', players)
      setAllPlayers(players)
    })

    socket.on('bets-update', ({ bets }) => {
      console.log('💰 Bets:', bets)
      setAllBets(bets)
      if (bets[socket.id]) {
        setMyBet(bets[socket.id].betOn)
      }
    })

    socket.on('join-error', (message) => {
      setError(message)
    })

    socket.on('start-race', () => {
      console.log('🏁🏁🏁 START RACE ONTVANGEN! 🏁🏁🏁')
      setScreen('playing')
    })

    socket.on('dice-rolled', ({ playerId, diceValue }) => {
      if (playerId === socket.id) {
        setRolling(false)
        setDiceResult(diceValue)
        
        if (navigator.vibrate) navigator.vibrate([100, 50, 100])

        setTimeout(() => setDiceResult(null), 2500)
      }
    })

    socket.on('game-won', ({ winner, drinkRules }) => {
      let myRule = ''
      drinkRules.forEach(rule => {
        if (rule.players.includes(playerName)) {
          myRule = rule.action
        }
      })

      if (winner.id === socket.id) {
        alert(`🏆 JIJ HEBT GEWONNEN! 🏆\n\n${myRule}`)
      } else {
        alert(`${winner.name} heeft gewonnen!\n\n${myRule}`)
      }
    })

    return () => {
      socket.off('join-success')
      socket.off('players-update')
      socket.off('bets-update')
      socket.off('join-error')
      socket.off('start-race')
      socket.off('dice-rolled')
      socket.off('game-won')
    }
  }, [playerName])

  const joinRoom = () => {
    if (!roomCode || !playerName) {
      setError('Vul alle velden in!')
      return
    }
    
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    
    socket.emit('join-room', {
      roomCode: roomCode.trim(),
      playerName: playerName.trim(),
      camelColor: randomColor
    })
  }

  const placeBet = (playerId, slokken) => {
    setMyBet(playerId)
    socket.emit('place-bet', { roomCode, betOnPlayerId: playerId, slokken })
    setScreen('waiting')
  }

  const rollDice = () => {
    if (!canRoll || rolling) return
    
    setCanRoll(false)
    setRolling(true)
    socket.emit('roll-dice', { roomCode })
    
    setTimeout(() => setCanRoll(true), 3000)
  }

  if (screen === 'join') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-gradient-to-br from-orange-400 via-red-500 to-pink-600">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <h1 className="text-5xl font-black text-center mb-8 text-orange-600">🐪 Join Race</h1>
          
          {error && (
            <div className="bg-red-100 border-4 border-red-500 text-red-700 px-6 py-4 rounded-2xl mb-6 font-bold text-center">
              ❌ {error}
            </div>
          )}

          <input
            type="text"
            placeholder="Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="w-full text-4xl p-6 border-4 border-orange-300 rounded-2xl mb-6 text-center font-black focus:border-orange-500 focus:outline-none"
            maxLength={4}
          />

          <input
            type="text"
            placeholder="Jouw Naam"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full text-3xl p-6 border-4 border-orange-300 rounded-2xl mb-8 text-center font-bold focus:border-orange-500 focus:outline-none"
          />

          <button
            onClick={joinRoom}
            className="w-full bg-orange-500 text-white text-4xl font-black py-6 rounded-2xl hover:bg-orange-600 transition shadow-xl active:scale-95"
          >
            JOIN 🐪
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'betting') {
    const otherPlayers = allPlayers.filter(p => p.id !== socket.id)

    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-gradient-to-br from-purple-400 via-pink-500 to-red-600">
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          
          {myPlayer && (
            <div className="text-center mb-6">
              <p className="text-xl font-semibold text-gray-600 mb-2">Jouw kameel:</p>
              <div className="flex items-center justify-center gap-4">
                <div className={`w-16 h-16 rounded-full ${colorMap[myPlayer.color].bg} border-4 border-white shadow-xl`}></div>
                <div>
                  <p className="text-3xl font-black">{myPlayer.name}</p>
                  <p className="text-lg font-semibold text-gray-600">{colorMap[myPlayer.color].name}</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t-4 border-gray-200 my-6"></div>

          <h1 className="text-4xl font-black text-center mb-2 text-purple-600">🍺 GOK OP WINNAAR</h1>

          <div className="bg-orange-50 rounded-2xl p-6 mb-6 border-4 border-orange-300">
            <p className="text-center text-xl font-bold text-orange-900 mb-4">Hoeveel slokken?</p>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setSelectedSlokken(num)}
                  className={selectedSlokken === num ? 'w-14 h-14 rounded-full font-black text-2xl bg-orange-500 text-white scale-125 shadow-xl transition-all' : 'w-14 h-14 rounded-full font-black text-2xl bg-white text-orange-500 border-4 border-orange-300 transition-all'}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {otherPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => placeBet(player.id, selectedSlokken)}
                className={`w-full ${colorMap[player.color].bg} text-white text-2xl font-bold py-6 rounded-2xl hover:scale-105 transition shadow-xl flex items-center justify-between px-6`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-5xl">🐪</div>
                  <div className="text-3xl font-black">{player.name}</div>
                </div>
                <div className="text-4xl">🍺</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (screen === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-400 via-purple-500 to-pink-600">
        <div className="bg-white rounded-3xl p-16 text-center shadow-2xl">
          <div className="text-9xl mb-6 animate-bounce">⏳</div>
          <h2 className="text-4xl font-black text-gray-800">Wachten op start...</h2>
        </div>
      </div>
    )
  }

  if (diceResult) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600">
        <div className="text-center">
          <div className="text-9xl animate-bounce">{diceEmojis[diceResult - 1]}</div>
          <h2 className="text-7xl font-black text-white mt-8">Je gooide {diceResult}!</h2>
        </div>
      </div>
    )
  }

  if (rolling) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-600">
        <div className="text-9xl animate-spin">🎲</div>
        <h2 className="text-5xl font-black text-white mt-12">Aan het gooien...</h2>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600">
      <button
        onClick={rollDice}
        disabled={!canRoll}
        className={canRoll ? 'bg-red-500 hover:bg-red-600 active:scale-90 text-white text-6xl font-black p-24 rounded-full transition-all shadow-2xl' : 'bg-gray-400 opacity-50 text-white text-6xl font-black p-24 rounded-full transition-all shadow-2xl'}
      >
        <div className="text-9xl mb-6">🎲</div>
        <div>{canRoll ? 'GOOI!' : 'Wacht...'}</div>
      </button>
    </div>
  )
}

export default Phone