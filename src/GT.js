/* eslint-disable require-await */
const EventEmitter = require('./EventEmitter')
const io = require('socket.io-client')
const _ = require('lodash')

/**
 * Fired when the server tells us we have authed.
 *
 * @event GT#authed
 * @param {String} id The id we were given. (typically the id we gave the server)
 * @param {Object} state The state of the user object that was on the server. (the state of the user before we authed)
 */

/**
 * Fires when we just joined a room.
 *
 * @event GT#joined
 * @param {String} room the name of the room
 * @param {Object} state The state of the room.
 * @param {Object} users All the users and their states. Key'd by user id, value being the state of the user.
 */

/**
 * Fires when we left a room for any reason.
 *
 * @event GT#leftroom
 * @param {String} reason The reason why we left the room.
 */

/**
* Fires when someone joins the room.
*
* @event GT#connected
* @param {String} id The id of who joined the room.
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
 * Fires when we receive an error from the server.
 *
 * @event GT#error
 * @param {Object} error
 */

/**
 * Fires when we receive a connection error when trying to connect to the server.
 *
 * @event GT#connect_error
 * @param {Object} error
 */

/**
* Fires when we receive a delta of a user's state of the reliable channel.
*
* @event GT#user_updated_reliable
* @param {String} id The id of the user who's state got updated.
* @param {Object} payloadDelta The delta of the state.
*/

/**
* Fires when we receive a delta of a user's state of the unreliable channel.
*
* @event GT#user_updated_unreliable
* @param {String} id The id of the user who's state got updated.
* @param {Object} payloadDelta The delta of the state.
*/

/**
* Fires when we receive a delta of the room's state of the reliable channel.
*
* @event GT#state_updated_reliable
* @param {String} id The id of the user who sent the update
* @param {Object} payloadDelta The delta of the state.
*/

/**
* Fires when we receive a delta of the room's state of the unreliable channel.
*
* @event GT#state_updated_unreliable
* @param {String} id The id of the user who sent the update
* @param {Object} payloadDelta The delta of the state.
*/

/**
* Fires when we receive a delta of the room's state for both reliable and unreliable channels.
*
* @event GT#state_updated
* @param {String} id The id of the user who sent the update
* @param {Object} payloadDelta The delta of the state.
*/

/**
* Fires when we receive a delta of a user's state for both reliable and unreliable channels.
*
* @event GT#user_updated
* @param {String} id The id of the user who sent the update
* @param {Object} payloadDelta The delta of the state.
*/

/**
* Fires when we receive an array of messages of a user's delta state.
*
* @event GT#user_updated_batched
* @param {String} id The id of the user who sent the update
* @param {Object} e An array of payloadDeltas in order.
*/

/**
* Fires when we receive an array of messages of the room's delta state.
*
* @event GT#state_updated_batched
* @param {String} id The id of the user who sent the update
* @param {Object} e An array of payloadDeltas in order.
*/

/**
* Fires when the users object is updated. Only when handling of state is enabled.
*
* @event GT#users_object_updated
*/

/**
* Fires when the state object is updated. Only when handling of state is enabled.
*
* @event GT#state_object_updated
*/

/**
 * The GT object.
 *
 * @emits GT#connected
 * @emits GT#disconnected
 * @emits GT#user_updated_reliable
 * @emits GT#user_updated_unreliable
 * @emits GT#state_updated_reliable
 * @emits GT#state_updated_unreliable
 * @emits GT#state_updated
 * @emits GT#user_updated
 * @emits GT#users_object_updated
 * @emits GT#state_object_updated
 * @emits GT#connect
 * @emits GT#disconnect
 * @emits GT#connect_error
 * @emits GT#error
 * @emits GT#authed
 * @emits GT#joined
 * @emits GT#leftroom
 * @emits GT#state_updated_batched
 * @emits GT#user_updated_batched
 *
 * @property {Object} socket The internal socket we use as communication.
 * @property {String} id Our unique identifier, undefined when we are not authed.
 * @property {String} room What room we are currently in. undefined when we are not in a room.
 *
 * @property {Object} state If we are handling the state, state of the current room
 * @property {Object} users If we are handling the state, state of all the users in the room.
 */
class GT extends EventEmitter {
  /**
   * Returns a new GT object.
   * @param {String} serverIp Optional ip to connect to
   */
  constructor (serverIp, opts = {}) {
    super()

    // create the socket
    const socket = io(serverIp, {
      autoConnect: false,
      reconnection: false
    })

    // check if we should handle the state.
    if (opts.handleState) this.__handleState = true

    this.socket = socket

    // init the state variables...
    this.id = undefined
    this.room = undefined
    if (this.isHandlingState()) {
      this.users = {}
      this.state = {}
      this.emit('users_object_updated')
      this.emit('state_object_updated')
    }

    // when someone joins a room, including us
    socket.on('connected', (id, user) => {
      // update our state if we need too
      if (this.isHandlingState()) {
        this.users[id] = user
        this.emit('users_object_updated')
      }

      // emit the message out
      this.emit('connected', id, user)
    })

    // when someone leaves the room
    socket.on('disconnected', (id, reason) => {
      // update our state if we need too
      if (this.isHandlingState()) {
        delete this.users[id]
        this.emit('users_object_updated')
      }

      // emit the message out
      this.emit('disconnected', id, reason)
    })

    // helper function to update the state of a user
    const updateUser = (id, payloadDelta) => {
      if (this.isHandlingState()) {
        // do the same logic of apply deltas as the server...
        _.merge(this.users[id], payloadDelta)
        this.users[id] = this.removeObjectsWithNull(this.users[id])

        // emit a message out
        this.emit('users_object_updated')
      }
    }

    // helper function to update the state of a user
    const updateState = (id, payloadDelta) => {
      if (this.isHandlingState()) {
        // do the same logic of apply deltas as the server...
        _.merge(this.state, payloadDelta)
        this.state = this.removeObjectsWithNull(this.state)

        // emit a message out
        this.emit('state_object_updated')
      }
    }

    // when a user updated their state via the reliable channel
    socket.on('user_updated_reliable', (id, payloadDelta) => {
      // handle state change
      updateUser(id, payloadDelta)

      // emit the message out
      this.emit('user_updated_reliable', id, payloadDelta)
      this.emit('user_updated', id, payloadDelta)
    })

    // when a user updated their state via the unreliable channel
    socket.on('user_updated_unreliable', (id, payloadDelta) => {
      // handle state change
      updateUser(id, payloadDelta)

      // emit the message out
      this.emit('user_updated_unreliable', id, payloadDelta)
      this.emit('user_updated', id, payloadDelta)
    })

    // when a user updated their state via the batched channel
    socket.on('user_updated_batched', async (id, e) => {
      // e is an array of messages we need to apply in order...

      // we wait until applying the next delta to smooth out the messages, so they all don't apply instantly
      const waittime = this.BATCH_INTERVAL / e.length
      for (let i = 0; i < e.length; i++) {
        const msg = e[i]

        // apply the delta to our state
        updateUser(id, msg)

        // emit that message
        this.emit('user_updated', id, msg)

        // smooth out the messages with waiting a few milliseconds
        if (i < e.length - 1) { await new Promise(resolve => setTimeout(resolve, waittime)) }
      }

      // emit the message
      this.emit('user_updated_batched', id, e)
    })

    // when a user updated the room's state via the reliable channel
    socket.on('state_updated_reliable', (id, payloadDelta) => {
      // handle state change
      updateState(id, payloadDelta)

      // emit the message out
      this.emit('state_updated_reliable', id, payloadDelta)
      this.emit('state_updated', id, payloadDelta)
    })

    // when a user updated the room's state via the unreliable channel
    socket.on('state_updated_unreliable', (id, payloadDelta) => {
      // handle state change
      updateState(id, payloadDelta)

      // emit the message out
      this.emit('state_updated_unreliable', id, payloadDelta)
      this.emit('state_updated', id, payloadDelta)
    })

    // when a user updated their state via the batched channel
    socket.on('state_updated_batched', async (id, e) => {
      // e is an array of messages we need to apply in order...

      // we wait until applying the next delta to smooth out the messages, so they all don't apply instantly
      const waittime = this.BATCH_INTERVAL / e.length
      for (let i = 0; i < e.length; i++) {
        const msg = e[i]

        // apply the delta to our state
        updateState(id, msg)

        // emit that message
        this.emit('state_updated', id, msg)

        // smooth out the messages with waiting a few milliseconds
        if (i < e.length - 1) { await new Promise(resolve => setTimeout(resolve, waittime)) }
      }

      // emit the message
      this.emit('state_updated_batched', id, e)
    })

    // when we disconnect from the server
    socket.on('disconnect', (reason) => {
      // clear our state variables...
      this.id = undefined
      this.room = undefined
      if (this.isHandlingState()) {
        this.users = {}
        this.state = {}
        this.emit('users_object_updated')
        this.emit('state_object_updated')
      }

      // emit the message
      this.emit('disconnect', reason)
    })

    // when we join a room
    socket.on('joined', (room, roomState, users) => {
      // update our state variables...
      this.room = room
      if (this.isHandlingState()) {
        this.users = users
        this.state = roomState
        this.emit('users_object_updated')
        this.emit('state_object_updated')
      }

      // emit the message out...
      this.emit('joined', room, roomState, users)
    })

    // when we authenticate
    socket.on('authed', (authPayload) => {
      // update our state variables.
      this.id = authPayload.id
      if (this.isHandlingState()) {
        this.users[authPayload.id] = authPayload.state
        this.emit('users_object_updated')
      }

      // emit the message out.
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
    socket.on('connect', () => {
      this.emit('connect', socket.id)
    })

    // when we were removed from a room
    socket.on('leftroom', (reason) => {
      // update our state variables...
      this.room = undefined
      if (this.isHandlingState()) {
        this.users = {}
        this.state = {}
        this.emit('users_object_updated')
        this.emit('state_object_updated')
      }

      // emit the message
      this.emit('leftroom', reason)
    })

    // the same logic as the server to remove null values from an object.
    this.removeObjectsWithNull = obj => {
      return _(obj)
        .pickBy(_.isObject) // get only objects
        .mapValues(this.removeObjectsWithNull) // call only for values as objects
        .assign(_.omitBy(obj, _.isObject)) // save back result that is not object
        .omitBy(_.isNil) // remove null and undefined from object
        .value() // get value
    }

    // generates a random string
    // thanks https://gist.github.com/6174/6062387
    this.generateRandomId = () => {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }

    // setup the batch message handler...

    // how often to send out the messages.
    this.BATCH_INTERVAL = 50
    this.BATCH_EVENT_LISTENER = new EventEmitter()

    // the array of messages
    this.BATCH_STATE_ARRAY = []
    this.__stateBatchHandler()

    // the array of messages
    this.BATCH_USER_ARRAY = []
    this.__userBatchHandler()
  }

  /**
   * @returns {Boolean} If we are handling the state. If true, this.users will contain the users in the current room, and this.state will contain the state of the room.
   */
  isHandlingState () {
    return this.__handleState === true
  }

  /**
     * @returns {Boolean} If we are connected to the server.
     */
  isConnected () {
    return this.socket.connected === true
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
     * Connects to the server, authenticates and joins a room.
     * @throws Errors
     * @param {String} id The id we want to assign and auth ourselves as.
     * @param {String} room The roomname we want to join.
     * @param {Object} userPayload An optional initial state we have as a user.
     */
  async connectAuthAndJoin (id, room, userPayload) {
    await this.connect()
    await this.auth(id)
    await this.join(room, userPayload)
  }

  /**
     * @async
     * Connects to the server, returns when we connect.
     * @throws Error when cannot connect for some reason.
     * @throws Error if we are already connected.
     */
  connect () {
    return new Promise((resolve, reject) => {
      if (this.isConnected()) { reject(new Error('We are already connected.')) }

      // setup events to catch when we fail or succeed in connecting
      let handleConnect
      let handleConnectError
      this.socket.once('connect', handleConnect = () => {
        this.socket.off('connect_error', handleConnectError)

        resolve()
      })
      this.socket.once('connect_error', handleConnectError = (err) => {
        this.socket.off('connect', handleConnect)

        reject(err)
      })

      // now try to connect.
      this.socket.connect()
    })
  }

  /**
     * @async
     * Authenticates to the server. Returns when we authenticate.
     * @throws Error when we cannot auth.
     * @param {String} id The id we want to assign and auth ourselves as.
     */
  auth (id) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) { reject(new Error('We need to be connected.')) }
      if (this.isAuthed()) { reject(new Error('We already authed')) }

      // setup the events to catch when we fail or succeed in authing.
      let handleAuth
      let handleAuthError
      this.socket.once('authed', handleAuth = (authPayload) => {
        this.socket.off('error', handleAuthError)

        resolve({ id: authPayload.id, state: authPayload.state })
      })
      this.socket.on('error', handleAuthError = (err) => {
        if (err.type !== 'auth') return

        this.socket.off('error', handleAuthError)
        this.socket.off('auth', handleAuth)

        reject(err)
      })

      if (!id) id = this.socket.id

      // send the auth packet
      this.socket.emit('auth', {
        id
      })
    })
  }

  /**
     * @async
     * Joins a room. Returns when we have joined.
     * @throws Error when we cannot join the room.
     * @param {String} room The roomname we want to join.
     * @param {Object} userPayload An optional initial state we have as a user.
     */
  join (room, userPayload) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) { reject(new Error('We need to be connected.')) }
      if (!this.isAuthed()) { reject(new Error('We need to be authed.')) }
      if (this.isInRoom()) { reject(new Error('We Already in room')) }

      // setup the events to catch when we fail or succeed in joining a room.
      let handleJoin
      let handleJoinError
      this.socket.once('joined', handleJoin = (room, roomState, users) => {
        this.socket.off('error', handleJoinError)

        resolve({ room, roomState, users })
      })
      this.socket.on('error', handleJoinError = (err) => {
        if (err.type !== 'join') return

        this.socket.off('error', handleJoinError)
        this.socket.off('auth', handleJoin)

        reject(err)
      })

      if (!room) room = ''

      // send the packet to the server
      this.socket.emit('join', { room }, userPayload)
    })
  }

  /**
   * @async
     * Disconnects from the server. Returns when we disconnected.
     * @throws Error if we are not connected.
     */
  disconnect () {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) { reject(new Error('We already disconnected')) }

      this.socket.once('disconnect', () => {
        resolve()
      })

      // disconnect from the server.
      this.socket.disconnect()
    })
  }

  /**
   * @async
     * Leaves the room, returns when we left the room.
     * @throws Error if we cannot leave the room.
     */
  leaveRoom () {
    return new Promise((resolve, reject) => {
      if (!this.isInRoom()) { reject(new Error('We need to be in a room')) }

      // setup the events to catch when we fail or succeed in the leave room.
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

      // send the leave room packet.
      this.socket.emit('leaveroom')
    })
  }

  /**
     * Sends to the server a delta of the room's state immediately.
     * @param {Object} payloadDelta The delta object to send to the server.
     */
  updateStateReliable (payloadDelta) {
    if (!this.isInRoom()) { throw new Error('Need to be in a room') }
    this.socket.emit('state_updated_reliable', payloadDelta) // send the delta to the server...
    return this
  }

  /**
     * Sends to the server a delta of the room's state. If we send too fast, the server will queue our messages and collapse.
     * @param {Object} payloadDelta The delta object to send to the server.
     */
  updateStateUnreliable (payloadDelta) {
    if (!this.isInRoom()) { throw new Error('Need to be in a room') }
    this.socket.emit('state_updated_unreliable', payloadDelta) // send the delta to the server...
    return this
  }

  /**
     * Sends to the server a delta of the our user's state immediately.
     * @param {Object} payloadDelta The delta object to send to the server.
     */
  updateUserReliable (payloadDelta) {
    if (!this.isInRoom()) { throw new Error('Need to be in a room') }
    this.socket.emit('user_updated_reliable', payloadDelta) // send the delta to the server...
    return this
  }

  /**
     * Sends to the server a delta of the our user's state. If we send too fast, the server will queue our messages and collapse.
     * @param {Object} payloadDelta The delta object to send to the server.
     */
  updateUserUnreliable (payloadDelta) {
    if (!this.isInRoom()) { throw new Error('Need to be in a room') }
    this.socket.emit('user_updated_unreliable', payloadDelta) // send the delta to the server...
    return this
  }

  /**
   * Sends to the server a delta of the our user's state immediately. (reliable)
   * @param {Object} payloadDelta The delta object to send to the server.
   */
  updateUser (payloadDelta) {
    return this.updateUserReliable(payloadDelta)
  }

  /**
   * Sends to the server a delta of the room's state immediately. (reliable)
   * @param {Object} payloadDelta The delta object to send to the server.
   */
  updateState (payloadDelta) {
    return this.updateStateReliable(payloadDelta)
  }

  /**
   * Handles the user message batching, every interval, it will flush the array of messages, and send it to the server.
   */
  async __userBatchHandler () {
    let lastMessageTime = 0

    for (;;) {
      const batchEventPromise = new Promise(resolve => this.BATCH_EVENT_LISTENER.once('user', resolve))
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, this.BATCH_INTERVAL))
      await Promise.race([timeoutPromise, batchEventPromise]) // we wait until either we receive a 'user' event OR we timeout
      this.BATCH_EVENT_LISTENER.off('user')

      if (this.BATCH_USER_ARRAY.length <= 0) { continue } // check if there is a batched message to send out

      const now = Date.now()
      if (now - lastMessageTime < this.BATCH_INTERVAL) { continue } // check if enough time has elapsed

      if (!this.isInRoom()) { this.BATCH_USER_ARRAY.length = 0; continue } // make sure we are in a room

      // send the message out
      lastMessageTime = now
      this.socket.emit('user_updated_batched', this.BATCH_USER_ARRAY)
      this.BATCH_USER_ARRAY.length = 0 // clear out the message array
    }
  }

  /**
   * Handles the state message batching.
   */
  async __stateBatchHandler () {
    let lastMessageTime = 0

    for (;;) {
      const batchEventPromise = new Promise(resolve => this.BATCH_EVENT_LISTENER.once('state', resolve))
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, this.BATCH_INTERVAL))
      await Promise.race([timeoutPromise, batchEventPromise]) // we wait until either we receive a 'state' event OR we timeout
      this.BATCH_EVENT_LISTENER.off('state')

      if (this.BATCH_STATE_ARRAY.length <= 0) { continue } // check if there is a batched message to send out

      const now = Date.now()
      if (now - lastMessageTime < this.BATCH_INTERVAL) { continue } // check if enough time has elapsed

      if (!this.isInRoom()) { this.BATCH_STATE_ARRAY.length = 0; continue } // make sure we are in a room

      // send the message out
      lastMessageTime = now
      this.socket.emit('state_updated_batched', this.BATCH_STATE_ARRAY)
      this.BATCH_STATE_ARRAY.length = 0 // clear out the message array
    }
  }

  /**
   * Sends to the server a delta of the room's state. Appends the message to an array of messages and sends it at an interval to limit send rates.
   * @param {Object} payloadDelta The delta object to send to the server.
   */
  updateStateBatched (payloadDelta) {
    if (!this.isInRoom()) { throw new Error('Need to be in a room') }

    this.BATCH_STATE_ARRAY.push(payloadDelta) // add the message to the array
    this.BATCH_EVENT_LISTENER.emit('state') // notify the batch handler we have a new message
    return this
  }

  /**
   * Sends to the server a delta of your user's state. Appends the message to an array of messages and sends it at an interval to limit send rates.
   * @param {Object} payloadDelta The delta object to send to the server.
   */
  updateUserBatched (payloadDelta) {
    if (!this.isInRoom()) { throw new Error('Need to be in a room') }

    this.BATCH_USER_ARRAY.push(payloadDelta) // add the message to the array
    this.BATCH_EVENT_LISTENER.emit('user') // notify the batch handler we have a new message
    return this
  }
}

module.exports = GT
