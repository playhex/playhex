<script setup lang="ts">
import { BIconWifiOff } from '../icons';
</script>

<template>
    <div class="card border-warning mb-4">
        <div class="card-body text-center">
            <p class="lead"><BIconWifiOff /> {{ $t('connection_lost') }}</p>
            <div class="d-flex">
                <router-link :to="{ name: 'offline-lobby' }" class="btn btn-warning flex-grow-1">{{ $t('play_offline') }}</router-link>
            </div>
        </div>
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
