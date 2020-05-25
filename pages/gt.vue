<template>
  <div id="cy" />
</template>

<script>
/* eslint-disable no-unused-vars */
/* eslint-disable eqeqeq */
/* eslint-disable require-await */
import cytoscape from 'cytoscape'
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

    cy.nodes().on('drag', (e) => {
      const node = e.target.json()

      // tell server about the updated node
      gt.updateStateUnreliable({
        nodes: {
          [node.data.id]: node
        }
      })
    })

    gt.on('state_updated_unreliable', (id, payloadDelta) => {
      if (id === gt.id) { return }

      // received a updated node, lets update it.
      if (payloadDelta.nodes) {
        for (const id in payloadDelta.nodes) {
          const node = payloadDelta.nodes[id]
          const cyNode = cy.getElementById(id)

          if (!cyNode) { continue }

          cyNode.stop()
          cyNode.animate({
            position: node.position
          }, {
            duration: this.animateRate
          })
        }
      }
    })
  },
  methods: {
    waitForInit (gt, cy) {
      return new Promise((resolve, reject) => {
        gt.on('init_state', (state, users, room) => {
          if (_.isEmpty(state)) {
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
              nodes: {},
              edges: {}
            }
            const nodes = cy.nodes().jsons()
            const edges = cy.edges().jsons()

            nodes.forEach((n) => {
              networkState.nodes[n.data.id] = n
            })
            edges.forEach((e) => {
              networkState.edges[e.data.id] = e
            })

            gt.updateStateReliable({ nodes: networkState.nodes, edges: networkState.edges })
          } else {
            // lets init our network to be consistent with the incoming payload.
            for (const id in state.nodes) {
              cy.add(state.nodes[id])
            }
            for (const id in state.edges) {
              cy.add(state.edges[id])
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
  width: 300px;
  height: 300px;
  display: block;
}
</style>
