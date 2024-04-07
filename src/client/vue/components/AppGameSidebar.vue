<script setup lang="ts">
/* eslint-env browser */
import { PropType, nextTick, onMounted, ref, toRefs, watch } from 'vue';
import { BIconAlphabet, BIconSendFill, BIconArrowBarRight, BIconBoxArrowUpRight, BIconShareFill, BIconCheck } from 'bootstrap-icons-vue';
import copy from 'copy-to-clipboard';
import useAuthStore from '../../stores/authStore';
import AppPseudo from './AppPseudo.vue';
import HostedGameClient from 'HostedGameClient';
import Player from '../../../shared/app/models/Player';
import AppPseudoWithOnlineStatus from './AppPseudoWithOnlineStatus.vue';
import AppGameAnalyze from './AppGameAnalyze.vue';
import AppGameRulesSummary from './AppGameRulesSummary.vue';
import AppTimeControlLabel from './AppTimeControlLabel.vue';
import Move from '@shared/game-engine/Move';
import { canPlayerChatInGame } from '../../../shared/app/chatUtils';
import { format, formatDistanceToNow } from 'date-fns';
import { gameToHexworldLink } from '../../../shared/app/hexworld';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils';
import { outcomeToString } from '../../../shared/game-engine';
import useAnalyzeStore from '../../stores/analyzeStore';

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

/*
 * Share game link to send to a friend.
 * Useful on PWA when url bar is not displayed.
 * On desktop, just copy link.
 * On mobile, use share api to allow share to other apps, or just copy.
 */
const { href } = window.location;
const copiedResult = ref<null | true | false>(null);
let copiedResultTimeout: null | number = null;
type CopyResult = 'copied' | 'canceled' | 'unsupported';

const shareWithShareApi = async (): Promise<CopyResult> => {
    const shareData = {
        title: document.title,
        url: href,
    };

    if (!navigator.canShare || !navigator.canShare(shareData)) {
        return 'unsupported';
    }

    try {
        await navigator.share(shareData);

        return 'copied';
    } catch (e) {
        return 'canceled';
    }
};

const shareGameLink = async (): Promise<CopyResult> => {
    const result = await shareWithShareApi();

    if ('unsupported' !== result) {
        return result;
    }

    return copy(href) ? 'copied' : 'unsupported';
};

const shareGameLinkAndShowResult = async (): Promise<void> => {
    // In case "copied!" is already displayed, make it blink before copy again to show it worked again
    if (null !== copiedResultTimeout) {
        clearTimeout(copiedResultTimeout);
        copiedResult.value = null;
        await new Promise(resolve => setTimeout(resolve, 80));
    }

    const result = await shareGameLink();

    if ('copied' === result) {
        copiedResult.value = true;
    }

    if ('unsupported' === result) {
        copiedResult.value = false;
    }

    copiedResultTimeout = window.setTimeout(() => {
        copiedResult.value = null;

        if (null !== copiedResultTimeout) {
            clearTimeout(copiedResultTimeout);
            copiedResultTimeout = null;
        }
    }, 30000);
};

// Add absolute coordinates along side relative coordinates when the relative coordinates
// are sourrounded in brackets []
const relCoordsTranslate = (str: string): string => {
    const size = hostedGameClient.value.getGame().getBoard().getSize();

    return str.replace(/\[(\d+'?)([-,]?)(\d+'?)]/g, (input, row: string, sep: string, col: string) => {
        const rowNumber = row.endsWith("'")
            ? parseInt(row)
            : size - parseInt(row) + 1;

        if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > size)
            return input;

        const colNumber = col.endsWith("'")
            ? size - parseInt(col) + 1
            : parseInt(col);

        if (!Number.isInteger(colNumber) || colNumber < 1 || colNumber > size)
            return input;

        const colLetter = Move.colToLetter(colNumber - 1);

        return `${row}${sep || ''}${col}(${colLetter}${rowNumber})`;
    });
};

const renderMessage = (str: string): string => {
    str = str.replace(/[<>&]/g, matched => {
        switch (matched) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            default: return '';
        }
    });
    str = str.replace(/https?:\/\/[\S]+[^\s?.,]/g, link => {
        const escapedLink = link.replace(/"/g, '&quot;');
        return `<a target="_blank" href="${escapedLink}">${link}</a>`;
    });
    if (str.includes('['))
        str = relCoordsTranslate(str);
    return str;
};

/*
 * Game analyze
 */
const analyzeStore = useAnalyzeStore();
const gameId = hostedGameClient.value.getId();
const gameAnalyze = analyzeStore.getAnalyze(gameId);

(async () => {
    if (hostedGameClient.value.getGame().isEnded()) {
        analyzeStore.loadAnalyze(gameId);
    }
})();

const doAnalyzeGame = async () => {
    analyzeStore.loadAnalyze(gameId, true);
};
</script>

<template>
    <div class="sidebar-blocks">
        <div class="block-game-info">
            <div class="container-fluid">
                <template v-if="'created' === hostedGameClient.getState()">
                    <h3>Waiting for an opponent…</h3>
                    <p>
                        <small>Rules: <AppGameRulesSummary :gameOptions="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>Time control: <AppTimeControlLabel :gameOptions="hostedGameClient.getGameOptions()" /></small>
                    </p>
                    <p>
                        Game created by
                        <AppPseudoWithOnlineStatus :player="hostedGameClient.getHostedGameData().host" />,
                        {{ formatDistanceToNow(hostedGameClient.getHostedGameData().createdAt) }} ago.
                    </p>
                </template>
                <template v-if="'canceled' === hostedGameClient.getState()">
                    <h3>Game has been canceled</h3>
                    <p>
                        <small>Rules: <AppGameRulesSummary :gameOptions="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>Time control: <AppTimeControlLabel :gameOptions="hostedGameClient.getGameOptions()" /></small>
                    </p>
                    <p>
                        Game was created by
                        <AppPseudoWithOnlineStatus :player="hostedGameClient.getHostedGameData().host" />,
                        {{ formatDistanceToNow(hostedGameClient.getHostedGameData().createdAt) }} ago.
                    </p>
                </template>
                <template v-if="'playing' === hostedGameClient.getState()">
                    <h3>Playing</h3>
                    <p>
                        <small>Rules: <AppGameRulesSummary :gameOptions="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>Time control: <AppTimeControlLabel :gameOptions="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>Started: {{ format(hostedGameClient.getHostedGameData().gameData?.startedAt as Date, 'd MMMM yyyy p') }}</small>
                    </p>
                </template>
                <template v-if="'ended' === hostedGameClient.getState()">
                    <h3>
                        <AppPseudo :player="hostedGameClient.getStrictWinnerPlayer()" :classes="playerColor(hostedGameClient.getStrictWinnerPlayer())" />
                        wins
                        <template v-if="hostedGameClient.getHostedGameData().gameData?.outcome">
                            {{ outcomeToString(hostedGameClient.getHostedGameData().gameData?.outcome ?? null) }}
                        </template>
                    </h3>
                    <p>
                        <small>Rules: <AppGameRulesSummary :gameOptions="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>Time control: <AppTimeControlLabel :gameOptions="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>Started: {{ format(hostedGameClient.getHostedGameData().gameData?.startedAt as Date, 'd MMMM yyyy p') }}</small>
                        <br>
                        <small>Ended: {{ format(hostedGameClient.getHostedGameData().gameData?.endedAt as Date, 'd MMMM yyyy p') }}</small>
                    </p>
                </template>
            </div>
        </div>

        <div class="block-controls">
            <div class="container-fluid">
                <button type="button" class="btn btn-sm btn-outline-primary me-2 mb-2" @click="e => { e.preventDefault(); emits('toggleCoords') }"><BIconAlphabet /> Toggle coords</button>

                <a
                    v-if="shouldDisplayHexworldLink()"
                    type="button"
                    class="btn btn-sm btn-outline-primary me-2 mb-2"
                    target="_blank"
                    :href="gameToHexworldLink(hostedGameClient.getGame())"
                ><BIconBoxArrowUpRight /> <img src="/images/hexworld-icon.png" alt="HexWorld icon" height="18" /> HexWorld</a>

                <br>
                <a :href="href" class="btn btn-sm btn-outline-primary mb-2" @click="e => { e.preventDefault(); shareGameLinkAndShowResult() }"><BIconShareFill /> Share game</a>
                <small v-if="true === copiedResult" class="text-success me-2"><BIconCheck /> Copied!</small>
                <small v-else-if="false === copiedResult" class="text-warning me-2">not copied, use right click or long press</small>
            </div>
        </div>

        <div class="block-review" v-if="hostedGameClient.getGame().isEnded()">
            <div class="container-fluid">
                <div v-if="null === gameAnalyze" class="text-center">
                    <button class="btn btn-sm btn-primary my-2" @click="doAnalyzeGame()">Analyze game</button>
                </div>
                <p v-else-if="null === gameAnalyze.endedAt" class="text-center">
                    Analyze requested…
                    <small>({{ formatDistanceToNow(gameAnalyze.startedAt, { addSuffix: true }) }})</small>
                </p>
                <p v-else-if="null === gameAnalyze.analyze" class="text-center text-warning">
                    Analyze errored!
                    <button class="btn btn-sm btn-primary my-2" @click="doAnalyzeGame()">Try again</button>
                </p>
                <AppGameAnalyze v-else :analyze="gameAnalyze.analyze" />
            </div>
        </div>

        <div class="block-fill-rest">
            <div class="chat-messages" ref="chatMessagesElement">
                <div class="container-fluid">
                    <small>Chat</small>
                    <div
                        v-for="message in hostedGameClient.getChatMessages()"
                        :key="message.createdAt.getTime()"
                        class="chat-message"
                    >
                        <span class="time text-muted">{{ formatHour(message.createdAt) }}</span>
                        <span>&nbsp;</span>
                        <span class="player" v-if="message.author"><AppPseudo :player="message.author" :classes="playerColor(message.author)" /></span>
                        <span class="player fst-italic" v-else>System</span>
                        <span>&nbsp;</span>
                        <!-- eslint-disable-next-line vue/no-v-html message.content is sanitized for XSS, see renderMessage() -->
                        <span class="content" v-html="renderMessage(message.content)"></span>
                    </div>
                </div>
            </div>

            <form class="chat-input" v-if="true === canPlayerChatInGame(loggedInPlayer, hostedGameClient.getHostedGameData())">
                <div class="container-fluid">
                    <div class="input-group mb-3">
                        <input v-model="chatInput" class="form-control" aria-describedby="message-submit" placeholder="Message…" />
                        <button class="btn btn-success" type="submit" @click="e => { e.preventDefault(); sendChat() }" id="message-submit"><BIconSendFill /> Send</button>
                    </div>
                </div>
            </form>
        </div>

        <div class="block-close bg-dark-subtle">
            <button type="button" class="btn btn-link text-body" aria-label="Close" @click="emits('close')">Close <BIconArrowBarRight /></button>
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

            .content
                overflow-wrap break-word
                hyphens auto

        .chat-input
            flex 0 1 auto
            margin-top auto

.block-game-info
    h3
        margin-top 0.75rem

.block-review
    min-height 6em

.block-controls
    > div
        margin 1em 0

.block-close
    position relative
    height 3em
    min-height 3em

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
