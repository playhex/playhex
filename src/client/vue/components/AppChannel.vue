<script setup lang="ts">
import { format, isThisWeek, isToday, isYesterday } from 'date-fns';
import { computed, nextTick, PropType, ref, watch, watchEffect } from 'vue';
import { storeToRefs } from 'pinia';
import { t } from 'i18next';
import { IconSendFill } from '../icons.js';
import { useChannel } from '../composables/useChannel.js';
import { useStickToBottom } from '../composables/useStickToBottom.js';
import useAuthStore from '../../stores/authStore.js';
import { sanitizeMessage, makeLinksClickable, blockEnterOnMobile } from '../../../shared/app/chatUtils.js';
import AppPseudo from './AppPseudo.vue';
import { apiGetPlayerIsCurrentlyChatRestricted } from '../../apiClient.js';

const props = defineProps({
    channels: {
        type: [String, Array] as PropType<string | string[]>,
        required: true,
    },
});

const channelNames = Array.isArray(props.channels) ? props.channels : [props.channels];

// All composables must be initialized unconditionally at setup time.
const channelComposables = Object.fromEntries(channelNames.map(name => [name, useChannel(name)]));

const activeChannel = ref(channelNames[0]);

// Unwrap the active channel's messages into a plain computed array to avoid
// nested-ref ambiguity in the template (Volar would otherwise see Ref<T> properties).
const messages = computed(() => channelComposables[activeChannel.value].messages.value);
const postMessage = (content: string) => channelComposables[activeChannel.value].postMessage(content);
const hasOlderMessages = computed(() => channelComposables[activeChannel.value].hasOlderMessages.value);
const loadingOlderMessages = computed(() => channelComposables[activeChannel.value].loadingOlderMessages.value);
const slowMode = computed(() => channelComposables[activeChannel.value].slowMode.value);

// One input string kept per channel so switching tabs doesn't discard typed text.
const chatInputs = ref<Record<string, string>>(Object.fromEntries(channelNames.map(name => [name, ''])));
const chatInput = computed({
    get: () => chatInputs.value[activeChannel.value],
    set: val => { chatInputs.value[activeChannel.value] = val; },
});

const { loggedInPlayer } = storeToRefs(useAuthStore());

const isChatBlocked = ref(false);

watchEffect(async () => {
    if (!loggedInPlayer.value) {
        isChatBlocked.value = false;
        return;
    }

    isChatBlocked.value = await apiGetPlayerIsCurrentlyChatRestricted(loggedInPlayer.value.publicId);
});

const inputPlaceholder = computed((): string => {
    if (!loggedInPlayer.value || isChatBlocked.value) {
        return '';
    }

    if (slowMode.value !== null) {
        return t('chat_message_placeholder_slow_mode', { count: slowMode.value });
    }

    return t('chat_message_placeholder');
});

const messagesElement = ref<HTMLElement>();

const formatMessageDate = (date: Date): string => {
    if (isToday(date)) {
        return format(date, 'H:mm');
    }

    if (isYesterday(date) || isThisWeek(date)) {
        return format(date, 'EEE, H:mm');
    }

    return format(date, 'dd/MM/yyyy, H:mm');
};

const renderMessage = (content: string): string => {
    let str = sanitizeMessage(content);
    str = makeLinksClickable(str);
    return str;
};

const { scrollToBottom, contentChanged } = useStickToBottom(messagesElement);

// New message: only scroll if already at bottom, so reading old messages isn't interrupted.
for (const [name, ch] of Object.entries(channelComposables)) {
    watch(ch.messages, () => {
        if (activeChannel.value === name) {
            contentChanged();
        }
    }, { deep: true });
}

// Older messages are prepended: keep the currently visible messages at the same position.
const loadOlderMessages = async () => {
    const el = messagesElement.value;
    const previousScrollHeight = el?.scrollHeight ?? 0;

    await channelComposables[activeChannel.value].loadOlderMessages();
    await nextTick();

    if (el) {
        el.scrollTop += el.scrollHeight - previousScrollHeight;
    }
};

// Tab switch: always scroll to bottom.
watch(activeChannel, () => scrollToBottom());

const sendMessage = async () => {
    const content = chatInput.value.trim();
    if (!content) return;

    chatInput.value = '';

    try {
        await postMessage(content);
    } catch (e) {
        chatInput.value = content;
    }
};
</script>

<template>
    <div class="card channel-card">
        <div class="card-header">
            <ul v-if="channelNames.length > 1" class="nav nav-tabs card-header-tabs">
                <li v-for="name in channelNames" :key="name" class="nav-item">
                    <a
                        class="nav-link"
                        :class="{ active: activeChannel === name }"
                        href="#"
                        @click.prevent="activeChannel = name"
                    >#{{ name }}</a>
                </li>
            </ul>
            <template v-else>#{{ channelNames[0] }}</template>
        </div>

        <div class="card-body channel-messages" ref="messagesElement">
            <div v-if="hasOlderMessages" class="text-center">
                <button
                    type="button"
                    class="btn btn-sm btn-outline-primary mt-2 mb-3"
                    :disabled="loadingOlderMessages"
                    @click="loadOlderMessages"
                >{{ $t('load_older_messages') }}</button>
            </div>
            <div
                v-for="message in messages"
                :key="message.publicId"
                class="channel-message"
            >
                <small class="time text-secondary">{{ formatMessageDate(message.createdAt) }}</small>
                <span v-if="message.player" class="player">
                    <AppPseudo :player="message.player" />
                </span>
                <span class="content text-body-secondary fst-italic" v-if="message.contentTranslationKey">{{ $t(message.contentTranslationKey, message.translationParameters ?? {}) }}</span>
                <!-- eslint-disable-next-line vue/no-v-html message.content is sanitized, see renderMessage() -->
                <span class="content" v-else v-html="renderMessage(message.content)" />
            </div>
            <p v-if="!messages.length" class="text-secondary mb-0">{{ $t('chat') }}</p>
        </div>

        <div class="card-footer p-0">
            <form @submit.prevent="sendMessage" class="input-group">
                <input
                    :value="chatInput"
                    @input="chatInput = ($event.target as HTMLInputElement).value"
                    @keydown="blockEnterOnMobile"
                    class="form-control bg-body-tertiary"
                    :placeholder="inputPlaceholder"
                    maxlength="1000"
                    :disabled="!loggedInPlayer || isChatBlocked"
                />
                <button
                    class="btn"
                    :class="loggedInPlayer && !isChatBlocked ? 'btn-success' : 'btn-secondary'"
                    type="submit"
                    :disabled="!loggedInPlayer || isChatBlocked"
                    :title="$t('send_chat_message')"
                    :aria-label="$t('send_chat_message')"
                ><IconSendFill /></button>
            </form>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.channel-card
    display flex
    flex-direction column
    height 24em

    .channel-messages
        flex 1 1 auto
        overflow-y auto
        font-size 0.9em
        min-height 0

    .channel-message
        margin-bottom 0.25em

        .time
            font-family monospace
            margin-inline-end 0.4em

        .player
            font-weight bold
            margin-inline-end 0.4em

        .content
            overflow-wrap break-word
            hyphens auto

.card-footer
    input, button
        border none
        border-radius 0

    input
        border-radius 0 0 0 var(--bs-card-inner-border-radius)

    button
        border-radius 0 0 var(--bs-card-inner-border-radius) 0
</style>
