// https://stackoverflow.com/questions/45831911/is-there-any-eventemitter-in-browser-side-that-has-similar-logic-in-nodejs
class EventEmitter {
    constructor() {
        this.__callbacks = {}
    }

    on(event, cb) {
        if (!this.__callbacks[event]) this.__callbacks[event] = []
        this.__callbacks[event].push(cb)
    }

    once(event, cb) {
        const thiscb = (...args) => {
            cb(...args)
            this.off(event, thiscb)
        }

        this.on(event, thiscb)
    }

    emit(event, ...args) {
        if (!this.__callbacks[event]) return

        let cbs = [...this.__callbacks[event]]
        if (cbs) {
            cbs.forEach(cb => cb(...args))
        }
    }

    off(event, cb) {
        if (!this.__callbacks[event]) return

        if (!cb) {
            delete this.__callbacks[event]
        } else {
            this.__callbacks[event].splice(this.__callbacks[event].indexOf(cb), 1)
        }
    }
}

class GT extends EventEmitter {
    constructor(server_ip) {
        super()

        const socket = io(server_ip, {
            autoConnect: false,
            reconnection: false
        })

        this.socket = socket

        // setup the events.
        socket.on('init_state', (state, users, room) => {
            this.emit('init_state', state, users, room)
        })
        
        socket.on('connected', (id, user) => {
            this.emit('connected', id, user)
        })
        socket.on('disconnected', (id, reason) => {
            this.emit('disconnected', id, reason)
        })
        
        socket.on('user_updated_reliable', (id, payload_delta) => {
            this.emit('user_updated_reliable', id, payload_delta)
        })
        socket.on('user_updated_unreliable', (id, payload_delta) => {
            this.emit('user_updated_unreliable', id, payload_delta)
        })

        socket.on('state_updated_reliable', (id, payload_delta) => {
            this.emit('state_updated_reliable', id, payload_delta)
        })
        socket.on('state_updated_unreliable', (id, payload_delta) => {
            this.emit('state_updated_unreliable', id, payload_delta)
        })

        this.id = undefined

        socket.on('connect', () => {
            this.id = socket.id

            this.emit('connect', socket.id)
        })

        socket.on('disconnect', reason => {
            this.emit('disconnect', reason)

            this.id = undefined
        })
    }

    isConnected() {
        return this.id !== undefined
    }

    connect(room) {
        this.socket.connect()

        this.socket.once('connect', () => {
            this.socket.emit('join_room', room)
        })
    }

    disconnect() {
        this.socket.disconnect()
    }

    updateStateReliable(payload_delta) {
        this.socket.emit('state_updated_reliable', payload_delta)
    }

    updateStateUnreliable(payload_delta) {
        this.socket.emit('state_updated_unreliable', payload_delta)
    }

    updateUserReliable(payload_delta) {
        this.socket.emit('user_updated_reliable', payload_delta)
    }

    updateUserUnreliable(payload_delta) {
        this.socket.emit('user_updated_unreliable', payload_delta)
    }
}
