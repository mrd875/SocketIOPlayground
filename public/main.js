// konva setup
var width = window.innerWidth;
var height = window.innerHeight * 0.7;

var stage = new Konva.Stage({
    container: 'container',
    width: width,
    height: height,
    x: 20,
    y: 50,
    draggable: true
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

const lines = {}


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

function createCircle(s, id) {
    const obj = {
        fill: '#' + intToRGB(hashCode(id)),
        radius: 20,
        listening: false,
        ...s
    }

    return new Konva.Circle(obj);
}

function createLine(points, lineId) {
    const line = new Konva.Line({
        stroke: '#' + intToRGB(hashCode(lineId)),
        strokeWidth: 15,
        points,
        lineCap: 'round',
        lineJoin: 'round'
    })

    line.lineId = lineId

    return line
}

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


function fadeInNode(node) {
    node.opacity(0)

    // fade in
    new Konva.Tween({
        node: node,
        duration: 0.5,
        easing: Konva.Easings.Linear,
        opacity: 1
      }).play()
}

function fadeOutAndDestroyNode(node) {
    node.listening(false)
    // fade and destroy
    new Konva.Tween({
        node: node,
        duration: 0.5,
        easing: Konva.Easings.Linear,
        opacity: 0,
        onFinish() {
            node.destroy()
        }
      }).play()
}


const textarea = document.getElementById('livetext')
const textarea2 = document.getElementById('livetext2')

const gt = new GT()

const btn = document.getElementById('btn')
const room = document.getElementById('room')

btn.addEventListener('click', e => {
    if (gt.isConnected()) {
        gt.disconnect()
    } else {
        console.log('We are trying to connect.')
        gt.connect(room.value)

        btn.innerText = 'connecting...'
        btn.disabled = true

        room.disabled = true
    }
})

gt.on('init_state', (state, users, room) => {
    console.log('Got whole new state:', state, users, room)

    // draw a circle for each user... our OWN circle will be in here...
    for (const id in users) {
        const circle = createCircle(users[id], id)

        group.add(circle)
        circles[id] = circle

        fadeInNode(circle)
    }

    // init the textareas from the state.
    if (state.text !== undefined)
        textarea.value = state.text
    if (state.text2 !== undefined)
        textarea2.value = state.text2

    // init the lines
    if (state.lines) {
        for (const lineId in state.lines) {
            const lineObj = state.lines[lineId]

            const line = createLine(Object.values(lineObj.points), lineId)

            group.add(line)
            lines[lineId] = line

            line.zIndex(2)

            fadeInNode(line)
        }
    }

    layer.batchDraw()
})

gt.on('connect', id => {
    console.log(`We have connected, (${id}).`)

    textarea.disabled = false
    textarea2.disabled = false

    btn.innerText = 'disconnect'
    btn.disabled = false
})

gt.on('disconnect', reason => {
    console.log(`We have disconnected (${reason}).`)

    // clean up the circles...
    for (const id in circles) {
        const circle = circles[id]
        delete circles[id]

        fadeOutAndDestroyNode(circle)
    }

    // clean up the lines
    for (const id in lines) {
        const line = lines[id]
        delete lines[id]

        fadeOutAndDestroyNode(line)
    }

    textarea2.value = ''    
    textarea.value = ''  
    
    textarea.disabled = true
    textarea2.disabled = true

    btn.innerText = 'connect'
    room.disabled = false

    
    layer.batchDraw()
})

gt.on('connected', (id, user_payload) => {
    if (id === gt.id) return // ignore our own connected message
    console.log(`${id} has connected.`)

    // create the circle
    const circle = createCircle(user_payload, id)
    group.add(circle)
    circles[id] = circle

    fadeInNode(circle)

    layer.batchDraw()
})

gt.on('disconnected', (id, reason) => {
    console.log(`${id} has disconnected (${reason}).`)

    // delete the circle
    const circle = circles[id]
    if (!circle) return

    layer.batchDraw()
    delete circles[id]

    fadeOutAndDestroyNode(circle)
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
})

gt.on('state_updated_reliable', (id, payload_delta) => {
    console.log('Got a stateupdatereliable:', id, payload_delta)

    if (id === gt.id) return // ignore our own change

    if (payload_delta.text !== undefined)
        textarea.value = payload_delta.text

    if (payload_delta.text2 !== undefined)
        textarea2.value = payload_delta.text2

    // we recieved a line
    if (payload_delta.lines) {
        for (const lineId in payload_delta.lines) {
            const lineObj = payload_delta.lines[lineId]

            if (lineObj !== null) {
                const line = createLine(lineObj.points, lineId)

                lines[lineId] = line
                group.add(line)

                line.zIndex(2)
            } else {
                const line = lines[lineId]

                delete lines[lineId]

                fadeOutAndDestroyNode(line)
            }
            
        }

        layer.batchDraw()
    }
})

gt.on('state_updated_unreliable', (id, payload_delta) => {
    console.log('Got a stateupdateunreliable:', id, payload_delta)

    if (id === gt.id) return // ignore our own change

    if (payload_delta.text !== undefined)
        textarea.value = payload_delta.text

    if (payload_delta.text2 !== undefined)
        textarea2.value = payload_delta.text2

    if (payload_delta.lines) {
        for (const lineId in payload_delta.lines) {
            const lineObj = payload_delta.lines[lineId]

            const line = lines[lineId]

            line.points(line.points().concat(Object.values(lineObj.points)))

            layer.batchDraw()
        }
    }
})


// when a mouse move happens, lets push the event to the server.
stage.on('mousemove touchmove', e => {
    const pos = getRelativePointerPosition(group);

    // move our own locally...
    const id = gt.id
    const circle = circles[id]
    if (!circle) return

    circle.x(pos.x)
    circle.y(pos.y)

    layer.batchDraw()

    // send the update
    gt.updateUserUnreliable(pos)
})

// dragging for lines
stage.on('dragstart', e => {
    const pos = getRelativePointerPosition(group);
    stage.stopDrag()

    if (!gt.isConnected()) return

    // init the line
    const lineId = Math.random().toString(36).replace('0.', '')
    const line = createLine([pos.x, pos.y], lineId)

    lines[lineId] = line
    group.add(line)
    
    line.zIndex(2)

    layer.batchDraw()

    // tell everyone we created a new line
    gt.updateStateReliable({
        lines: {
            [lineId]: {
                points: line.points()
            }
        }
    })

    // add points to the line as we drag
    const dragmove = e => {
        const pos = getRelativePointerPosition(group);
        const points = line.points()

        // add our points. the changes will be queued up
        gt.updateStateUnreliable({
            lines: {
                [lineId]: {
                    points: {
                        [points.length]: pos.x,
                        [points.length + 1]: pos.y,
                    }
                }
            }
        })

        line.points(points.concat([pos.x, pos.y]))
        layer.batchDraw()
    }
    stage.on('mousemove touchmove', dragmove)

    // send to server our line
    const dragend = e => {
        stage.off('mousemove touchmove', dragmove)
        stage.off('mouseup touchend', dragend)
    }
    stage.on('mouseup touchend', dragend)
})

// click to destroy lines
stage.on('click tap', e => {
    const line = e.target

    if (!line) return
    if (line.className !== 'Line') return

    const lineId = line.lineId

    delete lines[lineId]

    fadeOutAndDestroyNode(line)

    layer.batchDraw()

    // send the delete message
    gt.updateStateReliable({
        lines: {
            [lineId]: null
        }
    })
})


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
