<script setup lang="ts">
import { storeToRefs } from 'pinia';
import useLobbyStore from '../../stores/lobbyStore.js';
import { IconCalendar, IconLightningChargeFill } from '../icons.js';
import { computed } from 'vue';
import { isLive } from '../../../shared/app/timeControlUtils.js';

const { currentLobby, hostedGames } = storeToRefs(useLobbyStore());

const waitingGamesCount = computed<{ live: number, correspondence: number }>(() => {
    const count = { live: 0, correspondence: 0 };

    for (const publicId in hostedGames.value) {
        if (isLive(hostedGames.value[publicId])) {
            ++count.live;
        } else {
            ++count.correspondence;
        }
    }

    return count;
});
</script>

<template>
    <div class="mode-strip" role="tablist">
        <button
            @click="currentLobby = 'live'"
            class="mode-panel mode-panel-live"
            :class="{ active: currentLobby === 'live' }"
            type="button" role="tab"
            :aria-selected="currentLobby === 'live'"
        >
            <span class="mode-bg-icon"><IconLightningChargeFill /></span>
            <span class="mode-count">{{ waitingGamesCount.live }}</span>
            <span class="mode-name"><IconLightningChargeFill /> Live</span>
            <span class="mode-hint">Clocked games played now</span>
        </button>
        <button
            @click="currentLobby = 'correspondence'"
            class="mode-panel mode-panel-correspondence"
            :class="{ active: currentLobby === 'correspondence' }"
            type="button" role="tab"
            :aria-selected="currentLobby === 'correspondence'"
        >
            <span class="mode-bg-icon"><IconCalendar /></span>
            <span class="mode-count">{{ waitingGamesCount.correspondence }}</span>
            <span class="mode-name"><IconCalendar /> Correspondence</span>
            <span class="mode-hint">Play at your own pace</span>
        </button>
    </div>
</template>

<style lang="stylus" scoped>
.mode-strip
    display flex
    border-radius 0.5rem
    overflow hidden
    border 1px solid var(--bs-border-color)

.mode-panel
    flex 1
    position relative
    display grid
    grid-template-columns 1fr auto
    grid-template-rows auto auto
    gap 0 0.5rem
    padding 0.75rem 1rem
    border none
    background var(--bs-body-bg)
    text-align left
    cursor pointer
    transition background-color 0.18s, color 0.18s, box-shadow 0.18s
    overflow hidden

    &:first-child
        border-right 1px solid var(--bs-border-color)

    &:focus-visible
        outline 2px solid var(--bs-focus-ring-color)
        outline-offset -2px

.mode-bg-icon
    position absolute
    right 0.6rem
    bottom -0.3rem
    font-size 3.8rem
    pointer-events none
    opacity 0.06
    transition opacity 0.18s

.mode-count
    grid-column 2
    grid-row 1 / 3
    align-self center
    font-size 1.8rem
    font-weight 700
    line-height 1
    transition color 0.18s
    color var(--bs-secondary-color)

.mode-name
    grid-column 1
    grid-row 1
    font-weight 600
    font-size 0.95rem
    transition color 0.18s
    color var(--bs-secondary-color)

.mode-hint
    grid-column 1
    grid-row 2
    font-size 0.75rem
    color var(--bs-secondary-color)
    opacity 0.7

.mode-panel-live
    &:not(.active):hover
        background var(--bs-tertiary-bg)

        .mode-bg-icon
            opacity 0.1

    &.active
        box-shadow inset 0 -4px 0 var(--bs-success)
        cursor default

        .mode-count, .mode-name
            color var(--bs-success)

        .mode-bg-icon
            opacity 0.12

.mode-panel-correspondence
    &:not(.active):hover
        background var(--bs-tertiary-bg)

        .mode-bg-icon
            opacity 0.1

    &.active
        box-shadow inset 0 -4px 0 var(--bs-warning)
        cursor default

        .mode-count, .mode-name
            color var(--bs-warning)

        .mode-bg-icon
            opacity 0.12

@css {
    .mode-panel-live.active {
        background: color-mix(in srgb, var(--bs-success) 8%, var(--bs-body-bg));
    }

    .mode-panel-correspondence.active {
        background: color-mix(in srgb, var(--bs-warning) 8%, var(--bs-body-bg));
    }
}
</style>
