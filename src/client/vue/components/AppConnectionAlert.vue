<script setup lang="ts">
import useSocketStore from '../../stores/socketStore.js';

const socketStore = useSocketStore();
</script>

<template>
    <div v-if="!socketStore.connected" class="connection-alert btn btn-danger">
        Offline
    </div>
</template>

<style lang="stylus" scoped>
.connection-alert
    position fixed
    bottom 0
    left 0
    text-size: 1.4em
    padding-top 3px
    padding-bottom 3px
    font-weight bold
    border-bottom-left-radius 0.75rem
</style>
