<script setup lang="ts">
import { format, isThisWeek, isToday, isYesterday } from 'date-fns';
import { computed, nextTick, PropType, ref, watch, watchEffect } from 'vue';
import { storeToRefs } from 'pinia';
import { IconSendFill } from '../icons.js';
import { useChannel } from '../composables/useChannel.js';
import useAuthStore from '../../stores/authStore.js';
import useToastsStore from '../../stores/toastsStore.js';
import { sanitizeMessage, makeLinksClickable } from '../../../shared/app/chatUtils.js';
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

const scrollToBottom = () => nextTick(() => {
    if (messagesElement.value) {
        messagesElement.value.scrollTop = messagesElement.value.scrollHeight;
    }
});

const isAtBottom = (): boolean => {
    if (!messagesElement.value) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesElement.value;
    return scrollHeight - scrollTop - clientHeight < 50;
};

// New message: only scroll if already at bottom, so reading old messages isn't interrupted.
for (const [name, ch] of Object.entries(channelComposables)) {
    watch(ch.messages, async () => {
        if (activeChannel.value === name && isAtBottom()) {
            await scrollToBottom();
        }
    }, { deep: true });
}

// Tab switch: always scroll to bottom.
watch(activeChannel, () => scrollToBottom());

const sendMessage = async () => {
    const content = chatInput.value.trim();
    if (!content) return;

    chatInput.value = '';

    try {
        await postMessage(content);
    } catch (e) {
        useToastsStore().addToast(e.message ?? 'could not post message', {
            level: 'danger',
        });
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
                    class="form-control bg-body-tertiary"
                    :placeholder="(loggedInPlayer && !isChatBlocked) ? $t('chat_message_placeholder') : ''"
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
            margin-right 0.4em

        .player
            font-weight bold
            margin-right 0.4em

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
