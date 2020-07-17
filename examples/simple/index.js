async function main () {
  // create the GT object, connect to our locally ran server
  const gt = new GT('localhost:3000')

  // connect, authenticate with random id and join the default room
  await gt.connectAuthAndJoin()

  // ok we connected and joined a room.
  // tell the user what our id is.
  document.getElementById('our').innerText = `Our id is '${gt.id}'`

  // setup the button event
  document.getElementById('press').addEventListener('click', () => {
    // simply send an empty update.
    gt.updateState({})
  })

  const ol = document.getElementById('presses')

  // catch the event from the server.
  gt.on('state_updated', (id) => {
    // simply add a list element whenever we receive a state update.

    const li = document.createElement('li')
    li.innerText = `${id} pressed at ${Date.now()}`
    ol.appendChild(li)
  })
}

main()
