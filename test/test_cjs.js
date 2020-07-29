const assert = require('chai').assert
const GT = require('../dist/gt.cjs')
const consola = require('consola')
const io = require('../temp/GroupwareToolkitServer/src/io')

const servUrl = 'http://localhost:3000'

describe('(cjs) GT Server Client Communication', function () {
  this.timeout(10000)

  before(function (done) {
    this.server = io.listen(3000)
    consola.log('Server listening...')
    done()
  })

  after(function (done) {
    this.server.close()
    consola.log('Server closed')
    done()
  })

  it('Can connect', async function () {
    this.gt = new GT(servUrl)

    assert(!this.gt.isConnected())
    assert(!this.gt.isAuthed())
    assert(!this.gt.isInRoom())

    await this.gt.connect()

    assert(this.gt.isConnected())
    assert(!this.gt.isAuthed())
    assert(!this.gt.isInRoom())
  })

  it('Can auth with no argument', async function () {
    assert(this.gt.isConnected())
    assert(!this.gt.isAuthed())
    assert(!this.gt.isInRoom())

    await this.gt.auth()

    assert(this.gt.isConnected())
    assert(this.gt.isAuthed())
    assert(!this.gt.isInRoom())
  })

  it('Can join with no argument', async function () {
    assert(this.gt.isConnected())
    assert(this.gt.isAuthed())
    assert(!this.gt.isInRoom())

    await this.gt.join()

    assert(this.gt.isConnected())
    assert(this.gt.isAuthed())
    assert(this.gt.isInRoom())
  })

  it('Can disconnect', async function () {
    assert(this.gt.isConnected())
    assert(this.gt.isAuthed())
    assert(this.gt.isInRoom())

    await this.gt.disconnect()

    assert(!this.gt.isConnected())
    assert(!this.gt.isAuthed())
    assert(!this.gt.isInRoom())
  })

  it('Can connect, auth and join with no arguments', async function () {
    this.gt = new GT(servUrl)

    assert(!this.gt.isConnected())
    assert(!this.gt.isAuthed())
    assert(!this.gt.isInRoom())

    await this.gt.connectAuthAndJoin()

    assert(this.gt.isConnected())
    assert(this.gt.isAuthed())
    assert(this.gt.isInRoom())
  })
})
