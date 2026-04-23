<script setup lang="ts">
import { ref, watch } from 'vue';
import { IconEye } from '../icons.js';
import { storeToRefs } from 'pinia';
import { onClickOutside } from '@vueuse/core';
import useCurrentGameStore from '../../stores/currentGameStore.js';
import AppPseudo from './AppPseudo.vue';

const { spectators } = storeToRefs(useCurrentGameStore());

const popupOpen = ref(false);
const el = ref<HTMLElement>();

const togglePopup = () => { popupOpen.value = !popupOpen.value; };
onClickOutside(el, () => { popupOpen.value = false; });

watch(spectators, spectator => {
    if (spectator.length === 0) {
        popupOpen.value = false;
    }
});
</script>

<template>
    <span
        v-if="spectators.length > 0"
        ref="el"
        class="spectator-count input-group-text text-info text-nowrap position-relative bg-body-secondary"
        @click="togglePopup"
    >
        <IconEye class="me-1" /> {{ spectators.length || '' }}
        <div class="spectator-popup dropdown-menu small" :class="{ show: popupOpen }" @click.stop>
            <span class="dropdown-header fw-bold">{{ $t('spectators') }}</span>
            <ul name="spectator-item" class="list-unstyled mb-0 ps-3">
                <li v-for="spectator in spectators" :key="spectator.publicId"><AppPseudo :player="spectator" /></li>
            </ul>
        </div>
    </span>
</template>

<style lang="stylus" scoped>
.spectator-count
    cursor pointer
    border none

    &:hover .spectator-popup
        display block

.spectator-popup
    bottom 100%
    top auto
    right 0
    left auto
    max-height 50vh
    overflow-y auto
    margin-bottom 0.25em
</style>
