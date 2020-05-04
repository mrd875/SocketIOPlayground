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

    socket.once('disconnect', reason => {
        console.log(`${socket.id} has disconnected (${reason}).`)
    })
})


server.listen(PORT, () => console.log(`Server running on port ${PORT}`));