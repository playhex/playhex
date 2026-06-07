<script setup lang="ts">
import { computed } from 'vue';
import { useDisclosure } from '@overlastic/vue';
import useNotificationStore from '../../../stores/notificationStore.js';
import { IconBell, IconTrophyFill, IconHourglass, IconArrowCounterclockwise } from '../../icons.js';

export type NotificationType = 'tournament_checkin_opens' | 'correspondence_your_turn' | 'rematch';

const props = defineProps<{
    featuredNotification?: NotificationType;
}>();

const { visible, confirm, cancel } = useDisclosure();

const { requestPermission } = useNotificationStore();

const enable = async () => {
    await requestPermission();
    confirm();
};

const notifIcon: Record<NotificationType, unknown> = {
    tournament_checkin_opens: IconTrophyFill,
    correspondence_your_turn: IconHourglass,
    rematch: IconArrowCounterclockwise,
};

const allNotifications: NotificationType[] = ['tournament_checkin_opens', 'correspondence_your_turn', 'rematch'];

const secondaryNotifications = computed(() => allNotifications.filter(n => n !== props.featuredNotification));
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="cancel()">
            <div class="modal-dialog modal-dialog-centered" @click="e => e.stopPropagation()">
                <div class="modal-content">
                    <button type="button" class="btn-close position-absolute top-0 end-0 m-3 z-3" @click="cancel()"></button>

                    <div class="modal-body pt-4 px-4 pb-3">
                        <div class="d-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary mx-auto mb-3" style="width:4rem;height:4rem;font-size:1.75rem">
                            <IconBell />
                        </div>

                        <h5 class="mb-1 text-center">{{ $t('enable_notifications_overlay.title') }}</h5>
                        <p class="my-3">{{ $t('enable_notifications_overlay.you_will_be_notified') }}</p>

                        <!-- Featured notification -->
                        <div
                            v-if="props.featuredNotification"
                            class="d-flex align-items-center gap-2 rounded p-3 mb-3 bg-info-subtle text-info-emphasis border border-info-subtle"
                        >
                            <component :is="notifIcon[props.featuredNotification]" class="flex-shrink-0 fs-5" />
                            <span>{{ $t(`enable_notifications_overlay.notifications.${props.featuredNotification}`) }}</span>
                        </div>

                        <!-- Other notifications list -->
                        <p class="text-body-secondary text-start small mb-2">{{ $t('enable_notifications_overlay.also_notified_for') }}</p>
                        <ul class="list-unstyled text-start text-body-secondary small mb-0">
                            <li
                                v-for="(notif, i) in secondaryNotifications"
                                :key="notif"
                                class="d-flex align-items-center gap-2"
                                :class="{ 'mb-1': i < secondaryNotifications.length - 1 }"
                            >
                                <component :is="notifIcon[notif]" class="flex-shrink-0" />
                                {{ $t(`enable_notifications_overlay.notifications.${notif}`) }}
                            </li>
                        </ul>
                    </div>

                    <div class="modal-footer justify-content-center gap-2 border-0 pb-4">
                        <button type="button" class="btn btn-outline-secondary" @click="cancel()">{{ $t('enable_notifications_overlay.later') }}</button>
                        <button type="button" class="btn btn-success" @click="enable()">{{ $t('enable_notifications_overlay.enable') }}</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>
