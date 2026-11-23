<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { Color } from 'pixi.js';
import { playhexTheme, resolveTheme } from '@playhex/pixi-board';
import { matiksTheme } from '../../services/board-themes/matiks.js';
import usePlayerSettingsStore from '../../stores/playerSettingsStore.js';
import usePlayerLocalSettingsStore from '../../stores/playerLocalSettingsStore.js';

const playerSettingsStore = usePlayerSettingsStore();
const { playerSettings } = storeToRefs(playerSettingsStore);
const { displayedTheme } = usePlayerLocalSettingsStore();

const matiksEnabled = computed(() => playerSettings.value?.boardTheme === matiksTheme.metadata.id);

const colors = computed(() => {
    const { player1, player2 } = resolveTheme(matiksEnabled.value ? matiksTheme : playhexTheme, displayedTheme()).colors;

    return [new Color(player1).toHex(), new Color(player2).toHex()];
});

const toggleMatiksTheme = (): void => {
    if (!playerSettings.value) {
        return;
    }

    playerSettings.value.boardTheme = matiksEnabled.value ? null : matiksTheme.metadata.id;
    void playerSettingsStore.updatePlayerSettings();
};
</script>

<template>
    <div class="card matiks-card">
        <div class="card-body">
            <p class="m-0 fw-semibold matiks-title">{{ $t('matiks_welcome.title') }}</p>
            <p class="mb-2"><small>{{ $t('matiks_welcome.description') }}</small></p>
            <div class="d-flex align-items-center gap-2">
                <button
                    type="button"
                    class="btn btn-sm"
                    :class="matiksEnabled ? 'btn-outline-secondary' : 'btn-matiks'"
                    :disabled="!playerSettings"
                    @click="toggleMatiksTheme"
                >{{ $t(matiksEnabled ? 'matiks_welcome.disable' : 'matiks_welcome.enable') }}</button>
                <svg class="hexes" viewBox="0 0 64 34" aria-hidden="true">
                    <polygon v-for="(color, i) in colors" :key="i" :style="{ fill: color }" :transform="`translate(${16 + i * 31} 17)`" points="0,-16 13.86,-8 13.86,8 0,16 -13.86,8 -13.86,-8" />
                </svg>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.matiks-card
    --bs-card-bg #171717
    --bs-card-border-color #b1fa63
    color #dee2e6

.matiks-title
    color #b1fa63

.btn-matiks
    --bs-btn-bg #b1fa63
    --bs-btn-border-color #b1fa63
    --bs-btn-color #171717
    --bs-btn-hover-bg #9be04f
    --bs-btn-hover-border-color #9be04f
    --bs-btn-hover-color #171717
    --bs-btn-active-bg #8ccc45
    --bs-btn-active-border-color #8ccc45
    --bs-btn-active-color #171717
    --bs-btn-disabled-bg #b1fa63
    --bs-btn-disabled-border-color #b1fa63
    --bs-btn-disabled-color #171717

.hexes
    height 1.75rem

    polygon
        transition fill 0.4s
</style>
