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


io.on('connection', socket => {
    console.log(`${socket.id} has connected.`)

    // tell everyone someone connected
    socket.broadcast.emit('connected', socket.id)

    // emit to everyone else about the mouse movement
    socket.on('mousemove', e => {
        // append the socket.id to the event...
        e.sid = socket.id

        // send it out.
        socket.broadcast.emit('mousemove', e)
    })

    socket.once('disconnect', reason => {
        console.log(`${socket.id} has disconnected (${reason}).`)

        // tell everyone someone disconnected
        socket.broadcast.emit('disconnected', socket.id)
    })
})


server.listen(PORT, () => console.log(`Server running on port ${PORT}`));