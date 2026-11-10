<script setup lang="ts">
/*
 * Link of the live session, to share to viewers or opponent.
 */
import { computed, inject } from 'vue';
import { useClipboard } from '@vueuse/core';
import { hexplorerLiveHostKey, hexplorerLiveUrl } from '../composables/useHexplorerLive.js';
import { IconCheck, IconCopy } from '../../icons.js';

const { publicId } = inject(hexplorerLiveHostKey)!;

const link = computed(() => publicId.value === null ? null : hexplorerLiveUrl(publicId.value));

const { copy, copied } = useClipboard({ legacy: true });
</script>

<template>
    <div v-if="link">
        <label class="form-label small mb-1" for="hexplorer-live-link">{{ $t('hexplorer_live.share_link') }}</label>
        <div class="input-group input-group-sm">
            <input id="hexplorer-live-link" type="text" class="form-control" :value="link" readonly @focus="($event.target as HTMLInputElement).select()">
            <button type="button" class="btn btn-outline-primary" @click="copy(link)" :title="$t('hexplorer_live.copy_link')">
                <IconCheck v-if="copied" />
                <IconCopy v-else />
            </button>
        </div>
    </div>
</template>
