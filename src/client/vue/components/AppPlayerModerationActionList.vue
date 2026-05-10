<script setup lang="ts">
import { format, isFuture } from 'date-fns';
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { PlayerModerationAction } from '../../../shared/app/models/index.js';
import { apiGetPlayerModerationActions } from '../../apiClient.js';
import useAuthStore from '../../stores/authStore.js';
import { pseudoStringOptional } from '../../../shared/app/pseudoUtils.js';
import { IconCheck } from '../icons.js';

const { loggedInPlayer } = storeToRefs(useAuthStore());
const moderationActions = ref<null | PlayerModerationAction[]>(null);

watch(loggedInPlayer, async player => {
    if (!player) {
        moderationActions.value = null;
        return;
    }

    moderationActions.value = await apiGetPlayerModerationActions(true);
}, { immediate: true });

const activeModerationActions = computed(() => {
    if (moderationActions.value === null) {
        return [];
    }

    return moderationActions.value.filter(a => a.chatBlockedUntil && isFuture(a.chatBlockedUntil));
});

const pastModerationActions = computed(() => {
    if (moderationActions.value === null) {
        return [];
    }

    return moderationActions.value.filter(a => !a.chatBlockedUntil || !isFuture(a.chatBlockedUntil));
});
</script>

<template>
    <template v-if="loggedInPlayer && moderationActions !== null">
        <p
            v-if="moderationActions.length === 0"
            class="text-success"
        ><IconCheck /> No moderation actions on your account.</p>

        <template v-else>
            <template v-if="activeModerationActions.length > 0">
                <h5>Active restrictions</h5>

                <ul class="list-group mb-3">
                    <li
                        v-for="action in activeModerationActions"
                        :key="action.publicId"
                        class="list-group-item list-group-item-warning"
                    >
                        <div class="d-flex justify-content-between align-items-baseline">
                            <strong>Chat restricted until {{ format(action.chatBlockedUntil!, 'PPP') }}</strong>
                            <small class="text-secondary">{{ format(action.createdAt, 'PPP') }}</small>
                        </div>
                        <div v-if="action.reason" class="mt-1">
                            <span class="text-secondary">Reason:</span> {{ $t(action.reason) }}
                        </div>
                        <div v-if="action.reasonDetails" class="mt-1">
                            <span class="text-secondary">Details:</span> {{ action.reasonDetails }}
                        </div>
                        <template v-if="action.relatedChatMessages?.length > 0">
                            <div class="mt-2 text-secondary"><small>Related messages:</small></div>
                            <ul class="mt-1">
                                <li
                                    v-for="message in action.relatedChatMessages"
                                    :key="message.publicId"
                                    class="px-0 py-1"
                                >
                                    <small class="text-secondary me-2">{{ format(message.createdAt, 'PPp') }}</small>
                                    <strong>{{ pseudoStringOptional(message.player) }}</strong>: {{ message.content }}
                                </li>
                            </ul>
                        </template>
                    </li>
                </ul>
            </template>

            <template v-if="pastModerationActions.length > 0">
                <h5>Past actions</h5>

                <div class="accordion mb-3" id="past-moderation-accordion">
                    <div
                        v-for="action in pastModerationActions"
                        :key="action.publicId"
                        class="accordion-item"
                    >
                        <h2 class="accordion-header">
                            <button
                                class="accordion-button collapsed py-2"
                                type="button"
                                data-bs-toggle="collapse"
                                :data-bs-target="'#past-action-' + action.publicId"
                                aria-expanded="false"
                                :aria-controls="'past-action-' + action.publicId"
                            >
                                <span class="me-auto">{{ action.chatBlockedUntil ? 'Chat restriction' : 'Warning' }}</span>
                                <small class="text-secondary me-3">{{ format(action.createdAt, 'PPP') }}</small>
                            </button>
                        </h2>
                        <div
                            :id="'past-action-' + action.publicId"
                            class="accordion-collapse collapse"
                            data-bs-parent="#past-moderation-accordion"
                        >
                            <div class="accordion-body py-2">
                                <div v-if="action.reason">
                                    <span class="text-secondary">Reason:</span> {{ $t(action.reason) }}
                                </div>
                                <div v-if="action.reasonDetails" class="mt-1">
                                    <span class="text-secondary">Details:</span> {{ action.reasonDetails }}
                                </div>
                                <template v-if="action.relatedChatMessages?.length > 0">
                                    <div class="mt-2 text-secondary"><small>Related messages:</small></div>
                                    <ul class="mt-1">
                                        <li
                                            v-for="message in action.relatedChatMessages"
                                            :key="message.publicId"
                                            class="px-0 py-1"
                                        >
                                            <small class="text-secondary me-2">{{ format(message.createdAt, 'PPp') }}</small>
                                            <strong>{{ pseudoStringOptional(message.player) }}</strong>: {{ message.content }}
                                        </li>
                                    </ul>
                                </template>
                                <p v-if="!action.reason && !action.reasonDetails && !action.relatedChatMessages?.length" class="text-secondary mb-0">No details.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </template>
    </template>

    <p v-else class="text-secondary">Loading…</p>
</template>
