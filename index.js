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
let state = {}
let users = {}


// https://stackoverflow.com/questions/30812765/how-to-remove-undefined-and-null-values-from-an-object-using-lodash/31209300
const removeObjectsWithNull = (obj) => {
    return _(obj)
      .pickBy(_.isObject) // get only objects
      .mapValues(removeObjectsWithNull) // call only for values as objects
      .assign(_.omitBy(obj, _.isObject)) // save back result that is not object
      .omitBy(_.isNil) // remove null and undefined from object
      .value(); // get value
};

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
        // remove null keys...
        users[socket.id] = removeObjectsWithNull(users[socket.id])

        // send it out.
        io.emit('user_updated', socket.id, e)
        // its up to the client to remove the null values to keep their state consistent.
    })

    let stateupdate
    socket.on('state_updated', stateupdate = e => {
        // ignore non object messages
        if (typeof e !== 'object') return

        console.log('Got a stateupdate from', socket.id, 'being:', e)

        // update our state
        _.merge(state, e)
        // remove null keys...
        state = removeObjectsWithNull(state)

        console.log(state)

        // send it out.
        io.emit('state_updated', socket.id, e)
        // its up to the client to remove the null values to keep their state consistent.
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