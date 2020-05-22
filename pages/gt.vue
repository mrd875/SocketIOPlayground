<template>
  <div id="cy" />
</template>

<script>
/* eslint-disable no-unused-vars */
/* eslint-disable eqeqeq */
import cytoscape from 'cytoscape'
import consola from 'consola'
import _ from 'lodash'
import GT from '~/utils/GT'

export default {
  data () {
    return {
      minNodes: 5,
      maxNodes: 20,
      edgeChance: 10
    }
  },
  mounted () {
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
        gt.updateStateReliable({ elements: cy.elements().jsons() })
      } else {
        // lets init our network to be consistent with the incoming payload.
        const elements = Object.values(state.elements)
        elements.forEach((e) => {
          cy.add(e)
        })
      }
    })
    gt.connect('gt')
  },
  methods: {
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
