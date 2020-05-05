function createSocket(
    onInitState = (state, users) => {},
    onSelfDisconnect = reason => {},
    onUserConnected = socket_id => {},
    onUserDisconnected = (socket_id, reason) => {},
    onUserUpdated = (socket_id, payload_delta) => {},
    onStateUpdated = (socket_id, payload_delta) => {}) {
    const socket = io()

    socket.on('init_state', onInitState)
    socket.on('disconnect', onSelfDisconnect)
    
    socket.on('connected', onUserConnected)
    socket.on('disconnected', onUserDisconnected)
    socket.on('user_updated', onUserUpdated)

    socket.on('state_updated', onStateUpdated)

    socket.updateState = payload_delta => {
        socket.emit('state_updated', payload_delta)
    }

    socket.updateUser = payload_delta => {
        socket.emit('user_updated', payload_delta)
    }

    return socket
}

var width = window.innerWidth;
var height = window.innerHeight * 0.7;

var stage = new Konva.Stage({
    container: 'container',
    width: width,
    height: height,
    x: 20,
    y: 50,
});

var layer = new Konva.Layer({
    scaleX: 1.2,
    scaleY: 0.8,
    rotation: 5,
});
stage.add(layer);

var group = new Konva.Group({
    x: 30,
    rotation: 10,
    scaleX: 1.5,
});
layer.add(group);

var text = new Konva.Text({
    text: 'Move on the canvas to draw a circle',
    fontSize: 20,
});
group.add(text);
layer.draw();

const circles = {}


// https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
function hashCode(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}
function intToRGB(i) {
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
}

function createCircle(s, socket_id) {
    const obj = {
        fill: '#' + intToRGB(hashCode(socket_id)),
        radius: 20,
    }

    if (s.x) obj.x = s.x
    if (s.y) obj.y = s.y

    return new Konva.Circle(obj);
}

const textarea = document.getElementById('livetext')
const textarea2 = document.getElementById('livetext2')

const onInitState = (state, users) => {
    console.log('Got whole new state:', state, users)

    // draw a circle for each user... our OWN circle will be in here...
    for (const socket_id in users) {
        const circle = createCircle(users[socket_id], socket_id)
        group.add(circle)
        circles[socket_id] = circle
    }

    // init the textareas from the state.
    if (state.text !== undefined)
        textarea.value = state.text
    if (state.text2 !== undefined)
        textarea2.value = state.text2

    layer.batchDraw()
}

const onSelfDisconnect = reason => {
    console.log(`We have disconnected (${reason}).`)

    // clean up the circles...
    for (const socket_id in circles) {
        const circle = circles[socket_id]
        circle.destroy()
        delete circles[socket_id]
    }
    
    layer.batchDraw()
}

const onUserConnected = socket_id => {
    if (socket_id === socket.id) return // ignore our own connected message
    console.log(`${socket_id} has connected.`)

    // create the circle
    const circle = createCircle({}, socket_id)
    group.add(circle)
    circles[socket_id] = circle

    layer.batchDraw()
}

const onUserDisconnected = socket_id => {
    console.log(`${socket_id} has disconnected.`)

    // delete the circle
    const circle = circles[socket_id]
    if (!circle) return

    circle.destroy()
    layer.batchDraw()
    delete circles[socket_id]
}

const onUserUpdated = (socket_id, payload_delta) => {
    console.log('Got a userupdate:', socket_id, payload_delta)

    if (!socket_id || !payload_delta.x || !payload_delta.y) return //throw away bad messages
    if (socket_id === socket.id) return // ignore our own...

    // update the user's circle.
    const circle = circles[socket_id]
    if (!circle) return

    circle.x(payload_delta.x)
    circle.y(payload_delta.y)

    layer.batchDraw()
}

const onStateUpdated = (socket_id, payload_delta) => {
    console.log('Got a stateupdate:', socket_id, payload_delta)

    if (socket_id === socket.id) return // ignore our own change

    if (payload_delta.text !== undefined)
        textarea.value = payload_delta.text

    if (payload_delta.text2 !== undefined)
        textarea2.value = payload_delta.text2
}

const socket = createSocket(onInitState, onSelfDisconnect, onUserConnected, onUserDisconnected, onUserUpdated, onStateUpdated)



// this function will return pointer position relative to the passed node
function getRelativePointerPosition(node) {
    var transform = node.getAbsoluteTransform().copy();
    // to detect relative position we need to invert transform
    transform.invert();

    // get pointer (say mouse or touch) position
    var pos = node.getStage().getPointerPosition();

    // now we can find relative point
    return transform.point(pos);
}


// when a mouse move happens, lets push the event to the server.
stage.on('mousemove', e => {
    var pos = getRelativePointerPosition(group);

    // move our own locally...
    const socket_id = socket.id
    const circle = circles[socket_id]
    if (!circle) return

    circle.x(pos.x)
    circle.y(pos.y)

    layer.batchDraw()

    // send the update
    socket.updateUser(pos)
});


// listen for the textareas changing...
textarea.addEventListener('input', e => {
    const text = e.target.value

    // and send the update to the server.
    socket.updateState({ text })
})

textarea2.addEventListener('input', e => {
    const text2 = e.target.value

    socket.updateState({ text2 })
})
