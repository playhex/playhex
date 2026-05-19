<script setup lang="ts">
import { PropType } from 'vue';
import { Player } from '../../../shared/app/models/index.js';
import { IconPersonFill } from '../icons.js';
import AppOnlineStatus from './AppOnlineStatus.vue';

defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
    thumbnail: {
        type: Boolean,
        default: false,
    },
    onlineStatus: {
        type: Boolean,
        default: false,
    },
});
</script>

<template>
    <span v-if="onlineStatus" class="avatar-status-wrapper">
        <template v-if="thumbnail ? (player.avatarThumbnailPath ?? player.avatarPath) : player.avatarPath">
            <img
                :src="thumbnail ? (player.avatarThumbnailPath ?? player.avatarPath!) : player.avatarPath!"
                :alt="player.pseudo"
                class="player-avatar"
            />
            <AppOnlineStatus :player class="avatar-status-badge" />
        </template>
        <AppOnlineStatus v-else :player />
    </span>
    <template v-else>
        <img
            v-if="thumbnail ? (player.avatarThumbnailPath ?? player.avatarPath) : player.avatarPath"
            :src="thumbnail ? (player.avatarThumbnailPath ?? player.avatarPath!) : player.avatarPath!"
            :alt="player.pseudo"
            class="player-avatar"
        />
        <IconPersonFill v-else class="player-avatar-icon" />
    </template>
</template>

<style scoped lang="stylus">
.player-avatar
    border-radius 50%
    object-fit cover
    width 1em
    height 1em

.player-avatar-icon
    font-size 1em

.avatar-status-wrapper
    position relative
    display inline-flex
    width 1em
    height 1em
    flex-shrink 0

    .player-avatar
        width 100%
        height 100%

    .player-avatar-icon
        font-size 100%
        width 100%
        height 100%

.avatar-status-badge
    position absolute
    top 72%
    left 72%
    font-size 0.55em
    line-height 1
    margin 0
</style>
