# GT Client

> GroupwareToolkit Client

## Build Setup

```bash
# install dependencies
$ npm install

# start a dev build with live reload building on changes.
$ npm run dev

# build for production
$ npm run build
```

This is a socket.io client application. Its designed to abstract away communication of messages from a foreign source from developers.

The server is completely independent of client logic and is only keeping a collective state for the users and rooms.

You need the server (https://github.com/mrd875/GroupwareToolkitServer).

## Usage

I'll be using async/await as the GT API is promise based. (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)

### Create the GT object.
```javascript
  const gt = new GT('http://localhost:3000/')
```
We can pass in the address of the GT Server we are connecting to.


### Connect to the server.
```javascript
  try {
    await gt.connect()
  } catch (e) {
    // connection error! abort
    console.error(e)
    return
  }
```
We now try to connect to the server. We could get an error, so we need to catch it.

### Auth
```javascript
  try {
    await gt.auth('ourUniqueId')
  } catch (e) {
    // an auth error! abort!
    console.error(e)
    return
  }
```
We now try to authenticate. We could get an error, so we need to catch it.

### Join a room
```javascript
  let {room, roomState, users} = await gt.join('roomName', {test: 'this argument is optional'})

  console.log(`We joined room ${room}\n\n`)


  console.log('The rooms state is:')
  console.log(roomState)
  console.log('\n\n')


  console.log('The users in the room and their states:')
  console.log(users)
  console.log('\n\n')
```
We joined the room 'roomName', the last argument is optional, it sets your initial user state on the server.

## How it works

### Getting authed
First of all, we have a server, listening for connections. Once the server receives a connection, its going to listen for messages from them.

The server will not allow the user to do anything until they are first authenticated. Currently its simply having the user send a ('auth', authObject) message to the server. This authObject needs to have a 'id' key in it, containing the ID the user wishes to have.

The server will then send back an ('auth', authObject) back to the user confirming the auth was successful.

### Joining a room
Now the authed user will need to join a room.

The user needs to send a ('join', roomObject, userObj) message. The roomObject needs to contain a 'room' key in it, containing what room they want to join. The userObj is an optional override to the initial state of the joining user's state.

The server will send back a ('joined', room, stateObj, usersObj) message back to the user.

### In a room
In the 'joined' message from the server will have data containing the initial base state of the room.

The stateObj will contain the current state of the room at the time of joining it.

The usersObj will contain all the users in the room and their states at the time of joining the room.

A ('connected', user_id, user_state) message will be emitted to everyone in the room.
The user_id being the unique id of the user that just joined the room, and the user_state being the state of the user.

When the user leaves the room, a ('disconnected', user_id, reason) message will be emitted to everyone in the room.

### Sending messages
The server will now listen for two types of messages from the connected client. A user updated and state updated message.

A user update message will apply a payload to the sender's state.
A state update message will apply a payload to the room's state.

Each of these types will have two different types of messages, a reliable and unreliable message.
A reliable message will be sent, processed and replied to as fast as possible.
An unreliable message will be sent, and for a small amount of time, any other unreliable messages will be condensed and queued until the time is up. 
Once the time is up, it'll then be processed and replied to.


The payloads being sent with these messages will always be deltas, the deltas will be merged into the respected states it is supposed to part of.


If the payload contains any null value'd keys, these keys will be removed from the server's state.
A reply will be emitted to all users within the room, containing the same delta object that the server received.

### State handling

It will be entirely up to the clients (developers) to keep track of the state and messages they receive from the server, they receive enough information from the server so that they will be able to keep track and keep a consistent application going.

A developer can use the GT object on the client side to communicate with the server. The GT object will emit events to the developer and allow developers to send messages.

