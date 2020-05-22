<template>
  <div>
    <button id="btn">
      connect
    </button>
    <input id="room" type="text" name="room" placeholder="room">
    <input id="name" type="text" name="name" placeholder="username">
    <div id="container" />
    <textarea id="livetext" name="live" cols="30" rows="10" disabled="true" />
    <textarea id="livetext2" name="live" cols="30" rows="10" disabled="true" />
    <ul id="users" />
  </div>
</template>

<script>
/* eslint-disable no-unused-vars */
import consola from 'consola'
import Konva from 'konva'
import GT from '~/utils/GT'

export default {
  components: {
  },
  mounted () {
    // konva setup
    const width = window.innerWidth
    const height = window.innerHeight * 0.7

    const stage = new Konva.Stage({
      container: 'container',
      width,
      height,
      x: 20,
      y: 50,
      draggable: true
    })

    const layer = new Konva.Layer({
      scaleX: 1.2,
      scaleY: 0.8,
      rotation: 5
    })
    stage.add(layer)

    const group = new Konva.Group({
      x: 30,
      rotation: 10,
      scaleX: 1.5
    })
    layer.add(group)

    const text = new Konva.Text({
      text: 'Move on the canvas to draw a circle',
      fontSize: 20
    })
    group.add(text)
    layer.draw()

    // the circles of each user.
    const circles = {}

    const lines = {}

    // https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
    function hashCode (str) { // java String#hashCode
      let hash = 0
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
      }
      return hash
    }

    function intToRGB (i) {
      const c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase()

      return '00000'.substring(0, 6 - c.length) + c
    }

    function createCircle (s, id) {
      const obj = {
        fill: '#' + intToRGB(hashCode(id)),
        radius: 20,
        listening: false,
        ...s
      }

      return new Konva.Circle(obj)
    }

    function createLine (points, lineId) {
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
    function getRelativePointerPosition (node) {
      const transform = node.getAbsoluteTransform().copy()
      // to detect relative position we need to invert transform
      transform.invert()

      // get pointer (say mouse or touch) position
      const pos = node.getStage().getPointerPosition()

      // now we can find relative point
      return transform.point(pos)
    }

    function fadeInNode (node) {
      node.opacity(0)

      // fade in
      new Konva.Tween({
        node,
        duration: 0.5,
        easing: Konva.Easings.Linear,
        opacity: 1
      }).play()
    }

    function fadeOutAndDestroyNode (node) {
      node.listening(false)
      // fade and destroy
      new Konva.Tween({
        node,
        duration: 0.5,
        easing: Konva.Easings.Linear,
        opacity: 0,
        onFinish () {
          node.destroy()
        }
      }).play()
    }

    function addUserToList (user, id) {
      const li = document.createElement('li')
      li.id = `user-${id}`

      li.textContent = `${user.name}`

      users.appendChild(li)
    }

    function removeUserFromList (id) {
      const li = document.getElementById(`user-${id}`)

      if (li) { li.parentNode.removeChild(li) }
    }

    function updateUser (user, id) {
      const li = document.getElementById(`user-${id}`)

      if (li) { li.textContent = `${user.name}` }
    }

    const gt = new GT()

    const textarea = document.getElementById('livetext')
    const textarea2 = document.getElementById('livetext2')

    const btn = document.getElementById('btn')
    const room = document.getElementById('room')
    const name = document.getElementById('name')
    const users = document.getElementById('users')

    name.addEventListener('input', (e) => {
      const name = e.target.value

      // update locally,
      updateUser({ name }, gt.id)

      // send to server
      gt.updateUserReliable({ name })
    })

    btn.addEventListener('click', (e) => {
      if (gt.isConnected()) {
        gt.disconnect()
      } else {
        consola.log('We are trying to connect.')
        gt.connect(room.value, {
          x: 0,
          y: 0,
          name: name.value
        })

        btn.textContent = 'connecting...'
        btn.disabled = true

        room.disabled = true
      }
    })

    gt.on('init_state', (state, users, room) => {
      consola.log('Got whole new state:', state, users, room)

      // draw a circle for each user... our OWN circle will be in here...
      for (const id in users) {
        const circle = createCircle(users[id], id)

        group.add(circle)
        circles[id] = circle

        fadeInNode(circle)

        addUserToList(users[id], id)
      }

      // init the textareas from the state.
      if (state.text !== undefined) { textarea.value = state.text }
      if (state.text2 !== undefined) { textarea2.value = state.text2 }

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

    gt.on('connect', (id) => {
      consola.log(`We have connected, (${id}).`)

      textarea.disabled = false
      textarea2.disabled = false

      btn.textContent = 'disconnect'
      btn.disabled = false
    })

    gt.on('connect_error', (error) => {
      btn.textContent = 'connect'
      btn.disabled = false
      room.disabled = false

      alert(error.toString())
    })

    gt.on('disconnect', (reason) => {
      consola.log(`We have disconnected (${reason}).`)

      // clean up the circles...
      for (const id in circles) {
        const circle = circles[id]
        delete circles[id]

        fadeOutAndDestroyNode(circle)

        removeUserFromList(id)
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

      btn.textContent = 'connect'
      room.disabled = false

      layer.batchDraw()
    })

    gt.on('connected', (id, userPayload) => {
      if (id === gt.id) { return } // ignore our own connected message
      consola.log(`${id} has connected.`)

      // create the circle
      const circle = createCircle(userPayload, id)
      group.add(circle)
      circles[id] = circle

      fadeInNode(circle)

      layer.batchDraw()

      addUserToList(userPayload, id)
    })

    gt.on('disconnected', (id, reason) => {
      consola.log(`${id} has disconnected (${reason}).`)

      // delete the circle
      const circle = circles[id]
      if (!circle) { return }

      layer.batchDraw()
      delete circles[id]

      fadeOutAndDestroyNode(circle)
      removeUserFromList(id)
    })

    gt.on('user_updated_reliable', (id, payloadDelta) => {
      consola.log('Got a userupdatereliable:', id, payloadDelta)

      if (!('name' in payloadDelta)) { return } // throw away bad messages
      if (id === gt.id) { return } // ignore our own...

      updateUser(payloadDelta, id)
    })

    gt.on('user_updated_unreliable', (id, payloadDelta) => {
      consola.log('Got a userupdateunreliable:', id, payloadDelta)

      if (!payloadDelta.x || !payloadDelta.y) { return } // throw away bad messages
      if (id === gt.id) { return } // ignore our own...

      // update the user's circle.
      const circle = circles[id]
      if (!circle) { return }

      // client sided smoothing.
      // instead of teleporting the circle, we will tween to the location
      new Konva.Tween({
        node: circle,
        duration: 0.05, // server only allows 20 unreliable messages a second.
        easing: Konva.Easings.Linear,
        ...payloadDelta
      }).play()
    })

    gt.on('state_updated_reliable', (id, payloadDelta) => {
      consola.log('Got a stateupdatereliable:', id, payloadDelta)

      if (id === gt.id) { return } // ignore our own change

      if (payloadDelta.text !== undefined) { textarea.value = payloadDelta.text }

      if (payloadDelta.text2 !== undefined) { textarea2.value = payloadDelta.text2 }

      // we recieved a line
      if (payloadDelta.lines) {
        for (const lineId in payloadDelta.lines) {
          const lineObj = payloadDelta.lines[lineId]

          if (lineObj !== null) {
            const line = createLine(lineObj.points, lineId)

            lines[lineId] = line
            group.add(line)

            line.zIndex(2)
          } else {
            const line = lines[lineId]
            if (!line) { continue }

            delete lines[lineId]

            fadeOutAndDestroyNode(line)
          }
        }

        layer.batchDraw()
      }
    })

    gt.on('state_updated_unreliable', (id, payloadDelta) => {
      consola.log('Got a stateupdateunreliable:', id, payloadDelta)

      if (id === gt.id) { return } // ignore our own change

      if (payloadDelta.text !== undefined) { textarea.value = payloadDelta.text }

      if (payloadDelta.text2 !== undefined) { textarea2.value = payloadDelta.text2 }

      if (payloadDelta.lines) {
        for (const lineId in payloadDelta.lines) {
          const lineObj = payloadDelta.lines[lineId]

          const line = lines[lineId]
          if (!line) { continue }

          line.points(line.points().concat(Object.values(lineObj.points)))
        }

        layer.batchDraw()
      }
    })

    // when a mouse move happens, lets push the event to the server.
    stage.on('mousemove touchmove', (e) => {
      const pos = getRelativePointerPosition(group)

      // move our own locally...
      const id = gt.id
      const circle = circles[id]
      if (!circle) { return }

      circle.x(pos.x)
      circle.y(pos.y)

      layer.batchDraw()

      // send the update
      gt.updateUserUnreliable(pos)
    })

    // dragging for lines
    stage.on('dragstart', (e) => {
      const pos = getRelativePointerPosition(group)
      stage.stopDrag()

      if (!gt.isConnected()) { return }

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
      const dragmove = (e) => {
        if (!line) { return }

        const pos = getRelativePointerPosition(group)
        const points = line.points()

        // add our points. the changes will be queued up
        gt.updateStateUnreliable({
          lines: {
            [lineId]: {
              points: {
                [points.length]: pos.x,
                [points.length + 1]: pos.y
              }
            }
          }
        })

        line.points(points.concat([pos.x, pos.y]))
        layer.batchDraw()
      }
      stage.on('mousemove touchmove', dragmove)

      // send to server our line
      const dragend = (e) => {
        stage.off('mousemove touchmove', dragmove)
        stage.off('mouseup touchend', dragend)
      }
      stage.on('mouseup touchend', dragend)
    })

    // click to destroy lines
    stage.on('click tap', (e) => {
      const line = e.target

      if (!line) { return }
      if (line.className !== 'Line') { return }

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
    // send the changes to the server.
    textarea.addEventListener('input', (e) => {
      const text = e.target.value

      // and send the update to the server.
      gt.updateStateUnreliable({ text })
    })

    textarea.addEventListener('change', (e) => {
      const text = e.target.value

      gt.updateStateReliable({ text })
    })

    textarea2.addEventListener('input', (e) => {
      const text2 = e.target.value

      gt.updateStateUnreliable({ text2 })
    })

    textarea2.addEventListener('change', (e) => {
      const text2 = e.target.value

      gt.updateStateReliable({ text2 })
    })
  }
}
</script>

<style>
</style>
