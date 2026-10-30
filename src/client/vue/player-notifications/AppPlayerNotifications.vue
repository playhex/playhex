<script setup lang="ts">
import { formatRelative } from 'date-fns';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { IconMailbox, IconMailboxFlag } from '../icons.js';
import AppNotification from './AppNotification.vue';
import AppUnreadNotificationsBadge from './AppUnreadNotificationsBadge.vue';
import { getOpponent } from '../../services/context-utils.js';
import { pseudoStringOptional } from '../../../shared/app/pseudoUtils.js';
import usePlayerNotificationsStore from '../../stores/playerNotificationsStore.js';

const playerNotificationsStore = usePlayerNotificationsStore();

/**
 * null: not yet loaded
 */
const {
    playerNotifications,
    unreadPlayerNotifications,
    hasMoreUnread,
    gamePlayerNotifications,
    hasMoreRead,
    loadingMoreRead,
} = storeToRefs(playerNotificationsStore);

const { acknowledge: ack, loadMoreReadNotifications } = playerNotificationsStore;

const showNotifications = ref(false);

const notificationsElement = ref<HTMLElement>();

onClickOutside(notificationsElement, () => {
    showNotifications.value = false;
});
</script>

<template>
    <div ref="notificationsElement">
        <button
            @click="showNotifications = !showNotifications"
            class="btn btn-link position-relative p-0 me-3"
            :class="unreadPlayerNotifications && unreadPlayerNotifications.length > 0
                ? 'link-body-emphasis'
                : 'link-secondary'
            "
            role="button"
            :aria-label="$t('Notifications')"
            :title="$t('Notifications')"
        >
            <IconMailboxFlag v-if="unreadPlayerNotifications && unreadPlayerNotifications.length > 0" style="font-size: 1.5em" class="custom-svg-color" />
            <IconMailbox v-else style="font-size: 1.5em" />

            <AppUnreadNotificationsBadge
                v-if="!showNotifications && unreadPlayerNotifications" :playerNotifications="unreadPlayerNotifications" :hasMore="hasMoreUnread"
                class="position-absolute top-0 start-100 translate-middle badge-notifications rounded-pill"
            />
        </button>

        <div v-if="showNotifications" class="player-notifications-container">
            <div class="card shadow player-notifications">

                <div class="card-header">
                    <div class="header-items">
                        <h5 class="m-0">
                            {{ $t('notifications') }}

                            <AppUnreadNotificationsBadge
                                v-if="showNotifications && unreadPlayerNotifications" :playerNotifications="unreadPlayerNotifications" :hasMore="hasMoreUnread"
                                class="badge-notifications"
                            />
                        </h5>

                        <button
                            @click="ack()"
                            :disabled="!unreadPlayerNotifications || unreadPlayerNotifications.length === 0"
                            class="btn btn-outline-primary btn-sm float-end"
                        >{{ $t('mark_all_as_read') }}</button>
                    </div>
                </div>

                <div v-if="playerNotifications === null" class="card-body">
                    <p class="card-text fst-italic">{{ $t('loading') }}</p>
                </div>

                <div v-else-if="playerNotifications.length === 0" class="card-body">
                    <p class="card-text lead text-secondary">{{ $t('no_notifications') }}</p>
                </div>

                <div v-else class="list-group list-group-flush overflow-auto">
                    <template
                        v-for="{ game, playerNotifications } in gamePlayerNotifications"
                        :key="playerNotifications[0].publicId"
                    >
                        <router-link
                            v-if="game"
                            class="list-group-item list-group-item-action"
                            @click.prevent="showNotifications = false; ack(game.publicId)"
                            :to="!game ? '#' : {
                                name: 'online-game',
                                params: {
                                    gameId: game.publicId,
                                },
                            }"
                        >
                            <h6 class="mb-1" :class="{ 'is-read': playerNotifications.every(n => n.isRead) }">
                                {{ $t('game_against_player', { player: pseudoStringOptional(getOpponent(game)) }) }}
                                &nbsp;
                                <span class="text-secondary small">
                                    {{ $t('game_created_short', { date: formatRelative(game.createdAt, new Date()) }) }}
                                </span>
                            </h6>

                            <AppNotification
                                v-for="playerNotification of playerNotifications"
                                :playerNotification
                                class="small"
                                :class="{ 'is-read': playerNotification.isRead }"
                            />
                        </router-link>

                        <div v-else class="list-group-item" @click="e => (e.target as HTMLElement).closest('a') && (showNotifications = false)">
                            <h6 class="mb-1" :class="{ 'is-read': playerNotifications.every(n => n.isRead) }">{{ $t('notifications_misc') }}</h6>

                            <AppNotification
                                v-for="playerNotification of playerNotifications"
                                :playerNotification
                                class="small"
                                :class="{ 'is-read': playerNotification.isRead }"
                            />
                        </div>
                    </template>
                </div>

                <div v-if="playerNotifications !== null && hasMoreRead" class="card-footer text-center">
                    <button
                        @click="loadMoreReadNotifications()"
                        :disabled="loadingMoreRead"
                        class="btn btn-link btn-sm"
                    >{{ $t('load_more') }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.badge-notifications
    padding 0.2em 0.4em
    margin-inline-start 0.3em

.player-notifications-container
    position absolute
    width 30em
    max-width 100%
    padding 0.5em
    top 3em
    inset-inline-end 0
    z-index 500

    .player-notifications
        max-height 70vh

    .is-read
        opacity 0.5
</style>

<style lang="stylus">
.custom-svg-color path:first-child
    color var(--bs-danger)

.header-items
    display flex
    justify-content space-between
    align-items center
</style>
