<script setup lang="ts">
/* eslint-env browser */
import { PropType, nextTick, onMounted, ref, toRefs, watch } from 'vue';
import { BIconAlphabet, BIconSendFill, BIconArrowBarRight, BIconShareFill, BIconCheck, BIconDownload, BIconTrophy, BIconCaretUpFill, BIconCaretDownFill, BIconInfoCircle } from 'bootstrap-icons-vue';
import { storeToRefs } from 'pinia';
import copy from 'copy-to-clipboard';
import useAuthStore from '../../stores/authStore';
import usePlayerLocalSettingsStore from '../../stores/playerLocalSettingsStore';
import AppPseudo from './AppPseudo.vue';
import HostedGameClient from 'HostedGameClient';
import { ChatMessage, Player, Rating } from '../../../shared/app/models';
import AppGameAnalyze from './AppGameAnalyze.vue';
import AppGameRulesSummary from './AppGameRulesSummary.vue';
import AppTimeControlLabel from './AppTimeControlLabel.vue';
import Move from '@shared/game-engine/Move';
import { canPlayerChatInGame } from '../../../shared/app/chatUtils';
import { format, formatDistanceToNow, formatRelative, intlFormat, isSameDay } from 'date-fns';
import { gameToHexworldLink } from '../../../shared/app/hexworld';
import { canPassAgain } from '../../../shared/app/passUtils';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils';
import useAnalyzeStore from '../../stores/analyzeStore';
import useServerDateStore from '../../stores/serverDateStore';
import { downloadString } from '../../services/fileDownload';
import { pseudoString } from '../../../shared/app/pseudoUtils';
import { hostedGameToSGF } from '../../../shared/app/hostedGameToSGF';
import GameView from '../../pixi-board/GameView';
import { isMyTurn } from '../../services/notifications/context-utils';
import { PlayerIndex } from '@shared/game-engine';
import { fromEngineMove } from '@shared/app/models/Move';
import { autoLocale } from '../../../shared/app/i18n';
import { AnalyzeMoveOutput } from '../../game-analyze/GameAnalyzeView';

const props = defineProps({
    hostedGameClient: {
        type: Object as PropType<HostedGameClient>,
        required: true,
    },
    gameView: {
        type: Object as PropType<null | GameView>,
        required: false,
        default: null,
    },
});

const { hostedGameClient, gameView } = toRefs(props);
const { round, abs } = Math;

const emits = defineEmits([
    'close',
    'toggleCoords',
]);

const { loggedInPlayer } = useAuthStore();
const { localSettings } = storeToRefs(usePlayerLocalSettingsStore());

if (null === loggedInPlayer) {
    throw new Error('Unexpected null logged in player');
}

const formatChatDateHeader = (date: Date): string => intlFormat(date, { day: 'numeric', month: 'long' }, { locale: autoLocale() });
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

const showMove = (moveIndex: number): void => gameView.value?.showPositionAtMove(moveIndex);
const showAnalyzeMove = (move: AnalyzeMoveOutput): void => {
    showMove(move.moveIndex);

    gameView.value?.resetGreens();

    let maxValue = move.bestMoves.reduce((max, current) => Math.max(max, current.value), 0);

    for (const bestMove of move.bestMoves) {
        gameView.value?.setGreen(Move.fromString(bestMove.move), bestMove.value / maxValue);
    }

    gameView.value?.setGreen(Move.fromString(move.move.move), move.move.value / maxValue);
};

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

    if ('correspondence' === timeControlToCadencyName(hostedGameClient.value.getGameOptions())) {
        return true;
    }

    if (hostedGameClient.value.getState() === 'playing') {
        return !hostedGameClient.value.hasPlayer(loggedInPlayer) && !loggedInPlayer.isGuest;
    }

    return false;
};

const downloadSGF = (): void => {
    const game = hostedGameClient.value.getGame();
    const players = hostedGameClient.value.getPlayers();

    const filename = [
        'playhex',
        game.getStartedAt().toISOString().substring(0, 10),
        pseudoString(players[0], 'slug'),
        'VS',
        pseudoString(players[1], 'slug'),
    ].join('-') + '.sgf';

    downloadString(hostedGameToSGF(hostedGameClient.value.getHostedGame()), filename);
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
type CopyResult = 'copied' | 'shared' | 'canceled' | 'unsupported';

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

        return 'shared';
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

    if ('shared' === result || 'canceled' === result) {
        copiedResult.value = null;
        return;
    }

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

/*
 * Ratings
 */

/**
 * Sort ratings to place red player first
 */
const byPlayerPosition = (a: Rating, b: Rating): number =>
    hostedGameClient.value.getPlayerIndex(a.player) -
    hostedGameClient.value.getPlayerIndex(b.player)
;

/*
 * Pass
 */
const getLocalPlayerIndex = (): number => {
    if (null === loggedInPlayer || !hostedGameClient.value) {
        return -1;
    }

    return hostedGameClient.value.getPlayerIndex(loggedInPlayer);
};

const pass = async () => {
    const passMove = Move.pass();
    hostedGameClient.value.getGame().move(passMove, getLocalPlayerIndex() as PlayerIndex);
    hostedGameClient.value.sendMove(fromEngineMove(passMove));
};

const shouldShowPass = (): boolean => {
    return -1 !== getLocalPlayerIndex();
};

const shouldEnablePass = (): boolean => {
    return 'playing' === hostedGameClient.value.getState()
        && isMyTurn(hostedGameClient.value.getHostedGame())
        && canPassAgain(hostedGameClient.value.getGame())
    ;
};
</script>

<template>
    <div class="sidebar-blocks">

        <!--
            Game info
        -->
        <div class="block-game-info">
            <div class="container-fluid">

                <!-- created -->
                <template v-if="'created' === hostedGameClient.getState()">
                    <h3>{{ $t('waiting_for_an_opponent') }}</h3>
                    <p v-if="hostedGameClient.isRanked()" class="text-warning">
                        <BIconTrophy /> {{ $t('ranked') }}
                    </p>
                    <p>
                        <small>{{ $t('2dots', { s: $t('game.rules') }) }} <AppGameRulesSummary :gameOptions="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>{{ $t('2dots', { s: $t('game.time_control') }) }} <AppTimeControlLabel :gameOptions="hostedGameClient.getGameOptions()" /></small>
                    </p>
                    <p>
                        <i18next :translation="$t('game_created_by_player_time_ago')">
                            <template #player>
                                <AppPseudo onlineStatus :player="hostedGameClient.getHostedGame().host" />
                            </template>
                            <template #timeAgo>
                                {{ formatDistanceToNow(hostedGameClient.getHostedGame().createdAt, { addSuffix: true }) }}
                            </template>
                        </i18next>
                    </p>
                </template>

                <!-- canceled -->
                <template v-if="'canceled' === hostedGameClient.getState()">
                    <h3>{{ $t('game_has_been_canceled') }}</h3>
                    <p v-if="hostedGameClient.isRanked()" class="text-warning">
                        <BIconTrophy /> {{ $t('ranked') }}
                    </p>
                    <p>
                        <small>{{ $t('2dots', { s: $t('game.rules') }) }} <AppGameRulesSummary :gameOptions="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>{{ $t('2dots', { s: $t('game.time_control') }) }} <AppTimeControlLabel :gameOptions="hostedGameClient.getGameOptions()" /></small>
                    </p>
                    <p>
                        <i18next :translation="$t('game_was_created_by_player_time_ago')">
                            <template #player>
                                <AppPseudo onlineStatus :player="hostedGameClient.getHostedGame().host" />
                            </template>
                            <template #timeAgo>
                                {{ formatDistanceToNow(hostedGameClient.getHostedGame().createdAt, { addSuffix: true }) }}
                            </template>
                        </i18next>
                    </p>
                </template>

                <!-- playing -->
                <template v-if="'playing' === hostedGameClient.getState()">
                    <h3>{{ $t('game.playing') }}</h3>
                    <p v-if="hostedGameClient.isRanked()" class="text-warning">
                        <BIconTrophy /> {{ $t('ranked') }}
                    </p>
                    <p>
                        <small>{{ $t('2dots', { s: $t('game.rules') }) }} <AppGameRulesSummary :gameOptions="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>{{ $t('2dots', { s: $t('game.time_control') }) }} <AppTimeControlLabel :gameOptions="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>{{ $t('2dots', { s: $t('game.started') }) }} {{ format(hostedGameClient.getHostedGame().gameData?.startedAt as Date, 'd MMMM yyyy p') }}</small>
                        <br>
                        <small>
                            {{ $t('2dots', { s: $t('last_move') }) }}
                            <template v-if="hostedGameClient.getHostedGame().gameData?.lastMoveAt">{{ formatRelative(hostedGameClient.getHostedGame().gameData?.lastMoveAt as Date, useServerDateStore().newDate()) }}</template>
                            <template v-else>-</template>
                        </small>
                    </p>
                </template>

                <!-- ended -->
                <template v-if="'ended' === hostedGameClient.getState()">
                    <h3>
                        <i18next :translation="$t('player_wins_by.' + (hostedGameClient.getHostedGame().gameData?.outcome ?? 'default'))">
                            <template #player>
                                <AppPseudo :player="hostedGameClient.getStrictWinnerPlayer()" :classes="playerColor(hostedGameClient.getStrictWinnerPlayer())" />
                            </template>
                        </i18next>
                    </h3>
                    <div v-if="hostedGameClient.isRanked()" class="text-warning">
                        <BIconTrophy /> {{ $t('ranked') }}
                    </div>
                    <div v-if="hostedGameClient.isRanked()" class="d-flex justify-content-center gap-4 my-2">
                        <div v-for="rating in hostedGameClient.getRatings().sort(byPlayerPosition)" :key="rating.id">
                            <AppPseudo
                                :player="rating.player"
                                :classes="[playerColor(rating.player), 'me-1']"
                                is="span"
                            />
                            <span v-if="undefined === rating.ratingChange">
                                -
                            </span>
                            <span v-else-if="rating.ratingChange > 0" class="text-success">
                                <small><BIconCaretUpFill /></small> {{ round(rating.ratingChange) }}
                            </span>
                            <span v-else class="text-danger">
                                <small><BIconCaretDownFill /></small> {{ abs(round(rating.ratingChange)) }}
                            </span>
                        </div>
                    </div>
                    <p>
                        <small>{{ $t('2dots', { s: $t('game.rules') }) }} <AppGameRulesSummary :gameOptions="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small>{{ $t('2dots', { s: $t('game.time_control') }) }} <AppTimeControlLabel :gameOptions="hostedGameClient.getGameOptions()" /></small>
                        <br>
                        <small v-if="hostedGameClient.getHostedGame().gameData?.startedAt && hostedGameClient.getHostedGame().gameData?.endedAt">

                            <!-- Game played is same day, show short form: "Played date/hour -> hour" -->
                            <template v-if="isSameDay(hostedGameClient.getHostedGame().gameData?.startedAt!, hostedGameClient.getHostedGame().gameData?.endedAt!)">
                                {{ $t('2dots', { s: $t('game.played') }) }}
                                {{ format(hostedGameClient.getHostedGame().gameData?.startedAt as Date, 'd MMMM yyyy p') }}
                                →
                                {{ format(hostedGameClient.getHostedGame().gameData?.endedAt as Date, 'p') }}
                            </template>

                            <!-- Game played on multiple days, show dates, no times, and no need to repeat year -->
                            <template v-else>
                                {{ $t('2dots', { s: $t('game.played') }) }}
                                {{ format(hostedGameClient.getHostedGame().gameData?.startedAt as Date, 'd MMMM') }}
                                →
                                {{ format(hostedGameClient.getHostedGame().gameData?.endedAt as Date, 'd MMMM yyyy') }}
                            </template>
                        </small>

                        <!-- Fallback to naive form if missing a date, should not be used -->
                        <template v-else>
                            <small>{{ $t('2dots', { s: $t('game.started') }) }} {{ format(hostedGameClient.getHostedGame().gameData?.startedAt as Date, 'd MMMM yyyy p') }}</small>
                            <br>
                            <small>{{ $t('2dots', { s: $t('game.finished') }) }} {{ format(hostedGameClient.getHostedGame().gameData?.endedAt as Date, 'd MMMM p') }}</small>
                        </template>
                    </p>
                </template>
            </div>
        </div>

        <!--
            Game buttons
        -->
        <div class="block-controls">
            <div class="container-fluid">

                <!-- Toggle coords -->
                <button
                    type="button"
                    class="btn btn-sm btn-outline-primary me-2 mb-2"
                    @click.prevent="emits('toggleCoords')"
                    :aria-label="$t('toggle_coords')"
                    :title="$t('toggle_coords')"
                ><BIconAlphabet /> {{ $t('toggle_coords_short') }}</button>

                <!-- HexWorld link -->
                <a
                    v-if="shouldDisplayHexworldLink()"
                    type="button"
                    class="btn btn-sm btn-outline-primary me-2 mb-2"
                    target="_blank"
                    :href="gameToHexworldLink(hostedGameClient.getGame(), gameView?.getComputedBoardOrientation())"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1.4em"
                        height="1.4em"
                        viewBox="0 0 26 27"
                        fill="#d8b47d"
                        stroke="#000000"
                        stroke-width="1"
                        role="img"
                        focusable="false"
                    >
                        <path d="M 3 8 L 13 2.25 L 23 8 L 23 19.5 L 13 25.25 L 3 19.5z" />
                    </svg> <span class="d-none d-lg-inline">HexWorld</span>
                </a>

                <!-- Download SGF -->
                <button
                    v-if="'ended' === hostedGameClient.getState()"
                    type="button"
                    class="btn btn-sm btn-outline-primary me-2 mb-2"
                    @click="downloadSGF();"
                ><BIconDownload /> SGF</button>

                <!-- Share -->
                <a
                    :href="href"
                    class="btn btn-sm btn-outline-primary me-2 mb-2"
                    @click.prevent="shareGameLinkAndShowResult()"
                    :aria-label="$t('share_game')"
                    :title="$t('share_game')"
                ><BIconShareFill /></a>

                <small v-if="true === copiedResult" class="text-success me-2"><BIconCheck /> {{ $t('copied!') }}</small>
                <small v-else-if="false === copiedResult" class="text-warning me-2"> {{ $t('not_copied') }}</small>

                <br>

                <!-- change board orientation -->
                <div class="btn-group btn-group-sm me-2 mb-2" role="group" aria-label="Change board orientation">
                    <input type="radio" class="btn-check" v-model="localSettings.selectedBoardOrientation" value="auto" id="btn-orientation-auto" autocomplete="off">
                    <label class="btn btn-outline-primary" for="btn-orientation-auto">{{ $t('auto') }}</label>

                    <input type="radio" class="btn-check" v-model="localSettings.selectedBoardOrientation" value="landscape" id="btn-orientation-landscape" autocomplete="off">
                    <label class="btn btn-outline-primary" for="btn-orientation-landscape">{{ $t('landscape') }}</label>

                    <input type="radio" class="btn-check" v-model="localSettings.selectedBoardOrientation" value="portrait" id="btn-orientation-portrait" autocomplete="off">
                    <label class="btn btn-outline-primary" for="btn-orientation-portrait">{{ $t('portrait') }}</label>
                </div>

                <!-- Pass -->
                <button
                    v-if="shouldShowPass()"
                    type="button"
                    class="btn btn-sm me-2 mb-2"
                    :class="shouldEnablePass() ? 'btn-warning' : 'btn-ouline-secondary disabled'"
                    :disabled="!shouldEnablePass()"
                    @click.prevent="pass()"
                >{{ $t('pass') }}</button>
            </div>
        </div>

        <!--
            Game analyze
        -->
        <div class="block-analyze" v-if="hostedGameClient.getGame().isEnded()">
            <div class="container-fluid">

                <!-- Request analyze -->
                <div v-if="null === gameAnalyze" class="text-center">
                    <button class="btn btn-sm btn-primary my-2" @click="doAnalyzeGame()">{{ $t('game_analyze.analyze_by_ai') }}</button>
                </div>

                <!-- Waiting results -->
                <p v-else-if="null === gameAnalyze.endedAt" class="text-center analyze-min-height">
                    {{ $t('game_analyze.requested') }}
                    <br>
                    <small class="text-body-secondary">{{ formatDistanceToNow(gameAnalyze.startedAt, { addSuffix: true }) }}</small>
                </p>

                <!-- Errored, try again -->
                <p v-else-if="null === gameAnalyze.analyze" class="text-center text-warning analyze-min-height">
                    {{ $t('game_analyze.errored') }}
                    <button class="btn btn-sm btn-primary my-2" @click="doAnalyzeGame()">{{ $t('try_again') }}</button>
                </p>

                <!-- Done, analyze graph -->
                <div v-else class="analyze-min-height">
                    <!-- How it works link -->
                    <small>
                        {{ $t('game_analyze.analyze_by_ai') }}
                        <router-link
                            :to="{ name: 'analysis-details' }"
                            class="text-decoration-none align-text-bottom"
                            :title="$t('game_analyze.how_it_works')"
                            :aria-label="$t('game_analyze.how_it_works')"
                        ><BIconInfoCircle /></router-link>
                    </small>
                    <!-- Anayze graph -->
                    <AppGameAnalyze
                        :analyze="gameAnalyze.analyze"
                        @selectedMove="move => showAnalyzeMove(move)"
                    />
                </div>

            </div>
        </div>

        <!--
            Game chat
        -->
        <div class="block-fill-rest">
            <div class="container-fluid">
                <small>{{ $t('chat') }}</small>
            </div>
            <div class="chat-messages" ref="chatMessagesElement">
                <div class="container-fluid">
                    <div
                        v-for="message, key in hostedGameClient.getRichChatMessages()"
                        :key
                        class="chat-message"
                        :class="(message instanceof ChatMessage) ? '' : `chat-header chat-header-${message.type}`"
                    >
                        <template v-if="(message instanceof ChatMessage)">
                            <span class="time text-body-secondary">{{ formatHour(message.createdAt) }}</span>
                            <span>&nbsp;</span>
                            <span class="player" v-if="message.player"><AppPseudo :player="message.player" :classes="playerColor(message.player)" /></span>
                            <span class="player fst-italic" v-else>{{ $t('system') }}</span>
                            <span>&nbsp;</span>
                            <!-- eslint-disable-next-line vue/no-v-html message.content is sanitized for XSS, see renderMessage() -->
                            <span class="content" v-html="renderMessage(message.content)"></span>
                        </template>

                        <template v-else-if="message.type === 'move'">
                            <span class="header-move text-center">
                                <button
                                    @click="showMove(message.moveNumber - 1)"
                                    class="btn btn-sm btn-link text-secondary text-decoration-none"
                                >
                                    {{ $t('move_number', { n: message.moveNumber }) }}
                                </button>
                            </span>
                        </template>
                        <template v-else-if="message.type === 'date'">
                            <small class="header-date text-secondary text-center mt-1">{{ formatChatDateHeader(message.date) }}</small>
                        </template>
                    </div>
                </div>
            </div>

            <form class="chat-input" v-if="true === canPlayerChatInGame(loggedInPlayer as Player, hostedGameClient.getHostedGame())">
                <div class="container-fluid mb-3">
                    <div class="input-group">
                        <input v-model="chatInput" class="form-control" aria-describedby="message-submit" :placeholder="$t('chat_message_placeholder')" maxlength="250" />
                        <button class="btn btn-success" type="submit" @click="e => { e.preventDefault(); sendChat() }" id="message-submit"><BIconSendFill /> {{ $t('send_chat_message') }}</button>
                    </div>
                    <div class="form-text text-warning" v-if="chatInput.length > 200">{{ chatInput.length }} / {{ $t('n_characters', { count: 250 }) }}</div>
                </div>
            </form>
        </div>

        <!--
            Close game sidebar
        -->
        <div class="block-close bg-dark-subtle">
            <button type="button" class="btn btn-link text-body" aria-label="Close" @click="emits('close')">{{ $t('close') }} <BIconArrowBarRight /></button>
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

.block-analyze .analyze-min-height
    min-height 9em
    margin 0

.block-controls
    > div
        margin 0 0 1em

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

.chat-messages
    .chat-header-move
        text-align center
</style>
