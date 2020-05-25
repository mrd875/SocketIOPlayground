<template>
  <div>
    <div id="cy" />
  </div>
</template>

<script>
/* eslint-disable no-unused-vars */
/* eslint-disable eqeqeq */
/* eslint-disable require-await */
import cytoscape from 'cytoscape'
import edgehandles from 'cytoscape-edgehandles'
import cxtmenu from 'cytoscape-cxtmenu'
import consola from 'consola'
import _ from 'lodash'
import GT from '~/utils/GT'

export default {
  data () {
    return {
      minNodes: 5,
      maxNodes: 20,
      edgeChance: 10,
      animateRate: 50 // amount in milliseconds, should match server's tick rate
    }
  },
  async mounted () {
    cytoscape.use(edgehandles)
    cytoscape.use(cxtmenu)

    const gt = new GT()
    const cy = cytoscape({
      container: document.getElementById('cy'), // container to render in

      style: [ // the stylesheet for the graph
        {
          selector: 'node',
          style: {
            'background-color': '#666',
            label: 'data(id)'
          }
        },

        {
          selector: 'edge',
          style: {
            width: 3,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
          }
        }
      ],
      layout: {
        name: 'grid',
        rows: 1
      }
    })
    const eh = cy.edgehandles({})

    const nodemenu = cy.cxtmenu({
      menuRadius: 100, // the radius of the circular menu in pixels
      selector: 'node', // elements matching this Cytoscape.js selector will trigger cxtmenus
      commands: [ // an array of commands to list in the menu or a function that returns the array
        { // example command
          fillColor: 'rgba(200, 200, 200, 0.75)', // optional: custom background color for item
          content: 'a command name', // html/text content to be displayed in the menu
          select (ele) { // a function to execute when the command is selected
            consola.log(ele.id()) // `ele` holds the reference to the active element
          }
        }
      ]
    })

    const edgemenu = cy.cxtmenu({
      menuRadius: 100, // the radius of the circular menu in pixels
      selector: 'edge', // elements matching this Cytoscape.js selector will trigger cxtmenus
      commands: [ // an array of commands to list in the menu or a function that returns the array
        { // example command
          fillColor: 'rgba(255, 55, 25, 0.75)', // optional: custom background color for item
          content: 'Delete', // html/text content to be displayed in the menu
          select (ele) { // a function to execute when the command is selected
            consola.log(ele.id()) // `ele` holds the reference to the active element
          }
        }
      ]
    })

    gt.connect('gt')
    await this.waitForInit(gt, cy)
    /*
      The state is setup as:
      {
        nodes: {
          [node.data.id]: {NODEDATA}
        },
        edges: {
          [edge.data.id]: {EDGEDATA}
        }
      }
    */

    consola.log('Initialized, setup events...')

    cy.on('drag', (e) => {
      const node = e.target.json()

      // tell server about the updated node
      gt.updateStateUnreliable({
        elements: {
          [node.data.id]: node
        }
      })
    })

    const checkElementsUpdates = (payloadDelta) => {
      // received a updated node, lets update it.
      if (payloadDelta.elements) {
        for (const id in payloadDelta.elements) {
          const ele = payloadDelta.elements[id]
          const cyEle = cy.getElementById(id)

          if (!cyEle.length) {
            cy.add(ele)
            continue
          }

          if (ele === null) {
            cyEle.remove()
            continue
          }

          cyEle.stop()
          cyEle.animate({
            ...ele
          }, {
            duration: this.animateRate
          })
        }
      } else if (payloadDelta.elements === null) {
        cy.elements().remove()
      }
    }

    gt.on('state_updated_reliable', (id, payloadDelta) => {
      if (id === gt.id) { return }

      checkElementsUpdates(payloadDelta)
    })

    gt.on('state_updated_unreliable', (id, payloadDelta) => {
      if (id === gt.id) { return }

      checkElementsUpdates(payloadDelta)
    })
  },
  methods: {
    waitForInit (gt, cy) {
      return new Promise((resolve, reject) => {
        gt.on('init_state', (state, users, room) => {
          if (!('elements' in state)) {
            consola.log('state is empty, lets populate with randomness')

            const numOfNodes = Math.floor(this.minNodes + Math.random() * this.maxNodes)

            for (let i = 0; i < numOfNodes; i++) {
              cy.add(cy.add({ group: 'nodes', data: { id: `n${i}` } }))
            }

            cy.nodes().forEach((e) => {
              cy.nodes().forEach((i) => {
                // if (e === i) { return }

                if (Math.random() * 100 > this.edgeChance) { return }

                cy.add(cy.add({ group: 'edges', data: { id: `e${e.id()}-${i.id()}`, source: e.id(), target: i.id() } }))
              })
            })

            cy.layout({
              name: 'random'
            }).run()

            // ok generated the random network.
            // push to server as starter state.

            const networkState = {
              elements: {}
            }
            const elements = cy.elements().jsons()

            elements.forEach((e) => {
              networkState.elements[e.data.id] = e
            })

            gt.updateStateReliable({ elements: null })
            gt.updateStateReliable({ elements: networkState.elements })
          } else {
            // lets init our network to be consistent with the incoming payload.
            for (const id in state.elements) {
              cy.add(state.elements[id])
            }
          }

          resolve()
        })
      })
    }
  }
}
</script>

<style>
#cy {
  width: 100%;
  height: 80vh;
  display: block;
}
</style>
