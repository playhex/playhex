<script setup lang="ts">
/*
 * Reminds host its Hexplorer stream is still running when not on its study,
 * with a link to go back to it.
 */
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import useHexplorerLiveHostStore from '../../../stores/hexplorerLiveHostStore.js';
import { IconBroadcast } from '../../icons.js';

const { publicId, streaming } = storeToRefs(useHexplorerLiveHostStore());
const route = useRoute();

const visible = computed(() => streaming.value
    && !(route.name === 'hexplorer' && route.params.publicId === publicId.value),
);
</script>

<template>
    <router-link
        v-if="visible"
        :to="{ name: 'hexplorer', params: { publicId } }"
        class="btn btn-sm btn-danger ms-2"
        :title="$t('hexplorer_live.back_to_live')"
        :aria-label="$t('hexplorer_live.back_to_live')"
    >
        <IconBroadcast />
        <span class="d-none d-sm-inline">&nbsp;{{ $t('hexplorer_live.live') }}</span>
    </router-link>
</template>
