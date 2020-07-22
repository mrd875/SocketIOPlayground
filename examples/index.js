let gt

async function main () {
  // get all the elements
  const connectBtn = document.getElementById('connectbtn')
  const ipInput = document.getElementById('ip')
  const idInput = document.getElementById('id')
  const authBtn = document.getElementById('authbtn')
  const disconnectedDiv = document.getElementById('disconnected')
  const connectedDiv = document.getElementById('connected')
  const authedDiv = document.getElementById('authed')
  const roomInput = document.getElementById('room')
  const joinBtn = document.getElementById('joinbtn')
  const joinedDiv = document.getElementById('joined')
  const leaveRoomBtn = document.getElementById('leaveroombtn')
  const info = document.getElementById('info')
  const users = document.getElementById('users')
  const state = document.getElementById('state')
  const updateuserInput = document.getElementById('updateuser')
  const updateuserBtn = document.getElementById('updateuserbtn')
  const updateuserBtnUnr = document.getElementById('updateuserbtnunr')
  const updatestateInput = document.getElementById('updatestate')
  const updatestateBtn = document.getElementById('updatestatebtn')
  const updatestateBtnUnr = document.getElementById('updatestatebtnunr')
  const startingUserStateInput = document.getElementById('user')

  const createGt = (ip) => {
    const gt = new GT(ip, { handleState: true })

    gt.on('users_object_updated', () => {
      users.value = JSON.stringify(gt.users)
    })

    gt.on('state_object_updated', () => {
      state.value = JSON.stringify(gt.state)
    })

    // fires when WE disconnect.
    gt.on('disconnect', (reason) => {
      console.log(`We have disconnected from the server: ${reason}`)

      connectBtn.innerText = 'Connect'

      disconnectedDiv.hidden = false
      connectedDiv.hidden = true
      authedDiv.hidden = true
      joinedDiv.hidden = true
    })

    // fires when we joined a room
    gt.on('joined', (room, roomState, users) => {
      console.log('Joined', room, 'with state', roomState, 'users', users)
    })

    // fires when we authed with an id.
    gt.on('authed', (id, state) => {
      console.log('Authed', id, 'with state', state)

      startingUserStateInput.value = JSON.stringify(state)
    })

    // fires when WE left the room
    gt.on('leftroom', (reason) => {
      console.log(`We have left the room: ${reason}`)

      disconnectedDiv.hidden = true
      connectedDiv.hidden = true
      authedDiv.hidden = false
      joinedDiv.hidden = true
    })

    // fires when someone has joined the room (including ourselves).
    gt.on('connected', (id, userState) => {
      console.log(`ID ${id} has joined with state:`, userState)
    })

    // fires when someone left the room
    gt.on('disconnected', (id, reason) => {
      console.log(`ID ${id} has left with reason: ${reason}`)
    })

    // these will fire when the room/user state changes.
    gt.on('user_updated_reliable', (id, payloadDelta) => {
      console.log(`ID ${id} has updated their state:`, payloadDelta)
    })
    gt.on('user_updated_unreliable', (id, payloadDelta) => {
      console.log(`ID ${id} has updated their state:`, payloadDelta)
    })

    gt.on('state_updated_reliable', (id, payloadDelta) => {
      console.log(`ID ${id} has updated the room's state:`, payloadDelta)
    })
    gt.on('state_updated_unreliable', (id, payloadDelta) => {
      console.log(`ID ${id} has updated the room's state:`, payloadDelta)
    })

    return gt
  }

  // we are not connected. so hide everything but the disconnected div.
  disconnectedDiv.hidden = false
  connectedDiv.hidden = true
  authedDiv.hidden = true
  joinedDiv.hidden = true

  // setup the buttons.
  connectBtn.innerText = 'Connect'
  connectBtn.addEventListener('click', async () => {
    // if we are not connected...
    if (connectBtn.innerText === 'Connect') {
      const connIp = ipInput.value
      console.log('Connecting to', connIp)

      gt = createGt(connIp)

      connectBtn.innerText = 'connecting...'
      connectBtn.disabled = true

      // connect to the server
      try {
        await gt.connect()

        // we connected! lets go into the connected state.
        connectBtn.innerText = 'Disconnect'
        disconnectedDiv.hidden = true
        connectedDiv.hidden = false
        authedDiv.hidden = true
        joinedDiv.hidden = true
      } catch (e) {
        // we failed.
        connectBtn.innerText = 'Connect'
        console.error(e)
      } finally {
        connectBtn.disabled = false
      }

      return
    }
    // we are already connected, lets disconnect.

    console.log('Disconnecting...')

    connectBtn.innerText = 'disconnecting...'
    connectBtn.disabled = true

    try {
      await gt.disconnect()
      // we disconnected.
      connectBtn.innerText = 'Connect'

      disconnectedDiv.hidden = false
      connectedDiv.hidden = true
      authedDiv.hidden = true
      joinedDiv.hidden = true
    } catch (e) {
      // we failed...
      connectBtn.innerText = 'Disconnect'

      console.error(e)
    } finally {
      connectBtn.disabled = false
    }
  })

  authBtn.addEventListener('click', async () => {
    let authId = idInput.value
    if (authId === '') authId = undefined
    console.log('Authing with id', authId)

    authBtn.disabled = true
    try {
      await gt.auth(authId)

      // we authed, lets go into the authed state.
      disconnectedDiv.hidden = true
      connectedDiv.hidden = true
      authedDiv.hidden = false
      joinedDiv.hidden = true
    } finally {
      authBtn.disabled = false
    }
  })

  joinBtn.addEventListener('click', async () => {
    const roomName = roomInput.value
    let userStateText = startingUserStateInput.value
    if (userStateText === '') userStateText = '{}'
    const userState = JSON.parse(userStateText)
    console.log('Joining room', roomName, 'with user state', userState)

    joinBtn.disabled = true
    try {
      await gt.join(roomName, userState)

      // we joined! lets go into the joined state.
      disconnectedDiv.hidden = true
      connectedDiv.hidden = true
      authedDiv.hidden = true
      joinedDiv.hidden = false

      info.innerText = `ID: '${gt.id}', room: '${gt.room}'`
    } finally {
      joinBtn.disabled = false
    }
  })

  leaveRoomBtn.addEventListener('click', async () => {
    console.log('Leaving room')

    leaveRoomBtn.disabled = true
    try {
      await gt.leaveRoom()

      // we left! lets go into the authed state.
      disconnectedDiv.hidden = true
      connectedDiv.hidden = true
      authedDiv.hidden = false
      joinedDiv.hidden = true
    } finally {
      leaveRoomBtn.disabled = false
    }
  })

  updateuserBtn.addEventListener('click', async () => {
    const payloadDelta = JSON.parse(updateuserInput.value)
    console.log('Sending user update', payloadDelta)

    gt.updateUser(payloadDelta)
  })

  updateuserBtnUnr.addEventListener('click', async () => {
    const payloadDelta = JSON.parse(updateuserInput.value)
    console.log('Sending user update unreliable', payloadDelta)

    gt.updateUserUnreliable(payloadDelta)
  })

  updatestateBtn.addEventListener('click', async () => {
    const payloadDelta = JSON.parse(updatestateInput.value)
    console.log('Sending state update', payloadDelta)

    gt.updateState(payloadDelta)
  })

  updatestateBtnUnr.addEventListener('click', async () => {
    const payloadDelta = JSON.parse(updatestateInput.value)
    console.log('Sending state update unreliable', payloadDelta)

    gt.updateStateUnreliable(payloadDelta)
  })
}

main()
