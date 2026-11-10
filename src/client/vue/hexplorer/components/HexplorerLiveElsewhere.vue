<script setup lang="ts">
/*
 * Host is live from another study than the one displayed: only one live session at a time.
 */
import { inject } from 'vue';
import { hexplorerLiveHostKey } from '../composables/useHexplorerLive.js';

const { publicId, streaming, stopStream } = inject(hexplorerLiveHostKey)!;
</script>

<template>
    <div class="alert alert-warning small py-2 mb-0">
        <p class="mb-2">{{ $t('hexplorer_live.live_elsewhere') }}</p>
        <div class="d-flex flex-wrap gap-2">
            <router-link :to="{ name: 'hexplorer', params: { publicId } }" class="btn btn-sm btn-primary">{{ $t('hexplorer_live.go_to_live_study') }}</router-link>
            <button v-if="streaming" type="button" class="btn btn-sm btn-outline-secondary" @click="stopStream()">{{ $t('hexplorer_live.stop_stream') }}</button>
        </div>
    </div>
</template>
