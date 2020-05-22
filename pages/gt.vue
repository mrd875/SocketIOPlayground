<template>
  <div id="cy" />
</template>

<script>
/* eslint-disable no-unused-vars */
import cytoscape from 'cytoscape'
import consola from 'consola'

export default {
  mounted () {
    const cy = cytoscape({

      container: document.getElementById('cy'), // container to render in

      elements: [ // list of graph elements to start with
        { // node a
          data: { id: 'a' }
        },
        { // node b
          data: { id: 'b' }
        },
        { // edge ab
          data: { id: 'ab', source: 'a', target: 'b' }
        }
      ],

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

    const eles = cy.add([
      { group: 'nodes', data: { id: 'n0' }, position: { x: 100, y: 100 } },
      { group: 'nodes', data: { id: 'n1' }, position: { x: 200, y: 200 } },
      { group: 'edges', data: { id: 'e0', source: 'n0', target: 'n1' } }
    ])

    cy.add({ group: 'nodes', data: { id: 'n3', weight: 1 }, position: { x: 150, y: 100 } })
    cy.add({ group: 'nodes', data: { id: 'n4', weight: 51 }, position: { x: 150, y: 150 } })

    cy.remove('node[weight > 50]') // remove nodes with weight greater than 50

    cy.nodes().on('click', e => consola.log('clicked', e))
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
