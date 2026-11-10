<script setup lang="ts">
/*
 * Host side of a live session: stream analysis, share link. Chat is below, see PageHexplorer.
 */
import { computed, inject } from 'vue';
import { hexplorerLiveHostKey, useLoadingAction } from '../composables/useHexplorerLive.js';
import HexplorerLiveLink from './HexplorerLiveLink.vue';
import HexplorerLiveElsewhere from './HexplorerLiveElsewhere.vue';
import { IconBroadcast } from '../../icons.js';

const { active, streaming, match, liveElsewhere, startStream, stopStream } = inject(hexplorerLiveHostKey)!;
const { loading, run } = useLoadingAction();

/**
 * Link must be shared to viewers, or to opponent to join.
 */
const showLink = computed(() => active.value && !liveElsewhere.value && (streaming.value || match.value?.state === 'waiting'));
</script>

<template>
    <div class="d-flex flex-column gap-3">
        <section>
            <h2 class="h6 d-flex align-items-center gap-2">
                <IconBroadcast />
                {{ $t('hexplorer_live.stream') }}
                <span v-if="streaming" class="badge text-bg-danger">{{ $t('hexplorer_live.live') }}</span>
            </h2>
            <p class="small text-body-secondary mb-2">{{ $t('hexplorer_live.stream_description') }}</p>

            <HexplorerLiveElsewhere v-if="liveElsewhere" />
            <template v-else>
                <button
                    v-if="!streaming"
                    type="button"
                    class="btn btn-danger btn-sm"
                    :disabled="loading"
                    @click="run(startStream)"
                ><IconBroadcast /> {{ $t('hexplorer_live.start_stream') }}</button>
                <button
                    v-else
                    type="button"
                    class="btn btn-outline-secondary btn-sm"
                    :disabled="loading"
                    @click="run(stopStream)"
                >{{ $t('hexplorer_live.stop_stream') }}</button>
            </template>
        </section>

        <HexplorerLiveLink v-if="showLink" />
    </div>
</template>
