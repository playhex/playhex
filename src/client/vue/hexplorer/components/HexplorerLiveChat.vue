<script setup lang="ts">
/*
 * Chat of a Hexplorer live session, looking like game chat.
 * Messages are stored in channel "hexplorer-live-<publicId>".
 */
import { computed, inject, onBeforeUnmount, ref, watch, watchEffect } from 'vue';
import { storeToRefs } from 'pinia';
import { useChannel } from '../../composables/useChannel.js';
import { useStickToBottom } from '../../composables/useStickToBottom.js';
import useAuthStore from '../../../stores/authStore.js';
import { apiGetPlayerIsCurrentlyChatRestricted } from '../../../apiClient.js';
import type { GameView } from '@playhex/pixi-board';
import type { Move } from '@playhex/move-notation';
import { blockEnterOnMobile, formatMessagePostedHour, makeLinksClickable, makesCoordsInteractive, relCoordsTranslate, sanitizeMessage } from '../../../../shared/app/chatUtils.js';
import { useCoordsMarks } from '../../composables/useCoordsMarks.js';
import { hexplorerLiveChannelName } from '../../../../shared/app/hexplorerLive.js';
import { useChatInputStore } from '../../../stores/chatInputStore.js';
import { hexplorerKey } from '../composables/useHexplorer.js';
import { makeNodeMentionsInteractive, resolveNodeMention } from '../nodeMention.js';
import AppPseudo from '../../components/AppPseudo.vue';
import AppChatNewMessagesLine from '../../components/AppChatNewMessagesLine.vue';
import { IconChatDots, IconSendFill } from '../../icons.js';

const props = defineProps<{
    publicId: string;

    /**
     * Session ended: messages are still displayed, but cannot post anymore.
     */
    closed: boolean;
}>();

const { messages, postMessage, hasOlderMessages, loadingOlderMessages, loadOlderMessages, firstUnseenMessage, inputFocused } = useChannel(hexplorerLiveChannelName(props.publicId));

const { loggedInPlayer } = storeToRefs(useAuthStore());

const isChatBlocked = ref(false);

watchEffect(async () => {
    if (!loggedInPlayer.value) {
        isChatBlocked.value = false;
        return;
    }

    isChatBlocked.value = await apiGetPlayerIsCurrentlyChatRestricted(loggedInPlayer.value.publicId);
});

const isChatInputEnabled = computed(() => loggedInPlayer.value !== null && !isChatBlocked.value && !props.closed);

// From store, so that ctrl+click on a tree node can paste its mention here
const chatInputStore = useChatInputStore();
const chatChannel = hexplorerLiveChannelName(props.publicId);
const chatInput = chatInputStore.getChatInput(chatChannel);
const chatInputElement = ref<HTMLInputElement>();
const messagesElement = ref<HTMLElement>();

// Keep focus when pasting coords or a node mention, but not when input is cleared after sending (would reopen keyboard on mobile)
watch(chatInput, input => {
    if (input !== '') {
        chatInputElement.value?.focus();
    }
});

const { contentChanged } = useStickToBottom(messagesElement);

watch(messages, () => contentChanged(), { deep: true });

const { tree, currentNodeId, readonly, userGoToNode, highlightNode, gameView, state } = inject(hexplorerKey)!;

/**
 * Like game chat (see renderMessageWithCoords()), plus node mentions ("12.e5"),
 * made interactive before coords so that "e5" is not matched inside them.
 */
const renderMessage = (content: string): string => {
    const { boardsize } = state.value;
    let str = sanitizeMessage(content);

    str = makeLinksClickable(str);
    str = relCoordsTranslate(str, boardsize);
    str = makeNodeMentionsInteractive(str);
    str = makesCoordsInteractive(str, boardsize);

    return str;
};

const { coordsClick } = useCoordsMarks(gameView);

/*
 * Ctrl+click on board to paste coords in chat, like in game.
 * Board is rebuilt when boardsize changes, so listen each new one.
 */
const pasteCoords = (move: Move): void => {
    if (!isChatInputEnabled.value) {
        return;
    }

    chatInputStore.appendToChatInput(chatChannel, move);
};

watch(gameView, (current: GameView, previous?: GameView) => {
    previous?.off('hexClickedSecondary', pasteCoords);
    current?.on('hexClickedSecondary', pasteCoords);
}, { immediate: true });

onBeforeUnmount(() => gameView.value?.off('hexClickedSecondary', pasteCoords));

/**
 * Click on coords: show them on board.
 * Click on a node mention ("12.e5"): select this node, or only show it in tree when I cannot navigate.
 */
const messagesClick = (e: MouseEvent): void => {
    const { target } = e;

    if (!(target instanceof HTMLElement)) {
        return;
    }

    if (!target.dataset.nodeMention) {
        coordsClick(e);
        return;
    }

    const nodeId = resolveNodeMention(tree, target.dataset.nodeMention, currentNodeId.value);

    if (nodeId === null) {
        return;
    }

    if (!readonly.value) {
        userGoToNode(nodeId);
    }

    highlightNode(nodeId);
};

const sendChat = async (): Promise<void> => {
    const content = chatInput.value.trim();

    if (!content) {
        return;
    }

    chatInput.value = '';

    try {
        await postMessage(content);
    } catch {
        chatInput.value = content;
    }
};
</script>

<template>
    <div class="hexplorer-live-chat bg-body">
        <div class="chat-messages" ref="messagesElement" @click="messagesClick">
            <div class="container-fluid">
                <div v-if="hasOlderMessages" class="text-center">
                    <button
                        type="button"
                        class="btn btn-sm btn-link text-secondary"
                        :disabled="loadingOlderMessages"
                        @click="loadOlderMessages()"
                    >{{ $t('load_older_messages') }}</button>
                </div>

                <template v-for="message in messages" :key="message.publicId">
                    <AppChatNewMessagesLine v-if="message.publicId === firstUnseenMessage?.publicId" />
                    <div class="chat-message">
                        <small class="time text-secondary">{{ formatMessagePostedHour(message.createdAt) }}</small>
                        <span>&nbsp;</span>
                        <span class="player" v-if="message.player"><AppPseudo :player="message.player" /></span>
                        <span v-if="message.player">&nbsp;</span>

                        <span class="content text-body-secondary fst-italic" v-if="message.contentTranslationKey">{{ $t(message.contentTranslationKey, message.translationParameters ?? {}) }}</span>
                        <!-- eslint-disable-next-line vue/no-v-html message.content is sanitized for XSS, see renderMessage() -->
                        <span class="content" v-else v-html="renderMessage(message.content)"></span>
                    </div>
                </template>

                <p v-if="!messages.length" class="chat-empty"><IconChatDots /></p>
            </div>
        </div>

        <form class="chat-input" @submit.prevent="sendChat">
            <div class="input-group">
                <input
                    v-model="chatInput"
                    ref="chatInputElement"
                    @keydown="blockEnterOnMobile"
                    @focus="inputFocused = true"
                    @blur="inputFocused = false"
                    class="form-control bg-body-tertiary"
                    :placeholder="isChatInputEnabled ? $t('chat_message_placeholder') : ''"
                    maxlength="1000"
                    :disabled="!isChatInputEnabled"
                />
                <button
                    class="btn chat-message-submit"
                    :class="isChatInputEnabled ? 'btn-success' : 'btn-secondary'"
                    type="submit"
                    :disabled="!isChatInputEnabled"
                ><IconSendFill /> <span class="d-none d-md-inline">{{ $t('send_chat_message') }}</span></button>
            </div>
        </form>
    </div>
</template>

<style lang="stylus" scoped>
.hexplorer-live-chat
    display flex
    flex-direction column
    min-height 0

.chat-messages
    flex 1 1 auto
    font-size 0.9em
    overflow-y auto
    min-height 0

    .time
        font-family monospace
        margin-inline-end 0.5em

    .player
        margin-inline-end 0.5em

    .content
        overflow-wrap break-word
        hyphens auto

    .chat-message:last-child
        margin-bottom 1.5em

.chat-empty
    text-align center
    opacity 0.06
    margin-top 1.5em

    svg
        width 6em
        height 6em

.chat-input
    flex 0 1 auto
    margin-top auto

    input, button
        border-radius 0
        border-width 0

    .chat-message-submit
        min-width 4em
</style>
