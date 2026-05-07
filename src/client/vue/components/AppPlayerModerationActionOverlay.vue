<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue';
import { format } from 'date-fns';
import PlayerModerationAction from '../../../shared/app/models/PlayerModerationAction.js';
import { pseudoStringOptional } from '../../../shared/app/pseudoUtils.js';
import { IconCaretDownFill } from '../icons.js';

defineProps({
    action: {
        type: PlayerModerationAction,
        required: true,
    },
});

const emit = defineEmits<{
    (e: 'acknowledge'): void;
}>();

const hasMoreBelow = ref(false);
const modalBody = useTemplateRef('modalBody');

const updateHasMoreBelow = () => {
    const el = Array.isArray(modalBody.value) ? modalBody.value[0] : modalBody.value;
    hasMoreBelow.value = !!el && el.scrollTop + el.clientHeight < el.scrollHeight - 4;
};

onMounted(() => updateHasMoreBelow());
</script>

<template>
    <div class="modal d-block">
        <div class="modal-dialog modal-fullscreen">
            <div class="modal-content">
                <div class="modal-header bg-warning-subtle">
                    <div class="wrapper">
                        <h4 class="modal-title">{{ $t('moderation_action_overlay.title') }}</h4>
                    </div>
                </div>

                <div ref="modalBody" class="modal-body" @scroll="updateHasMoreBelow">
                    <div class="wrapper">
                        <p v-if="action.chatBlockedUntil === null" class="lead text-warning">
                            {{ $t('moderation_action_overlay.warning_only') }}
                        </p>
                        <p v-else class="lead text-danger">
                            {{ $t('moderation_action_overlay.chat_block_until', {
                                date: format(action.chatBlockedUntil, 'PPP'),
                            }) }}
                        </p>

                        <template v-if="action.reason !== null">
                            <h6>{{ $t('moderation_action_overlay.reason') }}</h6>
                            <p>{{ $t(action.reason) }}</p>
                        </template>

                        <template v-if="action.reasonDetails !== null">
                            <h6>{{ $t('moderation_action_overlay.details') }}</h6>
                            <p>{{ action.reasonDetails }}</p>
                        </template>

                        <template v-if="action.relatedChatMessages?.length > 0">
                            <h6>{{ $t('moderation_action_overlay.related_messages') }}</h6>
                            <ul class="list-group">
                                <li
                                    v-for="message in action.relatedChatMessages"
                                    :key="message.publicId"
                                    class="list-group-item"
                                >
                                    <div class="d-flex justify-content-between align-items-baseline mb-1">
                                        <small class="text-secondary">{{ format(message.createdAt, 'PPp') }}</small>
                                    </div>
                                    <span>
                                        <strong>{{ pseudoStringOptional(message.player) }}</strong>
                                        <span>: {{ message.content }}</span>
                                    </span>
                                </li>
                            </ul>
                        </template>

                        <div class="text-center my-4">
                            <button
                                type="button"
                                class="btn btn-primary btn-lg"
                                @click="emit('acknowledge')"
                            >{{ $t('moderation_action_overlay.acknowledge') }}</button>
                        </div>
                    </div>
                </div>

                <div v-if="hasMoreBelow" class="scroll-hint">
                    <IconCaretDownFill />
                    <div class="scroll-hint-text">{{ $t('moderation_action_overlay.scroll_hint') }}</div>
                </div>
            </div>
        </div>
    </div>
    <div class="modal-backdrop show"></div>
</template>

<style lang="stylus" scoped>
.scroll-hint
    position absolute
    bottom 0
    left 0
    right 0
    padding 2rem 0 0.75rem
    text-align center
    font-size 1.25rem
    background linear-gradient(to bottom, transparent, var(--bs-body-bg) 60%)
    pointer-events none
    color var(--bs-secondary-color)

.scroll-hint-text
    font-size 0.85rem
    margin-top 0.25rem

.wrapper
    width 100%
    max-width 36em
    margin auto
</style>
