/* eslint-disable require-await */
const EventEmitter = require('./EventEmitter')
const io = require('socket.io-client/dist/socket.io')
const _ = require('lodash')

/**
 * Fired when the server sends us the entire state of the room.
 * Happens when we just join a room.
 *
 * @event GT#init_state
 * @param {Object} state The state of the room.
 * @param {Object} users All the users and their states. Key'd by user id, value being the state of the user.
 * @param {String} room the name of the room
 */

/**
* Fires when someone joins the room.
*
* @event GT#connected
* @param {String} id The id of the user who connected.
* @param {Object} user The inital state of the user.
*/

/**
* Fires when someone joins the room.
*
* @event GT#disconnected
* @param {String} id The id of the user who disconnected.
* @param {String} reason
*/

/**
 * Fires when we connect to the server
 *
 * @event GT#connect
 * @param {String} id The id we were issued.
 */

/**
* Fires when we disconnect from the server
*
* @event GT#disconnect
* @param {String} reason
*/

/**
 * Fires when we receive a connection error when trying to connect to the server.
 *
 * @event GT#connect_error
 * @param {Object} error
 */

/**
 * Fires when we receive a connection error when trying to connect to the server.
 *
 * @event GT#connect_error
 * @param {Object} error
 */

/**
* Fires when we receive a delta of a user's state.
*
* @event GT#user_updated_reliable
* @param {String} id The id of the user who's state got updated.
* @param {Object} payloadDelta The delta of the state.
*/

/**
* Fires when we receive a delta of a user's state.
*
* @event GT#user_updated_unreliable
* @param {String} id The id of the user who's state got updated.
* @param {Object} payloadDelta The delta of the state.
*/

/**
* Fires when we receive a delta of the room's state
*
* @event GT#state_updated_reliable
* @param {String} id The id of the user who sent the update
* @param {Object} payloadDelta The delta of the state.
*/

/**
* Fires when we receive a delta of the room's state
*
* @event GT#state_updated_unreliable
* @param {String} id The id of the user who sent the update
* @param {Object} payloadDelta The delta of the state.
*/

/**
 * The GT object.
 *
 * @emits GT#init_state
 * @emits GT#connected
 * @emits GT#disconnected
 * @emits GT#user_updated_reliable
 * @emits GT#user_updated_unreliable
 * @emits GT#state_updated_reliable
 * @emits GT#state_updated_unreliable
 * @emits GT#connect
 * @emits GT#disconnect
 * @emits GT#connect_error
 * @emits GT#error
 *
 * @property {Object} socket The internal socket we use as communication.
 * @property {String} id Our unique identifier, undefined when we are not connected to the server.
 */
class GT extends EventEmitter {
  /**
     * Returns a new GT object.
     * @param {String} serverIp Optional ip to connect to
     */
  constructor (serverIp) {
    super()

    const socket = io(serverIp, {
      autoConnect: false,
      reconnection: false
    })

    this.socket = socket

    // when someone joins a room, including us
    socket.on('connected', (id, user) => {
      this.emit('connected', id, user)
    })

    // when someone leaves the room
    socket.on('disconnected', (id, reason) => {
      this.emit('disconnected', id, reason)
    })

    socket.on('user_updated_reliable', (id, payloadDelta) => {
      this.emit('user_updated_reliable', id, payloadDelta)
    })
    socket.on('user_updated_unreliable', (id, payloadDelta) => {
      this.emit('user_updated_unreliable', id, payloadDelta)
    })

    socket.on('state_updated_reliable', (id, payloadDelta) => {
      this.emit('state_updated_reliable', id, payloadDelta)
    })
    socket.on('state_updated_unreliable', (id, payloadDelta) => {
      this.emit('state_updated_unreliable', id, payloadDelta)
    })

    this.id = undefined
    this.room = undefined

    // when we disconnect from the server
    socket.on('disconnect', (reason) => {
      this.emit('disconnect', reason)

      this.id = undefined
      this.room = undefined
    })

    // when we join a room
    socket.on('joined', (room, roomState, users) => {
      this.room = room

      this.emit('joined', room, roomState, users)
    })

    // when we auth.
    socket.on('authed', (authPayload) => {
      this.id = authPayload.id

      this.emit('authed', authPayload.id, authPayload.state)
    })

    // when any error is thrown
    socket.on('error', (err) => {
      this.emit('error', err)
    })

    // when a connect error is thrown
    socket.on('connect_error', (err) => {
      this.emit('connect_error', err)
    })

    // when we connect to the server
    socket.on('connect', (socketId) => {
      this.emit('connect', socketId)
    })

    // when we were removed form a room
    socket.on('leftroom', (reason) => {
      this.room = undefined
      this.emit('leftroom', reason)
    })

    this.removeObjectsWithNull = obj => {
      return _(obj)
        .pickBy(_.isObject) // get only objects
        .mapValues(this.removeObjectsWithNull) // call only for values as objects
        .assign(_.omitBy(obj, _.isObject)) // save back result that is not object
        .omitBy(_.isNil) // remove null and undefined from object
        .value() // get value
    }
  }

  /**
     * @returns {Boolean} If we are connected to the server.
     */
  isConnected () {
    return this.socket.connected
  }

  /**
     * @returns {Boolean} If we are authenticated
     */
  isAuthed () {
    return this.id !== undefined
  }

  /**
     * @returns {Boolean} If we are in a room
     */
  isInRoom () {
    return this.room !== undefined
  }

  /**
     * @async
     * Connects to the server and joins a room, returns when we connect successfully.
     * @throws Error when cannot connect for some reason.
     * @param {String} id The id we want to assign and auth ourselves as.
     * @param {String} room The roomname we want to join.
     * @param {Object} userPayload An optional initial state we have as a user.
     */
  connect () {
    return new Promise((resolve, reject) => {
      if (this.isConnected()) { reject(new Error('We are already connected.')) }

      let handleConnect
      let handleConnectError
      this.socket.once('connect', handleConnect = (socketId) => {
        this.socket.off('connect_error', handleConnectError)

        resolve(socketId)
      })
      this.socket.once('connect_error', handleConnectError = (err) => {
        this.socket.off('connect', handleConnect)

        reject(err)
      })

      this.socket.connect()
    })
  }

  auth (id) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) { reject(new Error('We need to be connected.')) }
      if (this.isAuthed()) { reject(new Error('We already authed')) }

      let handleAuth
      let handleAuthError
      this.socket.once('auth', handleAuth = (authPayload) => {
        this.socket.off('error', handleAuthError)

        resolve(authPayload)
      })
      this.socket.on('error', handleAuthError = (err) => {
        if (err.type !== 'auth') return

        this.socket.off('error', handleAuthError)
        this.socket.off('auth', handleAuth)

        reject(err)
      })

      this.socket.emit('auth', {
        id
      })
    })
  }

  join (room, userPayload) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) { reject(new Error('We need to be connected.')) }
      if (!this.isAuthed()) { reject(new Error('We need to be authed.')) }
      if (this.isInRoom()) { reject(new Error('We Already in room')) }

      let handleJoin
      let handleJoinError
      this.socket.once('joined', handleJoin = (room, roomState, users) => {
        this.socket.off('error', handleJoinError)

        resolve(room, roomState, users)
      })
      this.socket.on('error', handleJoinError = (err) => {
        if (err.type !== 'join') return

        this.socket.off('error', handleJoinError)
        this.socket.off('auth', handleJoin)

        reject(err)
      })

      this.socket.emit('join', { room }, userPayload)
    })
  }

  /**
     * Disconnects from the server.
     */
  disconnect () {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) { reject(new Error('We already disconnected')) }

      this.socket.once('disconnect', () => {
        resolve()
      })

      this.socket.disconnect()
    })
  }

  leaveRoom () {
    return new Promise((resolve, reject) => {
      if (!this.isInRoom()) { reject(new Error('We need to be in a room')) }

      let handleLeave
      let handleLeaveError
      this.socket.once('leftroom', handleLeave = (reason) => {
        this.socket.off('error', handleLeaveError)

        resolve(reason)
      })
      this.socket.on('error', handleLeaveError = (err) => {
        if (err.type !== 'leaveroom') return

        this.socket.off('error', handleLeaveError)
        this.socket.off('leftroom', handleLeave)

        reject(err)
      })

      this.socket.emit('leaveroom')
    })
  }

  /**
     * Sends to the server a delta of the room's state immediately.
     * @param {Object} payloadDelta The delta object to send to the server.
     */
  updateStateReliable (payloadDelta) {
    if (!this.isInRoom()) { throw new Error('Need to be in a room') }
    this.socket.emit('state_updated_reliable', payloadDelta)
    return this
  }

  /**
     * Sends to the server a delta of the room's state. If we send too fast, the server will queue our messages and collapse.
     * @param {Object} payloadDelta The delta object to send to the server.
     */
  updateStateUnreliable (payloadDelta) {
    if (!this.isInRoom()) { throw new Error('Need to be in a room') }
    this.socket.emit('state_updated_unreliable', payloadDelta)
    return this
  }

  /**
     * Sends to the server a delta of the our user's state immediately.
     * @param {Object} payloadDelta The delta object to send to the server.
     */
  updateUserReliable (payloadDelta) {
    if (!this.isInRoom()) { throw new Error('Need to be in a room') }
    this.socket.emit('user_updated_reliable', payloadDelta)
    return this
  }

  /**
     * Sends to the server a delta of the our user's state. If we send too fast, the server will queue our messages and collapse.
     * @param {Object} payloadDelta The delta object to send to the server.
     */
  updateUserUnreliable (payloadDelta) {
    if (!this.isInRoom()) { throw new Error('Need to be in a room') }
    this.socket.emit('user_updated_unreliable', payloadDelta)
    return this
  }
}

module.exports = GT
