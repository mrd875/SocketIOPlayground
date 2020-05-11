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
const BURST_DELAY = 50

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

    // add the connection to the state...
    users[socket.id] = {}

    // tell everyone someone connected
    io.emit('connected', socket.id, users[socket.id])

    // notify new user of the current state...
    socket.emit('init_state', state, users)


    socket.on('user_updated_reliable', e => {
        // ignore non object messages
        if (typeof e !== 'object') return

        console.log('Got a userupdatereliable from', socket.id, 'being:', e)

        // update our state
        _.merge(users[socket.id], e)
        // remove null keys...
        users[socket.id] = removeObjectsWithNull(users[socket.id])

        // send it out.
        io.emit('user_updated_reliable', socket.id, e)
        // its up to the client to remove the null values to keep their state consistent.
    })

    socket.on('user_updated_unreliable', e => {
        // ignore non object messages
        if (typeof e !== 'object') return

        // check if the burst is locked
        if (socket.user_burst_locked) {
            socket.user_burst_payload = e // remember the last payload...
            return
        }

        console.log('Got a userupdateunreliable from', socket.id, 'being:', e)

        let send_and_lock
        
        send_and_lock = (payload_delta) => {
            if (!payload_delta) return

            // update our state
            _.merge(users[socket.id], payload_delta)
            // remove null keys...
            users[socket.id] = removeObjectsWithNull(users[socket.id])

            // send it out.
            io.emit('user_updated_unreliable', socket.id, payload_delta)
            // its up to the client to remove the null values to keep their state consistent.

            // lock the burst
            socket.user_burst_locked = true
            // wait for the burst delay
            setTimeout(() => {
                // then unlock the burst
                socket.user_burst_locked = undefined

                // send the last payload
                send_and_lock(socket.user_burst_payload)
                socket.user_burst_payload = undefined
            }, BURST_DELAY)
        }

        send_and_lock(e)
    })


    socket.on('state_updated_reliable', e => {
        // ignore non object messages
        if (typeof e !== 'object') return

        console.log('Got a stateupdatereliable from', socket.id, 'being:', e)

        // update our state
        _.merge(state, e)
        // remove null keys...
        state = removeObjectsWithNull(state)

        // send it out.
        io.emit('state_updated_reliable', socket.id, e)
        // its up to the client to remove the null values to keep their state consistent.
    })

    socket.on('state_updated_unreliable', e => {
        // ignore non object messages
        if (typeof e !== 'object') return

        // check if the burst is locked
        if (socket.state_burst_locked) {
            socket.state_burst_payload = e // remember the last payload...
            return
        }

        console.log('Got a stateupdateunreliable from', socket.id, 'being:', e)

        let send_and_lock
        
        send_and_lock = (payload_delta) => {
            if (!payload_delta) return

            // update our state
            _.merge(state, payload_delta)
            // remove null keys...
            state = removeObjectsWithNull(state)

            // send it out.
            io.emit('state_updated_unreliable', socket.id, payload_delta)
            // its up to the client to remove the null values to keep their state consistent.

            // lock the burst
            socket.state_burst_locked = true
            // wait for the burst delay
            setTimeout(() => {
                // then unlock the burst
                socket.state_burst_locked = undefined

                // send the last payload
                send_and_lock(socket.state_burst_payload)
                socket.state_burst_payload = undefined
            }, BURST_DELAY)
        }

        send_and_lock(e)
    })


    socket.once('disconnect', reason => {
        console.log(`${socket.id} has disconnected (${reason}).`)

        // remove the connection from the state
        delete users[socket.id]

        // tell everyone someone disconnected
        io.emit('disconnected', socket.id, reason)
    })
})


server.listen(PORT, () => console.log(`Server running on port ${PORT}`));