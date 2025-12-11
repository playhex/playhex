<script setup lang="ts">
import { formatRelative } from 'date-fns';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { onClickOutside } from '@vueuse/core';
import { IconMailbox, IconMailboxFlag } from '../icons.js';
import { apiPostPlayerNotificationsAcknowledge } from '../../apiClient.js';
import AppNotification from './AppNotification.vue';
import AppUnreadNotificationsBadge from './AppUnreadNotificationsBadge.vue';
import { getOpponent } from '../../services/notifications/context-utils.js';
import { pseudoStringOptional } from '../../../shared/app/pseudoUtils.js';
import usePlayerNotificationsStore from '../../stores/playerNotificationsStore.js';

/**
 * null: not yet loaded
 */
const { playerNotifications, gamePlayerNotifications } = storeToRefs(usePlayerNotificationsStore());

const showNotifications = ref(false);

const notificationsElement = ref<HTMLElement>();

onClickOutside(notificationsElement, () => {
    showNotifications.value = false;
});

const ack = async (hostedGamePublicId?: string) => {
    // if list is loaded, remove acknowledged notifications from local list
    if (Array.isArray(playerNotifications.value)) {
        if (hostedGamePublicId) {
            playerNotifications.value = playerNotifications.value
                .filter(notification => notification.hostedGame?.publicId !== hostedGamePublicId)
            ;
        } else {
            playerNotifications.value = [];
        }
    }

    await apiPostPlayerNotificationsAcknowledge(hostedGamePublicId);
};
</script>

<template>
    <div ref="notificationsElement">
        <button
            @click="showNotifications = !showNotifications"
            class="btn btn-link position-relative p-0 me-3"
            :class="playerNotifications && playerNotifications.length > 0
                ? 'link-body-emphasis'
                : 'link-secondary'
            "
        >
            <IconMailboxFlag v-if="playerNotifications && playerNotifications.length > 0" style="font-size: 1.5em" class="custom-svg-color" />
            <IconMailbox v-else style="font-size: 1.5em" />

            <AppUnreadNotificationsBadge
                v-if="!showNotifications && playerNotifications" :playerNotifications
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
                                v-if="showNotifications && playerNotifications" :playerNotifications
                                class="badge-notifications"
                            />
                        </h5>

                        <button
                            @click="ack()"
                            :disabled="!gamePlayerNotifications || gamePlayerNotifications.length === 0"
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
                        v-for="{ hostedGame, playerNotifications } in gamePlayerNotifications"
                        :key="hostedGame?.publicId ?? 'null'"
                    >
                        <router-link
                            v-if="hostedGame"
                            class="list-group-item list-group-item-action"
                            @click.prevent="showNotifications = false; ack(hostedGame.publicId)"
                            :to="!hostedGame ? '#' : {
                                name: 'online-game',
                                params: {
                                    gameId: hostedGame.publicId,
                                },
                            }"
                        >
                            <h6 class="mb-1">
                                {{ $t('game_against_player', { player: pseudoStringOptional(getOpponent(hostedGame)) }) }}
                                &nbsp;
                                <span class="text-secondary small">
                                    {{ $t('game_created_short', { date: formatRelative(hostedGame.createdAt, new Date()) }) }}
                                </span>
                            </h6>

                            <AppNotification
                                v-for="playerNotification of playerNotifications"
                                :playerNotification
                                class="small"
                            />
                        </router-link>

                        <div v-else class="list-group-item">
                            <h6 class="mb-1">{{ $t('notifications_misc') }}</h6>

                            <AppNotification
                                v-for="playerNotification of playerNotifications"
                                :playerNotification
                                class="small"
                            />
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.badge-notifications
    padding 0.2em 0.4em
    margin-left 0.3em

.player-notifications-container
    position absolute
    width 30em
    max-width 100%
    padding 0.5em
    top 3em
    right 0
    z-index 500

    .player-notifications
        max-height 70vh
</style>

<style lang="stylus">
.custom-svg-color path:first-child
    color var(--bs-danger)

.header-items
    display flex
    justify-content space-between
    align-items center
</style>
