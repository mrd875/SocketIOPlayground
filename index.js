const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;


// this is the state of the server
const state = {}
const users = {}

// listen for a connection.
io.on('connection', socket => {
    console.log(`${socket.id} has connected.`)

    // tell everyone someone connected
    io.emit('connected', socket.id)

    // add the connection to the state...
    users[socket.id] = {}

    // notify new user of the current state...
    socket.emit('state', state);
    socket.emit('users', users);

    let userupdate
    socket.on('userupdate', userupdate = e => {
        // ignore non object messages
        if (typeof e !== 'object') return

        console.log('Got a userupdate from', socket.id, 'being:', e)

        // update our state
        Object.assign(users[socket.id], e)

        // append the socket.id to the event...
        e.socket_id = socket.id

        // send it out.
        io.emit('userupdate', e)
    })

    let stateupdate
    socket.on('stateupdate', stateupdate = e => {
        // ignore non object messages
        if (typeof e !== 'object') return

        console.log('Got a stateupdate from', socket.id, 'being:', e)

        // update our state
        Object.assign(state, e)

        // append the socket.id to the event...
        e.socket_id = socket.id

        // send it out.
        io.emit('stateupdate', e)
    })


    socket.once('disconnect', reason => {
        console.log(`${socket.id} has disconnected (${reason}).`)

        // clean up
        socket.off('stateupdate', stateupdate)
        socket.off('userupdate', userupdate)

        // tell everyone someone disconnected
        io.emit('disconnected', socket.id)

        // remove the connection from the state
        delete users[socket.id]
    })
})


server.listen(PORT, () => console.log(`Server running on port ${PORT}`));