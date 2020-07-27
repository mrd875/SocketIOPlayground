const { spawn } = require('child_process')
const assert = require('chai').assert
const GT = require('../dist/gt.cjs')
const consola = require('consola')

const servUrl = 'http://localhost:3000'

describe('(cjs) GT Server Client Communication', function () {
  this.timeout(10000)

  let servProc

  before(() => new Promise((resolve, reject) => {
    consola.log('Starting GT server...')

    // start the server.
    servProc = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['start'], {
      cwd: './temp/GroupwareToolkitServer'
    })

    servProc.stdout.on('data', (data) => {
      const str = data.toString()

      if (str.includes('Server listening')) { console.log('Server started.'); resolve() }
    })

    servProc.stderr.on('data', (data) => {
      reject(data.toString())
    })

    servProc.on('close', (code, signal) => {
      console.log('Server closed.')
    })
  }))

  after(() => {
    console.log('Closing server...')
    // kill the server
    require('tree-kill')(servProc.pid)
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
