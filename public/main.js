socket = io()

var width = window.innerWidth;
var height = window.innerHeight;

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

function intToRGB(i){
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
}

function createCircle(s, socket_id) {
    const obj = {
        fill: '#'+ intToRGB(hashCode(socket_id)),
        radius: 20,
      }

    if (s.x) obj.x = s.x
    if (s.y) obj.y = s.y

    return new Konva.Circle(obj);
}

// listen for whole new state
socket.on('state', s => {
    console.log('Got whole new state:', s)

    for (socket_id in s) {
        const circle = createCircle(s[socket_id], socket_id)

        // add the circle to the konva group
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

    // add the circle to the konva group
    group.add(circle)
    circles[socket_id] = circle

    layer.batchDraw()
})


// listen for disconnections
socket.on('disconnected', socket_id => {
    console.log(`${socket_id} has disconnected.`)

    // delete the circle
    const circle = circles[socket_id]

    circle.destroy()
    layer.batchDraw()
    delete circles[socket_id]
})

// listen for stateupdates
socket.on('stateupdate', e => {
    console.log('Got a stateupdate:', e)

    if (!e.socket_id || !e.x || !e.y) return //throw away bad messages

    const socket_id = e.socket_id
    const circle = circles[socket_id]

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

stage.on('mousemove', e => {
  var pos = getRelativePointerPosition(group);

  socket.emit('stateupdate', pos)
});
