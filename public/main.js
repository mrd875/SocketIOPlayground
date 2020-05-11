// konva setup
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

// the circles of each user.
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

const gt = new GT('localhost:3000')

gt.on('init_state', (state, users) => {
    console.log('Got whole new state:', state, users)

    // draw a circle for each user... our OWN circle will be in here...
    for (const id in users) {
        const circle = createCircle(users[id], id)
        group.add(circle)
        circles[id] = circle
    }

    // init the textareas from the state.
    if (state.text !== undefined)
        textarea.value = state.text
    if (state.text2 !== undefined)
        textarea2.value = state.text2

    layer.batchDraw()
})

gt.on('disconnect', reason => {
    console.log(`We have disconnected (${reason}).`)

    // clean up the circles...
    for (const id in circles) {
        const circle = circles[id]
        circle.destroy()
        delete circles[id]
    }
    
    layer.batchDraw()
})

gt.on('connected', (id, user_payload) => {
    if (id === gt.id) return // ignore our own connected message
    console.log(`${id} has connected.`)

    // create the circle
    const circle = createCircle(user_payload, id)
    group.add(circle)
    circles[id] = circle

    layer.batchDraw()
})

gt.on('disconnected', (id, reason) => {
    console.log(`${id} has disconnected (${reason}).`)

    // delete the circle
    const circle = circles[id]
    if (!circle) return

    circle.destroy()
    layer.batchDraw()
    delete circles[id]
})

gt.on('user_updated_unreliable', (id, payload_delta) => {
    console.log('Got a userupdateunreliable:', id, payload_delta)

    if (!payload_delta.x || !payload_delta.y) return //throw away bad messages
    if (id === gt.id) return // ignore our own...

    // update the user's circle.
    const circle = circles[id]
    if (!circle) return

    // client sided smoothing.
    // instead of teleporting the circle, we will tween to the location
    new Konva.Tween({
        node: circle,
        duration: 0.05, // server only allows 20 unreliable messages a second.
        easing: Konva.Easings.Linear,
        ...payload_delta
      }).play()

    layer.batchDraw()
})

gt.on('state_updated_reliable', (id, payload_delta) => {
    console.log('Got a stateupdatereliable:', id, payload_delta)

    if (id === gt.id) return // ignore our own change

    if (payload_delta.text !== undefined)
        textarea.value = payload_delta.text

    if (payload_delta.text2 !== undefined)
        textarea2.value = payload_delta.text2
})

gt.on('state_updated_unreliable', (id, payload_delta) => {
    console.log('Got a stateupdateunreliable:', id, payload_delta)

    if (id === gt.id) return // ignore our own change

    if (payload_delta.text !== undefined)
        textarea.value = payload_delta.text

    if (payload_delta.text2 !== undefined)
        textarea2.value = payload_delta.text2
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
    const id = gt.id
    const circle = circles[id]
    if (!circle) return

    circle.x(pos.x)
    circle.y(pos.y)

    layer.batchDraw()

    // send the update
    gt.updateUserUnreliable(pos)
});


// listen for the textareas changing...
textarea.addEventListener('input', e => {
    const text = e.target.value

    // and send the update to the server.
    gt.updateStateUnreliable({ text })
})

textarea.addEventListener('change', e => {
    const text = e.target.value

    // and send the update to the server.
    gt.updateStateReliable({ text })
})

textarea2.addEventListener('input', e => {
    const text2 = e.target.value

    gt.updateStateUnreliable({ text2 })
})

textarea2.addEventListener('change', e => {
    const text2 = e.target.value

    // and send the update to the server.
    gt.updateStateReliable({ text2 })
})
