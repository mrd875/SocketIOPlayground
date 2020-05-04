const socket = io()


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

// listen for users update
socket.on('users', s => {
    console.log('Got whole new users:', s)

    for (socket_id in s) {
        // create the circle, our OWN circle will be in here...
        const circle = createCircle(s[socket_id], socket_id)
        group.add(circle)
        circles[socket_id] = circle
    }

    layer.batchDraw()
})

// listen for connections
socket.on('connected', socket_id => {
    if (socket_id === socket.id) return // ignore our own connected message
    console.log(`${socket_id} has connected.`)

    // create the circle
    const circle = createCircle({}, socket_id)
    group.add(circle)
    circles[socket_id] = circle

    layer.batchDraw()
})


// listen for disconnections
socket.on('disconnected', socket_id => {
    console.log(`${socket_id} has disconnected.`)

    // delete the circle
    const circle = circles[socket_id]
    if (!circle) return

    circle.destroy()
    layer.batchDraw()
    delete circles[socket_id]
})

// listen for when we disconnect
socket.on('disconnect', (reason) => {
    console.log(`We have disconnected (${reason}).`)

    // clean up
    for (socket_id in circles) {
        const circle = circles[socket_id]
        circle.destroy()
        delete circles[socket_id]
    }
    
    layer.batchDraw()
})

// listen for userupdates
socket.on('userupdate', e => {
    console.log('Got a userupdate:', e)

    if (!e.socket_id || !e.x || !e.y) return //throw away bad messages
    if (e.socket_id === socket.id) return // ignore our own...

    // update the user's circle.
    const socket_id = e.socket_id
    const circle = circles[socket_id]

    if (!circle) return

    circle.x(e.x)
    circle.y(e.y)

    layer.batchDraw()
})



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

    socket.emit('userupdate', pos)
});



const textarea = document.getElementById('livetext')
const textarea2 = document.getElementById('livetext2')

// init the state when we recieve it
socket.on('state', s => {
    console.log('Got whole new state:', s)

    if (s.text !== undefined) {
        textarea.value = s.text
    }

    if (s.text2 !== undefined) {
        textarea2.value = s.text2
    }
})

// when we recieve a stateupdate
socket.on('stateupdate', e => {
    console.log('Got a stateupdate:', e)

    if (e.socket_id === socket.id) return // ignore our own change

    if (e.text !== undefined)
        textarea.value = e.text

    if (e.text2 !== undefined)
        textarea2.value = e.text2
})

textarea.addEventListener('input', e => {
    const text = e.target.value

    socket.emit('stateupdate', { text })
})

textarea2.addEventListener('input', e => {
    const text2 = e.target.value

    socket.emit('stateupdate', { text2 })
})
