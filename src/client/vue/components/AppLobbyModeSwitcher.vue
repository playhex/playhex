<script setup lang="ts">
import { storeToRefs } from 'pinia';
import useLobbyStore from '../../stores/lobbyStore.js';
import usePlayingGamesCountStore from '../../stores/playingGamesCountStore.js';
import { IconCalendar, IconLightningChargeFill } from '../icons.js';
import { computed } from 'vue';
import { isLive } from '../../../shared/app/timeControlUtils.js';

const lobbyStore = useLobbyStore();
const { isSoftRemoved } = lobbyStore;
const { currentLobby, hostedGames } = storeToRefs(lobbyStore);
const { live: livePlayingCount, correspondence: correspondencePlayingCount } = storeToRefs(usePlayingGamesCountStore());

const waitingGamesCount = computed<{ live: number, correspondence: number }>(() => {
    const count = { live: 0, correspondence: 0 };

    for (const publicId in hostedGames.value) {
        if (isSoftRemoved(hostedGames.value[publicId])) {
            continue;
        }

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
            <span class="mode-name"><IconLightningChargeFill /> {{ $t('time_cadency.normal') }}</span>
            <span class="mode-description">{{ $t('lobby_mode.live_description') }}</span>
            <span class="mode-stats">
                <span class="mode-open">
                    <span class="mode-open-count">{{ waitingGamesCount.live }}</span>
                    <span class="mode-open-label">{{ $t('lobby_mode.open') }}</span>
                </span>
                <span class="mode-playing">{{ $t('lobby_mode.n_playing', { n: livePlayingCount ?? '…' }) }}</span>
            </span>
        </button>
        <button
            @click="currentLobby = 'correspondence'"
            class="mode-panel mode-panel-correspondence"
            :class="{ active: currentLobby === 'correspondence' }"
            type="button" role="tab"
            :aria-selected="currentLobby === 'correspondence'"
        >
            <span class="mode-bg-icon"><IconCalendar /></span>
            <span class="mode-name"><IconCalendar /> {{ $t('time_cadency.correspondence') }}</span>
            <span class="mode-description">{{ $t('lobby_mode.correspondence_description') }}</span>
            <span class="mode-stats">
                <span class="mode-open">
                    <span class="mode-open-count">{{ waitingGamesCount.correspondence }}</span>
                    <span class="mode-open-label">{{ $t('lobby_mode.open') }}</span>
                </span>
                <span class="mode-playing">{{ $t('lobby_mode.n_playing', { n: correspondencePlayingCount ?? '…' }) }}</span>
            </span>
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
    align-items center
    gap 0.15rem 1.25rem
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

.mode-name
    grid-column 1
    grid-row 1
    font-weight 600
    font-size 0.95rem
    color var(--bs-secondary-color)
    transition color 0.18s
    white-space nowrap

.mode-description
    grid-column 1
    grid-row 2
    font-size 0.75rem
    color var(--bs-secondary-color)
    opacity 0.6

@media (max-width: 575.5px)
    .mode-description, .mode-open-label, .mode-playing
        display none

    .mode-name
        overflow hidden
        text-overflow ellipsis
        max-width 75%

        svg
            display none

.mode-stats
    grid-column 2
    display flex
    flex-direction column
    align-items flex-end
    gap 0.1rem

    @media (min-width: 576px)
        grid-row 1 / 3

.mode-open
    display flex
    align-items baseline
    gap 0.35rem

.mode-open-count
    font-size 1.8rem
    font-weight 700
    line-height 1
    color var(--bs-secondary-color)
    transition color 0.18s

.mode-open-label
    font-size 0.7rem
    font-weight bold
    text-transform uppercase
    letter-spacing 0.04em
    color var(--bs-secondary-color)
    opacity 0.7
    transition color 0.18s

.mode-playing
    font-size 0.72rem
    color var(--bs-secondary-color)
    opacity 0.55

.mode-panel-live
    &:not(.active):hover
        background var(--bs-tertiary-bg)

        .mode-bg-icon
            opacity 0.1

    &.active
        box-shadow inset 0 -4px 0 var(--bs-success)
        cursor default

        .mode-name, .mode-open-count, .mode-open-label
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

        .mode-name, .mode-open-count, .mode-open-label
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
