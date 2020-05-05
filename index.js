const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const _ = require('lodash');

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

    /*console.log(io.sockets.adapter.rooms)
    setTimeout(() => {
        console.log(socket.rooms)
    }, 100)*/

    // tell everyone someone connected
    io.emit('connected', socket.id)

    // add the connection to the state...
    users[socket.id] = {}

    // notify new user of the current state...
    socket.emit('init_state', state, users);

    let userupdate
    socket.on('user_updated', userupdate = e => {
        // ignore non object messages
        if (typeof e !== 'object') return

        console.log('Got a userupdate from', socket.id, 'being:', e)

        // update our state
        _.merge(users[socket.id], e)

        // send it out.
        io.emit('user_updated', socket.id, e)
    })

    let stateupdate
    socket.on('state_updated', stateupdate = e => {
        // ignore non object messages
        if (typeof e !== 'object') return

        console.log('Got a stateupdate from', socket.id, 'being:', e)

        // update our state
        _.merge(state, e)

        // send it out.
        io.emit('state_updated', socket.id, e)
    })


    socket.once('disconnect', reason => {
        console.log(`${socket.id} has disconnected (${reason}).`)

        // clean up
        socket.off('state_updated', stateupdate)
        socket.off('user_updated', userupdate)

        // tell everyone someone disconnected
        io.emit('disconnected', socket.id, reason)

        // remove the connection from the state
        delete users[socket.id]
    })
})


server.listen(PORT, () => console.log(`Server running on port ${PORT}`));