<template>
  <div />
</template>

<script>
import io from 'socket.io-client'
import consola from 'consola'

export default {
  components: {
  },
  mounted () {
    const socket = io()

    consola.log(socket)
  }
}
</script>

<style>
</style>
