<script setup lang="ts">
/*
 * Name of a player, editable inline. Displays color name when empty.
 */
import { computed, inject } from 'vue';
import { hexplorerKey } from '../composables/useHexplorer.js';
import { HEXPLORER_PLAYER_NAME_MAX_LENGTH } from '../../../../shared/app/hexplorerStudy.js';
import { IconCircleFill } from '../../icons.js';

const props = defineProps<{
    player: 0 | 1;
}>();

const { state } = inject(hexplorerKey)!;

const name = computed({
    get: () => (props.player === 0 ? state.value.playerBlackName : state.value.playerWhiteName) ?? '',
    set: value => {
        if (props.player === 0) {
            state.value.playerBlackName = value || undefined;
        } else {
            state.value.playerWhiteName = value || undefined;
        }
    },
});
</script>

<template>
    <div class="d-flex align-items-center gap-1" :class="player === 0 ? 'text-danger' : 'text-primary'">
        <IconCircleFill />
        <input
            type="text"
            class="player-name-input fw-semibold"
            v-model="name"
            :maxlength="HEXPLORER_PLAYER_NAME_MAX_LENGTH"
            :placeholder="player === 0 ? $t('game.red') : $t('game.blue')"
            :aria-label="player === 0 ? $t('game.red') : $t('game.blue')"
        >
    </div>
</template>

<style lang="stylus" scoped>
.player-name-input
    width 100%
    min-width 3rem
    border none
    background transparent
    padding 0
    color inherit
    outline none

    &::placeholder
        color inherit
        opacity 0.65

    &:hover, &:focus
        text-decoration underline dotted
</style>
