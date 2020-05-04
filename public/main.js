socket = io()
let state = {}

function stateChanged() {
}

// listen for whole new state
socket.once('state', s => {
    console.log('Got whole new state:', s)

    state = s
    stateChanged()
})

// listen for connections
socket.on('connected', socket_id => {
    console.log(`${socket_id} has connected.`)

    // update our state.
    state[socket_id] = {}
    stateChanged()
})

// listen for disconnections
socket.on('disconnected', socket_id => {
    console.log(`${socket_id} has disconnected.`)

    // update our state.
    delete state[socket_id]
    stateChanged()
})

// listen for stateupdates
socket.on('stateupdate', e => {
    console.log('Got a stateupdate:', e)

    // update the state
    const socket_id = e.socket_id
    delete e[socket_id]

    Object.assign(state[socket_id], e)
    stateChanged()
})


socket.emit('stateupdate', {})
