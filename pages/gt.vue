<template>
  <div id="cy" />
</template>

<script>
/* eslint-disable no-unused-vars */
import cytoscape from 'cytoscape'
import consola from 'consola'
import GT from '~/utils/GT'

export default {
  mounted () {
    const gt = new GT()
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
      { group: 'nodes', data: { id: 'n0' }, position: { x: 0, y: 0 } },
      { group: 'nodes', data: { id: 'n1' }, position: { x: 0, y: 0 } },
      { group: 'edges', data: { id: 'e0', source: 'n0', target: 'n1' } }
    ])

    cy.add({ group: 'nodes', data: { id: 'n3', weight: 1 }, position: { x: 0, y: 0 } })
    cy.add({ group: 'nodes', data: { id: 'n4', weight: 51 }, position: { x: 0, y: 0 } })

    cy.remove('node[weight > 50]') // remove nodes with weight greater than 50

    cy.nodes().on('click', e => consola.log('clicked', e))
    // cy.nodes().on('position', e => consola.log('position ', e))
    cy.nodes().position({ x: 0, y: 0 })

    const layout = cy.layout({ name: 'cose' })

    layout.run()

    consola.log(cy.elements().jsons())

    gt.connect('gt')
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
