<template>
  <div>
    <div id="cy" />
  </div>
</template>

<script>
/* eslint-disable no-unused-vars */
import cytoscape from 'cytoscape'
import edgehandles from 'cytoscape-edgehandles'
import cxtmenu from 'cytoscape-cxtmenu'
import consola from 'consola'
import _ from 'lodash'
import GT from '~/utils/GT'

export default {
  data () {
    return {
      minNodes: 5, // when the state is empty, we generate a random graph
      maxNodes: 20, // with these parameters.
      edgeChance: 10,

      animateRate: 50 // amount in milliseconds, should match server's tick rate
    }
  },
  async mounted () {
    // we are using some cytoscape plugins.
    cytoscape.use(edgehandles)
    cytoscape.use(cxtmenu)

    // create the objects we need.
    const gt = new GT()
    const cy = cytoscape({
      container: document.getElementById('cy'), // container to render in

      style: [ // the stylesheet for the graph
        {
          selector: 'node[name]',
          style: {
            content: 'data(name)'
          }
        },

        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle'
          }
        },
        // some style for the extension
        {
          selector: '.eh-handle',
          style: {
            'background-color': 'red',
            width: 12,
            height: 12,
            shape: 'ellipse',
            'overlay-opacity': 0,
            'border-width': 12, // makes the handle easier to hit
            'border-opacity': 0
          }
        },

        {
          selector: '.eh-hover',
          style: {
            'background-color': 'red'
          }
        },

        {
          selector: '.eh-source',
          style: {
            'border-width': 2,
            'border-color': 'red'
          }
        },

        {
          selector: '.eh-target',
          style: {
            'border-width': 2,
            'border-color': 'red'
          }
        },

        {
          selector: '.eh-preview, .eh-ghost-edge',
          style: {
            'background-color': 'red',
            'line-color': 'red',
            'target-arrow-color': 'red',
            'source-arrow-color': 'red'
          }
        },
        {
          selector: '.eh-ghost-edge.eh-preview-active',
          style: {
            opacity: 0
          }
        }
      ]
    })

    // setup the cytoscape plugins
    const eh = cy.edgehandles({})

    const coremenu = cy.cxtmenu({
      menuRadius: 100, // the radius of the circular menu in pixels
      selector: 'core', // elements matching this Cytoscape.js selector will trigger cxtmenus
      commands: [ // an array of commands to list in the menu or a function that returns the array
        { // example command
          fillColor: 'rgba(55, 255, 25, 0.75)', // optional: custom background color for item
          content: 'Add a node', // html/text content to be displayed in the menu
          select (ele, e) {
            const node = cy.add(cy.add({ group: 'nodes', position: e.position }))

            gt.updateStateReliable({
              elements: {
                [node.id()]: node.json()
              }
            })
          }
        }
      ]
    })

    const nodemenu = cy.cxtmenu({
      menuRadius: 100,
      selector: 'node',
      commands: [
        {
          fillColor: 'rgba(255, 55, 25, 0.75)',
          content: 'Delete node',
          select (ele) {
            ele.remove()

            gt.updateStateReliable({
              elements: {
                [ele.id()]: null
              }
            })
          }
        }
      ]
    })

    const edgemenu = cy.cxtmenu({
      menuRadius: 100,
      selector: 'edge',
      commands: [
        {
          fillColor: 'rgba(255, 55, 25, 0.75)',
          content: 'Delete edge', // html/text content to be displayed in the menu
          select (ele) {
            ele.remove()

            gt.updateStateReliable({
              elements: {
                [ele.id()]: null
              }
            })
          }
        }
      ]
    })

    // let us connect to the server and wait for the inital payload.
    gt.connect('gt')
    await this.waitForInit(gt, cy)

    // we got the payload, lets setup the events...
    consola.log('Initialized, setup events...')

    // fired when the user finished creating an edge.
    cy.on('ehcomplete', (event, sourceNode, targetNode, addedEles) => {
      consola.log('ehcomplete', addedEles)

      gt.updateStateReliable({
        elements: this.cyJsonsToStateObj(addedEles.jsons())
      })
    })

    // fired when an element is being dragged
    cy.on('drag', (e) => {
      consola.log('drag', e.target)

      gt.updateStateUnreliable({
        elements: {
          [e.target.id()]: {
            position: e.target.position()
          }
        }
      })
    })

    // basically all the server commands are handled here in respect to the cyto elements.
    const checkElementsUpdates = (payloadDelta) => {
      // received elements, lets update it.
      if (payloadDelta.elements) {
        for (const id in payloadDelta.elements) {
          const ele = payloadDelta.elements[id]
          const cyEle = cy.getElementById(id)

          // if we do not have this element, we need to add it.
          if (!cyEle.length) {
            cy.add(ele)
            continue
          }

          // we must remove this element
          if (ele === null) {
            cyEle.remove()
            continue
          }

          // lets tween to the new state of the element.
          cyEle.stop()
          cyEle.animate({
            ...ele
          }, {
            duration: this.animateRate
          })
        }
      // we must remove all elements.
      } else if (payloadDelta.elements === null) {
        cy.elements().remove()
      }
    }

    // listen for server commands and handle them as they come in.
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
    // we wait for the inital payload when we first connect to the server.
    waitForInit (gt, cy) {
      return new Promise((resolve, reject) => {
        gt.on('init_state', (state, users, room) => {
          if (!('elements' in state)) {
            consola.log('state is empty, lets populate with randomness')

            // generate the nodes.
            const numOfNodes = Math.floor(this.minNodes + Math.random() * (this.maxNodes - this.minNodes))
            for (let i = 0; i < numOfNodes; i++) {
              cy.add(cy.add({ group: 'nodes' }))
            }

            // generate the edges between all the nodes
            cy.nodes().forEach((e) => {
              cy.nodes().forEach((i) => {
                // if (e === i) { return }

                if (Math.random() * 100 > this.edgeChance) { return }

                cy.add(cy.add({ group: 'edges', data: { source: e.id(), target: i.id() } }))
              })
            })

            // layout the nodes in random
            cy.layout({
              name: 'random'
            }).run()

            // ok generated the random graph
            // push to server as starter state.
            gt.updateStateReliable({ elements: null })
            gt.updateStateReliable({ elements: this.cyJsonsToStateObj(cy.elements().jsons()) })
          } else {
            // lets init our graph to be consistent with the incoming payload.
            for (const id in state.elements) {
              try {
                cy.add(state.elements[id])
                // its possible that a left over edge is in the state from a deleted node,
                // so we catch the error, and continue on.
              } catch (e) {
                consola.warn(e)
              }
            }
          }

          resolve()
        })
      })
    },
    // converts the cytoscape's json format into my GT state format.
    cyJsonsToStateObj (jsons) {
      const answer = {}

      // the server state is:
      /*
        {
          elements: {
            [element.id()]: element.json()
          }
        }
      */
      // but we pass this function a cyto .jsons(), which just calls .json on all the elements in the collection
      // and we loop over all of them.
      jsons.forEach((e) => {
        answer[e.data.id] = e
      })

      return answer
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
