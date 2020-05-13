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
const BURST_DELAY = 50 //ms, 20 tickrate
const NO_ROOM_TIME = 10000

// this is the state of the server


// https://stackoverflow.com/questions/30812765/how-to-remove-undefined-and-null-values-from-an-object-using-lodash/31209300
const removeObjectsWithNull = (obj) => {
    return _(obj)
      .pickBy(_.isObject) // get only objects
      .mapValues(removeObjectsWithNull) // call only for values as objects
      .assign(_.omitBy(obj, _.isObject)) // save back result that is not object
      .omitBy(_.isNil) // remove null and undefined from object
      .value(); // get value
};

const getUsersFromRoom = (room) => {
    const userIds = Object.keys(io.sockets.adapter.rooms[room].sockets)
    const users = {}

    userIds.forEach(uId => {
        users[uId] = io.sockets.sockets[uId].state
    })
    
    return users
}

const rooms = {}

// listen for a connection.
io.on('connection', socket => {
    console.log(`${socket.id} has connected.`)

    // init the state of the user
    socket.state = {}


    const kickOnNoRoom = setTimeout(() => {
        socket.disconnect()
    }, NO_ROOM_TIME)
    // now we need to get what room the client wants in on.
    socket.once('join_room', room => {
        console.log(`${socket.id} is joining room: ${room}`)
        socket.join(room, () => {
            clearTimeout(kickOnNoRoom)

            // init the state of the room
            if (!rooms[room]) rooms[room] = {}
            const roomObj = rooms[room] // io.sockets.adapter.rooms[room]
            if (!roomObj.state) roomObj.state = {}

            // tell everyone someone connected
            io.to(room).emit('connected', socket.id, socket.state)

            // notify new user of the current state...
            socket.emit('init_state', roomObj.state, getUsersFromRoom(room), room)

            // listen for messages now...

            const onUserUpdate = (e, msg) => {
                // ignore non object messages
                if (typeof e !== 'object') return
        
                if (msg === 'user_updated_unreliable') {
                    // check if the burst is locked
                    if (socket.user_burst_locked) {
                        if (!socket.user_burst_payload)
                            socket.user_burst_payload = e // remember the last payload...
                        else
                            _.merge(socket.user_burst_payload, e)
            
                        return
                    }
                }
        
                console.log('Got a', msg, 'from', socket.id, 'in room', room, 'being:', e)
        
                let send_and_lock = (payload_delta) => {
                    if (!payload_delta) return
        
                    // update our state
                    _.merge(socket.state, payload_delta)
                    // remove null keys...
                    socket.state = removeObjectsWithNull(socket.state)
        
                    // send it out.
                    io.to(room).emit(msg, socket.id, payload_delta)
                    // its up to the client to remove the null values to keep their state consistent.
        
                    if (msg === 'user_updated_unreliable') {
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
                }
        
                send_and_lock(e)
            }

            socket.on('user_updated_reliable', e => {
                onUserUpdate(e, 'user_updated_reliable')
            })

            socket.on('user_updated_unreliable', e => {
                onUserUpdate(e, 'user_updated_unreliable')
            })

            const onStateUpdate = (e, msg) => {
                // ignore non object messages
                if (typeof e !== 'object') return
        
                if (msg === 'state_updated_unreliable') {
                    // check if the burst is locked
                    if (socket.state_burst_locked) {
                        if (!socket.state_burst_payload)
                            socket.state_burst_payload = e // remember the last payload...
                        else
                            _.merge(socket.state_burst_payload, e)
            
                        return
                    }
                }
        
                console.log('Got a', msg, 'from', socket.id, 'in room', room, 'being:', e)
        
                let send_and_lock = (payload_delta) => {
                    if (!payload_delta) return
        
                    // update our state
                    _.merge(roomObj.state, payload_delta)
                    // remove null keys...
                    roomObj.state = removeObjectsWithNull(roomObj.state)
        
                    // send it out.
                    io.to(room).emit(msg, socket.id, payload_delta)
                    // its up to the client to remove the null values to keep their state consistent.
        
                    if (msg === 'state_updated_unreliable') {
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
                }
        
                send_and_lock(e)
            }

            socket.on('state_updated_unreliable', e => {
                onStateUpdate(e, 'state_updated_unreliable')
            })

            socket.on('state_updated_reliable', e => {
                onStateUpdate(e, 'state_updated_reliable')
            })

            socket.once('disconnect', reason => {
                // tell everyone someone disconnected
                io.to(room).emit('disconnected', socket.id, reason)
            })
        })
    })

    socket.once('disconnect', reason => {
        console.log(`${socket.id} has disconnected (${reason}).`)
    })
})


server.listen(PORT, () => console.log(`Server running on port ${PORT}`));