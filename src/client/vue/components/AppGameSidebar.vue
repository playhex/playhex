<script setup lang="ts">
/* eslint-env browser */
import { PropType, nextTick, onMounted, ref, toRefs, watch } from 'vue';
import { BIconAlphabet, BIconSendFill, BIconArrowBarRight, BIconBoxArrowUpRight } from 'bootstrap-icons-vue';
import useAuthStore from '../../stores/authStore';
import AppPseudo from './AppPseudo.vue';
import HostedGameClient from 'HostedGameClient';
import Player from '../../../shared/app/models/Player';
import AppPseudoWithOnlineStatus from './AppPseudoWithOnlineStatus.vue';
import AppGameRulesSummary from './AppGameRulesSummary.vue';
import AppTimeControlLabel from './AppTimeControlLabel.vue';
import { canPlayerChatInGame } from '../../../shared/app/chatUtils';
import { format, formatDistanceToNow } from 'date-fns';
import { gameToHexworldLink } from '../../../shared/app/hexworld';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils';

const props = defineProps({
    hostedGameClient: {
        type: Object as PropType<HostedGameClient>,
        required: true,
    },
});

const { hostedGameClient } = toRefs(props);

const emits = defineEmits([
    'close',
    'toggleCoords',
]);

const { loggedInPlayer } = useAuthStore();

if (null === loggedInPlayer) {
    throw new Error('Unexpected null logged in player');
}

const formatHour = (date: Date): string => `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
const playerColor = (player: Player): string => {
    const index = hostedGameClient.value.getPlayerIndex(player);

    if (0 === index) {
        return 'text-danger';
    }

    if (1 === index) {
        return 'text-primary';
    }

    return '';
};

const chatInput = ref('');
const chatMessagesElement = ref<HTMLElement>();

const scrollChatToBottom = () => nextTick(() => {
    if (chatMessagesElement.value) {
        chatMessagesElement.value.scrollTop = chatMessagesElement.value.scrollHeight;
    }
});

watch(hostedGameClient.value.getChatMessages(), () => scrollChatToBottom());

const sendChat = () => {
    if ('' === chatInput.value) {
        return;
    }

    hostedGameClient.value.sendChatMessage(chatInput.value);

    chatInput.value = '';
};

onMounted(() => scrollChatToBottom());

/*
 * Show Hexworld link for other players.
 * Should not display to players to prevent playing on an external board,
 * or make cheating too easy.
 * Also prevent display to guest, to prevent grabbing link in a new incognito window.
 */
const shouldDisplayHexworldLink = (): boolean => {
    if ('ended' === hostedGameClient.value.getState()) {
        return true;
    }

    if ('correspondance' === timeControlToCadencyName(hostedGameClient.value.getGameOptions())) {
        return true;
    }

    if (hostedGameClient.value.getState() === 'playing') {
        return !hostedGameClient.value.hasPlayer(loggedInPlayer) && !loggedInPlayer.isGuest;
    }

    return false;
};
</script>

<template>
    <div class="sidebar-blocks">
        <div class="block-game-info">
            <div class="container-fluid">
                <template v-if="'created' === hostedGameClient.getState()">
                    <h3>Waiting for an opponent…</h3>
                    <p>
                        <small>Rules: <app-game-rules-summary :game-options="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>Time control: <app-time-control-label :game-options="hostedGameClient.getGameOptions()" /></small>
                    </p>
                    <p>
                        Game created by
                        <app-pseudo-with-online-status :player="hostedGameClient.getHostedGameData().host" />,
                        {{ formatDistanceToNow(hostedGameClient.getHostedGameData().createdAt) }} ago.
                    </p>
                </template>
                <template v-if="'canceled' === hostedGameClient.getState()">
                    <h3>Game has been canceled</h3>
                    <p>
                        <small>Rules: <app-game-rules-summary :game-options="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>Time control: <app-time-control-label :game-options="hostedGameClient.getGameOptions()" /></small>
                    </p>
                    <p>
                        Game was created by
                        <app-pseudo-with-online-status :player="hostedGameClient.getHostedGameData().host" />,
                        {{ formatDistanceToNow(hostedGameClient.getHostedGameData().createdAt) }} ago.
                    </p>
                </template>
                <template v-if="'playing' === hostedGameClient.getState()">
                    <h3>Playing</h3>
                    <p>
                        <small>Rules: <app-game-rules-summary :game-options="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>Time control: <app-time-control-label :game-options="hostedGameClient.getGameOptions()" /></small>
                    </p>
                </template>
                <template v-if="'ended' === hostedGameClient.getState()">
                    <h3>Game ended</h3>
                    <p>
                        <small>Rules: <app-game-rules-summary :game-options="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>Time control: <app-time-control-label :game-options="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>Ended on {{ format(hostedGameClient.getHostedGameData().gameData?.endedAt as Date, 'd MMMM yyyy') }}</small>
                    </p>
                    <p class="lead text-center">
                        <app-pseudo :player="hostedGameClient.getStrictWinnerPlayer()" :classes="playerColor(hostedGameClient.getStrictWinnerPlayer())" />
                        won the game
                        <template v-if="hostedGameClient.getHostedGameData().gameData?.outcome">
                            by {{ hostedGameClient.getHostedGameData().gameData?.outcome ?? 'path' }}
                        </template>
                    </p>
                </template>
            </div>
        </div>

        <div class="block-controls">
            <div class="container-fluid">
                <button type="button" class="btn btn-sm btn-outline-primary" @click="e => { e.preventDefault(); emits('toggleCoords') }"><b-icon-alphabet /> Toggle coords</button>
                <a
                    v-if="shouldDisplayHexworldLink()"
                    type="button"
                    class="btn btn-sm btn-outline-primary ms-2"
                    target="_blank"
                    :href="gameToHexworldLink(hostedGameClient.getGame())"
                ><b-icon-box-arrow-up-right/> <img src="/images/hexworld-icon.png" alt="HexWorld icon" height="18" /> HexWorld</a>
            </div>
        </div>

        <div class="block-fill-rest">
            <div class="chat-messages" ref="chatMessagesElement">
                <div class="container-fluid">
                    <small>Chat</small>
                    <div
                        v-for="message in hostedGameClient.getChatMessages()"
                        class="chat-message"
                    >
                        <span class="time text-muted">{{ formatHour(message.createdAt) }}</span>
                        <span>&nbsp;</span>
                        <span class="player" v-if="message.author"><app-pseudo :player="message.author" :classes="playerColor(message.author)" /></span>
                        <span class="player fst-italic" v-else>System</span>
                        <span>&nbsp;</span>
                        <span class="content">{{ message.content }}</span>
                    </div>
                </div>
            </div>

            <form class="chat-input" v-if="true === canPlayerChatInGame(loggedInPlayer, hostedGameClient.getHostedGameData())">
                <div class="container-fluid">
                    <div class="input-group mb-3">
                        <input v-model="chatInput" class="form-control" aria-describedby="message-submit" placeholder="Message…" />
                        <button class="btn btn-success" type="submit" @click="e => { e.preventDefault(); sendChat() }" id="message-submit"><b-icon-send-fill /> Send</button>
                    </div>
                </div>
            </form>
        </div>

        <div class="block-close bg-dark-subtle">
            <button type="button" class="btn btn-link text-body" aria-label="Close" @click="emits('close')">Close <b-icon-arrow-bar-right /></button>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
/*
 * Game sidebar.
 *
 *  Must be on right, or hover the screen on mobile.
 *
 *  Chat block must fill the rest of the vertical space,
 *  and scroll text if necessary.
 */
.sidebar-blocks
    position absolute
    width 100%
    height 100%
    display flex
    flex-direction column

    .block-fill-rest
        flex 1 1 auto
        display flex
        flex-direction column
        min-height 0

        .chat-messages
            overflow-y auto
            min-height 0
            padding-bottom 2em

            .time
                font-family monospace
                margin-right 0.5em

            .player
                margin-right 0.5em

        .chat-input
            flex 0 1 auto
            margin-top auto

.block-game-info
    h3
        margin-top 0.75rem

.block-controls
    > div
        margin 1em 0

.block-close
    position relative
    height 3em

    button
        position absolute
        top 0
        left 0
        width 100%
        height 100%
        padding 0
        text-decoration none

        > *
            margin-left 1em
</style>
