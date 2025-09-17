<script setup lang="ts">
/* eslint-env browser */
import { PropType, nextTick, onMounted, onUnmounted, ref, toRefs, watch, watchEffect } from 'vue';
import { IconAlphabet, IconSendFill, IconArrowBarRight, IconShareFill, IconCheck, IconDownload, IconInfoCircle, IconGear, IconTrophyFill, IconPeopleFill, IconInfoLg, IconHouse, IconLightningChargeFill, IconAlarmFill, IconCalendar, IconSignpostSplit } from '../icons.js';
import { storeToRefs } from 'pinia';
import copy from 'copy-to-clipboard';
import useAuthStore from '../../stores/authStore.js';
import usePlayerLocalSettingsStore from '../../stores/playerLocalSettingsStore.js';
import AppPseudo from './AppPseudo.vue';
import HostedGameClient from 'HostedGameClient';
import { ChatMessage, Player } from '../../../shared/app/models/index.js';
import AppGameAnalyze from './AppGameAnalyze.vue';
import AppGameRulesSummary from './AppGameRulesSummary.vue';
import AppTimeControlLabel from './AppTimeControlLabel.vue';
import Move from '../../../shared/game-engine/Move.js';
import { canPlayerChatInGame, makesCoordsInteractive } from '../../../shared/app/chatUtils.js';
import { DurationUnit, format, formatDistanceToNow, formatDuration, formatRelative, intervalToDuration, intlFormat, isSameDay, isToday, isYesterday } from 'date-fns';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils.js';
import useAnalyzeStore from '../../stores/analyzeStore.js';
import useServerDateStore from '../../stores/serverDateStore.js';
import { downloadString } from '../../services/fileDownload.js';
import { pseudoString } from '../../../shared/app/pseudoUtils.js';
import { hostedGameToSGF } from '../../../shared/app/hostedGameToSGF.js';
import GameView, { OrientationMode } from '../../../shared/pixi-board/GameView.js';
import { autoLocale } from '../../../shared/app/i18n/index.js';
import AppGameAnalyzeSummary from './AppGameAnalyzeSummary.vue';
import { guessDemerHandicapFromHostedGame } from '../../../shared/app/demerHandicap.js';
import usePlayerSettingsStore from '../../stores/playerSettingsStore.js';
import AppRhombus from './AppRhombus.vue';
import AppRatingChange from './AppRatingChange.vue';
import AppHexWorldExplore from './AppHexWorldExplore.vue';
import { canUseHexWorldOrDownloadSGF, getPlayerIndex, shouldShowConditionalMoves } from '../../../shared/app/hostedGameUtils.js';
import AppConditionalMoves from './AppConditionalMoves.vue';
import useConditionalMovesStore from '../../stores/conditionalMovesStore.js';
import ConditionalMovesEditor from '../../../shared/app/ConditionalMovesEditor.js';
import { MoveSettings } from '../../../shared/app/models/PlayerSettings.js';
import { tournamentMatchKey } from '../../../shared/app/tournamentUtils.js';
import { useChatInputStore } from '../../stores/chatInputStore.js';
import TriangleMark from '../../../shared/pixi-board/marks/TriangleMark.js';

const props = defineProps({
    hostedGameClient: {
        type: Object as PropType<HostedGameClient>,
        required: true,
    },
    gameView: {
        type: Object as PropType<GameView>,
        required: true,
    },
});

const { gameView } = props;
const { hostedGameClient } = toRefs(props);

const emits = defineEmits([
    'close',
    'toggleCoords',
]);

const { loggedInPlayer } = storeToRefs(useAuthStore());
const { localSettings } = storeToRefs(usePlayerLocalSettingsStore());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rtf = new (Intl as any).RelativeTimeFormat(autoLocale(), { numeric: 'auto' });

/**
 * @returns Localized "today", "yesterday", or "February 9"
 */
const formatChatDateHeader = (date: Date): string => {
    if (isToday(date)) {
        return rtf.format(0, 'day');
    }

    if (isYesterday(date)) {
        return rtf.format(-1, 'day');
    }

    return intlFormat(date, { day: 'numeric', month: 'long' }, { locale: autoLocale() });
};
const formatDateInfo = (date: null | Date): string => date === null ? '-' : intlFormat(date, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }, { locale: autoLocale() });
const formatHour = (date: Date): string => `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
const formatGameDuration = (hostedGameClient: HostedGameClient): string => {
    const { startedAt, endedAt } = hostedGameClient.getHostedGame();

    if (!startedAt) {
        return '-';
    }

    const duration = intervalToDuration({
        start: startedAt,
        end: endedAt ?? useServerDateStore().newDate(),
    });

    const units: DurationUnit[] = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'];
    let topUnit = units.findIndex(unit => duration[unit]);

    return formatDuration(duration, { format: units.slice(topUnit, topUnit + 2) });
};

const playerColor = (player: Player): string => {
    const index = getPlayerIndex(hostedGameClient.value.getHostedGame(), player);

    if (index === 0) {
        return 'text-danger';
    }

    if (index === 1) {
        return 'text-primary';
    }

    return '';
};

const chatInput = useChatInputStore().getChatInput(hostedGameClient.value.getId());
const chatMessagesElement = ref<HTMLElement>();
const chatInputElement = ref<HTMLElement>();

const scrollChatToBottom = () => nextTick(() => {
    if (chatMessagesElement.value) {
        chatMessagesElement.value.scrollTop = chatMessagesElement.value.scrollHeight;
    }
});

watch(hostedGameClient.value.getChatMessages(), () => scrollChatToBottom());

const sendChat = () => {
    if (chatInput.value === '') {
        return;
    }

    void hostedGameClient.value.sendChatMessage(chatInput.value);

    chatInput.value = '';
};

// Focus/Keep focus when pasting coords into chat
watch(chatInput, () => {
    if (!chatInputElement.value) {
        return;
    }

    chatInputElement.value.focus();
});

let marksTimeout: null | NodeJS.Timeout = null;

const clearMarksTimeout = () => {
    if (marksTimeout === null) {
        return;
    }

    clearTimeout(marksTimeout);
    marksTimeout = null;
};

const removeMarksLater = () => {
    clearMarksTimeout();

    marksTimeout = setTimeout(() => {
        gameView.removeMarks('coords-show');
        clearMarksTimeout();
    }, 3000);
};

const chatClick = (e: PointerEvent) => {
    const { target } = e;

    if (!(target instanceof HTMLSpanElement)) {
        return;
    }

    if (!target.classList.contains('coords')) {
        return;
    }

    const coords = target.innerText.toLowerCase();

    const mark = new TriangleMark(0x0dcaf0);
    mark.setCoords(Move.fromString(coords));

    // ctrl click to show multiple marks when click on multiple coords in chat
    if (!e.ctrlKey) {
        gameView.removeMarks('coords-show');
    }

    gameView.addMark(mark, 'coords-show');

    removeMarksLater();

    e.stopPropagation();
};

onMounted(() => scrollChatToBottom());

/**
 * Used to know whether object is a ChatMessage or a ChatHeader.
 *
 * Using instanceof won't work in cypress tests because mock ChatMessage has not same class as application ChatMessage.
 * Using class name won't work in production mode because names are minified.
 */
const isChatMessage = (object: unknown): object is ChatMessage => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return undefined === (object as any).type;
};

/*
 * SGF download
 */
const downloadSGF = (): void => {
    const game = hostedGameClient.value.getGame();
    const players = hostedGameClient.value.getPlayers();

    if (!loggedInPlayer.value) {
        return;
    }

    if (!canUseHexWorldOrDownloadSGF(hostedGameClient.value.getHostedGame(), loggedInPlayer.value)) {
        return;
    }

    let filename = 'playhex-' + game.getStartedAt().toISOString().substring(0, 10) + '-';

    filename += players.map(player => pseudoString(player, 'slug')).join('-vs-');
    filename += '.sgf';

    downloadString(hostedGameToSGF(hostedGameClient.value.getHostedGame()), filename);
};

const ctrlSListener = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        downloadSGF();
    }
};

onMounted(() => document.addEventListener('keydown', ctrlSListener));
onUnmounted(() => document.removeEventListener('keydown', ctrlSListener));

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

    if (result !== 'unsupported') {
        return result;
    }

    return copy(href) ? 'copied' : 'unsupported';
};

const shareGameLinkAndShowResult = async (): Promise<void> => {
    // In case "copied!" is already displayed, make it blink before copy again to show it worked again
    if (copiedResultTimeout !== null) {
        clearTimeout(copiedResultTimeout);
        copiedResult.value = null;
        await new Promise(resolve => setTimeout(resolve, 80));
    }

    const result = await shareGameLink();

    if (result === 'shared' || result === 'canceled') {
        copiedResult.value = null;
        return;
    }

    if (result === 'copied') {
        copiedResult.value = true;
    }

    if (result === 'unsupported') {
        copiedResult.value = false;
    }

    copiedResultTimeout = window.setTimeout(() => {
        copiedResult.value = null;

        if (copiedResultTimeout !== null) {
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

    str = makesCoordsInteractive(str);

    return str;
};

/*
 * Game analyze
 */
const analyzeStore = useAnalyzeStore();
const gameId = hostedGameClient.value.getId();
const gameAnalyze = analyzeStore.getAnalyze(gameId);
const analyzeSummarized = ref(false);

const shouldShowAnalyzeBlock = (): boolean => {
    return hostedGameClient.value.getGame().isEnded()
        && !hostedGameClient.value.getGame().isCanceled()
        && hostedGameClient.value.getGame().getMovesHistory().length >= 2
    ;
};

if (hostedGameClient.value.getGame().isEnded()) {
    analyzeStore.loadAnalyze(gameId);
}

const doAnalyzeGame = () => {
    analyzeStore.loadAnalyze(gameId, true);
};

const appGameAnalyzeComponent = ref<typeof AppGameAnalyze>();

gameView.on('movesHistoryCursorChanged', cursor => {
    appGameAnalyzeComponent.value?.selectMove(cursor);
});

/*
 * Tabs
 */
type Tab = 'main' | 'conditional_moves' | 'info' | 'settings';

const currentTab = ref<Tab>('main');

const tabActiveClass = (tab: Tab): string => currentTab.value === tab ? 'active text-body' : ' bg-body-tertiary';
const isTab = (...tabs: Tab[]): boolean => tabs.includes(currentTab.value);

/*
 * Handicap
 */
const handicap = ref<'N/S' | number>();

watchEffect(() => {
    handicap.value = guessDemerHandicapFromHostedGame(hostedGameClient.value.getHostedGame());
});

/*
 * Settings
 */
const playerSettingsStore = usePlayerSettingsStore();
const { playerSettings } = storeToRefs(playerSettingsStore);

// Auto save when any setting changed
watch(
    playerSettings,
    (settings, oldSettings) => {
        // Do nothing if no settings, or on initial settings load
        if (settings === null || oldSettings === null) {
            return;
        }

        void playerSettingsStore.updatePlayerSettings();
    },
    { deep: true },
);

const currentOrientation = ref<OrientationMode>(gameView.getComputedBoardOrientationMode());
gameView.on('orientationChanged', () => currentOrientation.value = gameView.getComputedBoardOrientationMode());

const getMoveSettingsHelpKey = (moveSettings: MoveSettings): string => {
    return [
        'premove.description',
        'confirm_move.send_immediately_description',
        'confirm_move.description',
    ][moveSettings];
};

/*
 * Conditional moves
 */
const { conditionalMovesEditor } = storeToRefs(useConditionalMovesStore());

watchEffect(() => {
    if (conditionalMovesEditor.value === null) {
        return;
    }

    if (currentTab.value === 'conditional_moves') {
        conditionalMovesEditor.value.enableSimulationMode();
    } else {
        if (!conditionalMovesEditor.value.getHasChanges()) {
            conditionalMovesEditor.value.disableSimulationMode();
        }
    }
});
</script>

<template>
    <div class="sidebar-blocks">

        <!--
            Tabs
        -->
        <nav class="nav nav-game-sidebar nav-pills nav-fill">
            <a class="nav-link" :class="tabActiveClass('main')" @click.prevent="currentTab = 'main'" href="#"><IconHouse /> <span class="d-none d-md-inline">{{ $t('game.title') }}</span></a>

            <a class="nav-link" v-if="loggedInPlayer && shouldShowConditionalMoves(hostedGameClient.getHostedGame(), loggedInPlayer)" :class="tabActiveClass('conditional_moves')" @click.prevent="currentTab = 'conditional_moves'" href="#">
                <IconSignpostSplit />
                {{ ' ' }}
                <span class="d-none d-md-inline">
                    {{ $t('conditional_moves.title_short') }}
                </span>
                <span v-if="null !== conditionalMovesEditor && conditionalMovesEditor.getConditionalMoves().tree.length > 0"> ({{ conditionalMovesEditor.getConditionalMoves().tree.length }})</span>
            </a>

            <a class="nav-link" :class="tabActiveClass('info')" @click.prevent="currentTab = 'info'" href="#"><IconInfoLg /> <span class="d-none d-md-inline">{{ $t('game.info') }}</span></a>
            <a class="nav-link" :class="tabActiveClass('settings')" @click.prevent="currentTab = 'settings'" href="#"><IconGear /></a>
        </nav>

        <!--
            Game title
        -->
        <div class="sidebar-block block-game-title" v-if="isTab('main', 'info')">
            <div class="container-fluid">
                <h3 v-if="'created' === hostedGameClient.getState()">{{ $t('waiting_for_an_opponent') }}</h3>
                <h3 v-if="'canceled' === hostedGameClient.getState()">{{ $t('game_has_been_canceled') }}</h3>
                <h3 v-if="'playing' === hostedGameClient.getState()">{{ $t('game.playing') }}</h3>
                <h3 v-if="hostedGameClient.isStateEnded()">
                    <i18next :translation="$t('player_wins_by.default')">
                        <template #player>
                            <AppPseudo :player="hostedGameClient.getStrictWinnerPlayer()" :classes="playerColor(hostedGameClient.getStrictWinnerPlayer())" />
                        </template>
                    </i18next>
                    <AppRatingChange v-if="hostedGameClient.isRanked()" :ratingChange="hostedGameClient.getRating(hostedGameClient.getStrictWinnerPlayer())?.ratingChange ?? 0" class="smaller ms-2" />
                </h3>
                <p v-if="hostedGameClient.isStateEnded()" class="mb-0">
                    <i18next :translation="$t('player_loses_reason.' + (hostedGameClient.getHostedGame().outcome ?? 'default'))">
                        <template #player>
                            <AppPseudo :player="hostedGameClient.getStrictLoserPlayer()" :classes="playerColor(hostedGameClient.getStrictLoserPlayer())" />
                        </template>
                    </i18next>
                    <AppRatingChange v-if="hostedGameClient.isRanked()" :ratingChange="hostedGameClient.getRating(hostedGameClient.getStrictLoserPlayer())?.ratingChange ?? 0" class="ms-2" />
                </p>
            </div>
        </div>

        <!--
            Game date
        -->
        <div class="sidebar-block block-game-date text-secondary" v-if="isTab('main')">
            <div class="container-fluid">

                <!-- created -->
                <template v-if="'created' === hostedGameClient.getState()">
                    <p v-if="null !== hostedGameClient.getHostedGame().host">
                        <i18next :translation="$t('game_created_by_player_time_ago')">
                            <template #player>
                                <AppPseudo onlineStatus :player="hostedGameClient.getHostedGame().host!" />
                            </template>
                            <template #timeAgo>
                                {{ formatDistanceToNow(hostedGameClient.getHostedGame().createdAt, { addSuffix: true }) }}
                            </template>
                        </i18next>
                    </p>
                    <p v-else>
                        <i18next :translation="$t('game_created_by_system_time_ago')">
                            <template #timeAgo>
                                {{ formatDistanceToNow(hostedGameClient.getHostedGame().createdAt, { addSuffix: true }) }}
                            </template>
                        </i18next>
                    </p>
                </template>

                <!-- canceled -->
                <template v-if="'canceled' === hostedGameClient.getState()">
                    <p v-if="null !== hostedGameClient.getHostedGame().host">
                        <i18next :translation="$t('game_was_created_by_player_time_ago')">
                            <template #player>
                                <AppPseudo onlineStatus :player="hostedGameClient.getHostedGame().host!" />
                            </template>
                            <template #timeAgo>
                                {{ formatDistanceToNow(hostedGameClient.getHostedGame().createdAt, { addSuffix: true }) }}
                            </template>
                        </i18next>
                    </p>
                    <p v-else>
                        <i18next :translation="$t('game_created_by_system_time_ago')">
                            <template #timeAgo>
                                {{ formatDistanceToNow(hostedGameClient.getHostedGame().createdAt, { addSuffix: true }) }}
                            </template>
                        </i18next>
                    </p>
                </template>

                <!-- playing -->
                <template v-if="'playing' === hostedGameClient.getState()">
                    <p>
                        <small>{{ $t('2dots', { s: $t('game.started') }) }} {{ format(hostedGameClient.getHostedGame().startedAt!, 'd MMMM yyyy p') }}</small>
                        <br>
                        <small>
                            {{ $t('2dots', { s: $t('last_move') }) }}
                            <template v-if="hostedGameClient.getHostedGame().lastMoveAt">{{ formatRelative(hostedGameClient.getHostedGame().lastMoveAt!, useServerDateStore().newDate()) }}</template>
                            <template v-else>-</template>
                        </small>
                    </p>
                </template>

                <!-- ended -->
                <template v-if="hostedGameClient.isStateEnded()">
                    <p>
                        <small v-if="hostedGameClient.getHostedGame().startedAt && hostedGameClient.getHostedGame().endedAt">

                            <!-- Game played is same day, show short form: "Played date/hour -> hour" -->
                            <template v-if="isSameDay(hostedGameClient.getHostedGame().startedAt!, hostedGameClient.getHostedGame().endedAt!)">
                                {{ format(hostedGameClient.getHostedGame().startedAt!, 'd MMMM yyyy p') }}
                                →
                                {{ format(hostedGameClient.getHostedGame().endedAt!, 'p') }}
                            </template>

                            <!-- Game played on multiple days, show dates, no times, and no need to repeat year -->
                            <template v-else>
                                {{ format(hostedGameClient.getHostedGame().startedAt!, 'd MMMM') }}
                                →
                                {{ format(hostedGameClient.getHostedGame().endedAt!, 'd MMMM yyyy') }}
                            </template>
                        </small>

                        <!-- Fallback to naive form if missing a date, should not be used -->
                        <template v-else>
                            <small>{{ $t('2dots', { s: $t('game.started') }) }} {{ format(hostedGameClient.getHostedGame().startedAt!, 'd MMMM yyyy p') }}</small>
                            <br>
                            <small>{{ $t('2dots', { s: $t('game.finished') }) }} {{ format(hostedGameClient.getHostedGame().endedAt!, 'd MMMM p') }}</small>
                        </template>
                    </p>
                </template>
            </div>
        </div>

        <!--
            Share game, download SGF
        -->
        <div class="sidebar-block block-game-snippets pt-2" v-if="isTab('info')">
            <div class="container-fluid">

                <!-- HexWorld link -->
                <AppHexWorldExplore :hostedGameClient :gameView class="btn btn-sm btn-outline-primary me-2 mb-2" />

                <!-- Download SGF -->
                <button
                    v-if="loggedInPlayer && canUseHexWorldOrDownloadSGF(hostedGameClient.getHostedGame(), loggedInPlayer)"
                    type="button"
                    class="btn btn-sm btn-outline-primary me-2 mb-2"
                    @click="downloadSGF();"
                ><IconDownload /> SGF</button>

                <!-- Share -->
                <a
                    :href="href"
                    class="btn btn-sm btn-outline-primary me-2 mb-2"
                    @click.prevent="shareGameLinkAndShowResult()"
                    :aria-label="$t('share_game')"
                    :title="$t('share_game')"
                ><IconShareFill /></a>
                <small v-if="true === copiedResult" class="text-success me-2"><IconCheck /> {{ $t('copied!') }}</small>
                <small v-else-if="false === copiedResult" class="text-warning me-2"> {{ $t('not_copied') }}</small>
            </div>
        </div>

        <!--
            Game ranked/friendly, and custom options
            Link to tournament if this game is from a tournament
        -->
        <div class="sidebar-block block-game-options" v-if="isTab('main', 'info')">
            <router-link
                v-for="tournamentMatch in hostedGameClient.getHostedGame().tournamentMatch ? [hostedGameClient.getHostedGame().tournamentMatch!] : []"
                :to="{ name: 'tournament', params: { slug: tournamentMatch.tournament.slug }, hash: '#match-' + tournamentMatchKey(tournamentMatch) }"
                class="btn btn-warning btn-block btn-tournament"
            >
                <IconTrophyFill class="icon" />
                {{ tournamentMatch.tournament.title }}
                <small>
                    -
                    {{ $t(`match_title.${tournamentMatch.label ?? 'default'}`, {
                        round: tournamentMatch.round,
                        number: tournamentMatch.number,
                    }) }}
                </small>
            </router-link>

            <div class="container-fluid">
                <p v-if="hostedGameClient.isRanked()" class="text-warning">
                    <IconTrophyFill /> {{ $t('ranked') }}
                </p>
                <p v-else>
                    <span class="text-success"><IconPeopleFill /> {{ $t('friendly') }}</span>
                    <small class="ms-2"><AppGameRulesSummary :showIcon="false" :gameOptions="hostedGameClient.getHostedGame()" /></small>
                </p>
            </div>
        </div>

        <!--
            Game info
        -->
        <div class="sidebar-block block-game-info overflow-y-auto pt-2" v-if="isTab('info')">
            <div class="container-fluid">
                <dl class="row">
                    <dt class="col-md-5">{{ $t('game.host') }}</dt>
                    <dd class="col-md-7">
                        <AppPseudo v-if="hostedGameClient.getHostedGame().host" :player="hostedGameClient.getHostedGame().host!" :classes="playerColor(hostedGameClient.getHostedGame().host!)" />
                        <i v-else>System</i>
                    </dd>

                    <dt class="col-md-5">{{ $t('game.time_control') }}</dt>
                    <dd class="col-md-7"><AppTimeControlLabel :timeControlBoardsize="hostedGameClient.getHostedGame()" /></dd>

                    <dt class="col-md-5">{{ $t('game.board_size') }}</dt>
                    <dd class="col-md-7">{{ hostedGameClient.getHostedGame().boardsize }}</dd>

                    <dt class="col-md-5">{{ $t('game.created') }}</dt>
                    <dd class="col-md-7">{{ formatDateInfo(hostedGameClient.getHostedGame().createdAt) }}</dd>

                    <dt class="col-md-5">{{ $t('game.started') }}</dt>
                    <dd class="col-md-7">{{ formatDateInfo(hostedGameClient.getHostedGame().startedAt ?? null) }}</dd>

                    <dt class="col-md-5">{{ $t('last_move') }}</dt>
                    <dd class="col-md-7">{{ formatDateInfo(hostedGameClient.getHostedGame().lastMoveAt ?? null) }}</dd>

                    <dt class="col-md-5">{{ $t('game.finished') }}</dt>
                    <dd class="col-md-7">{{ formatDateInfo(hostedGameClient.getHostedGame().endedAt ?? null) }}</dd>

                    <dt class="col-md-5">{{ $t('game.duration') }}</dt>
                    <dd class="col-md-7">{{ formatGameDuration(hostedGameClient) }}</dd>

                    <dt class="col-md-5">{{ $t('moves') }}</dt>
                    <dd class="col-md-7">{{ hostedGameClient.getHostedGame().movesHistory.length ?? 0 }}</dd>

                    <dt class="col-md-5">{{ $t('handicap.title') }}</dt>
                    <dd class="col-md-7" v-if="(0 === handicap)">{{ $t('handicap.none') }}</dd>
                    <dd class="col-md-7" v-else-if="('number' === typeof handicap)">{{ $t('handicap.handicap_for_player', { n: Math.abs(handicap), player: handicap > 0 ? $t('game.red') : $t('game.blue') }) }}</dd>
                    <dd class="col-md-7" v-else-if="handicap === 'N/S'">{{ $t('handicap.none') }} ({{ $t('game_rules.no_swap') }})</dd>
                    <dd class="col-md-7" v-else>-</dd>
                </dl>
            </div>
        </div>

        <!--
            Settings
        -->
        <div class="sidebar-block block-settings overflow-y-auto" v-if="isTab('settings')">
            <div class="container-fluid">

                <div class="mb-2" v-if="playerSettings">
                    <template v-if="'blitz' === timeControlToCadencyName(hostedGameClient.getHostedGame())">
                        <label for="move-settings-radio" class="col-form-label">{{ $t('move_settings.title') }} <small>(<IconLightningChargeFill /> {{ $t('time_cadency.blitz') }})</small></label>
                        <div class="btn-group" id="move-settings-radio" role="group" aria-describedby="move-settings-help">
                            <input v-model="playerSettings.moveSettingsBlitz" :value="MoveSettings.PREMOVE" type="radio" class="btn-check" id="move-settings-1" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-1">{{ $t('premove.title') }}</label>

                            <input v-model="playerSettings.moveSettingsBlitz" :value="MoveSettings.SEND_IMMEDIATELY" type="radio" class="btn-check" id="move-settings-2" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-2">{{ $t('confirm_move.send_immediately') }}</label>

                            <input v-model="playerSettings.moveSettingsBlitz" :value="MoveSettings.MUST_CONFIRM" type="radio" class="btn-check" id="move-settings-3" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-3">{{ $t('confirm_move.ask_confirmation') }}</label>
                        </div>
                        <div class="form-text" id="move-settings-help">{{ $t(getMoveSettingsHelpKey(playerSettings.moveSettingsBlitz)) }}</div>
                    </template>
                    <template v-if="'normal' === timeControlToCadencyName(hostedGameClient.getHostedGame())">
                        <label for="move-settings-radio" class="col-form-label">{{ $t('move_settings.title') }} <small>(<IconAlarmFill /> {{ $t('time_cadency.normal') }})</small></label>
                        <div class="btn-group" id="move-settings-radio" role="group" aria-describedby="move-settings-help">
                            <input v-model="playerSettings.moveSettingsNormal" :value="MoveSettings.PREMOVE" type="radio" class="btn-check" id="move-settings-1" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-1">{{ $t('premove.title') }}</label>

                            <input v-model="playerSettings.moveSettingsNormal" :value="MoveSettings.SEND_IMMEDIATELY" type="radio" class="btn-check" id="move-settings-2" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-2">{{ $t('confirm_move.send_immediately') }}</label>

                            <input v-model="playerSettings.moveSettingsNormal" :value="MoveSettings.MUST_CONFIRM" type="radio" class="btn-check" id="move-settings-3" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-3">{{ $t('confirm_move.ask_confirmation') }}</label>
                        </div>
                        <div class="form-text" id="move-settings-help">{{ $t(getMoveSettingsHelpKey(playerSettings.moveSettingsNormal)) }}</div>
                    </template>
                    <template v-if="'correspondence' === timeControlToCadencyName(hostedGameClient.getHostedGame())">
                        <label for="move-settings-radio" class="col-form-label">{{ $t('move_settings.title') }} <small>(<IconCalendar /> {{ $t('time_cadency.correspondence') }})</small></label>
                        <div class="btn-group" id="move-settings-radio" role="group" aria-describedby="move-settings-help">
                            <input v-model="playerSettings.moveSettingsCorrespondence" :value="MoveSettings.PREMOVE" type="radio" class="btn-check" id="move-settings-1" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-1">{{ $t('premove.title') }}</label>

                            <input v-model="playerSettings.moveSettingsCorrespondence" :value="MoveSettings.SEND_IMMEDIATELY" type="radio" class="btn-check" id="move-settings-2" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-2">{{ $t('confirm_move.send_immediately') }}</label>

                            <input v-model="playerSettings.moveSettingsCorrespondence" :value="MoveSettings.MUST_CONFIRM" type="radio" class="btn-check" id="move-settings-3" autocomplete="off">
                            <label class="btn btn-outline-primary" for="move-settings-3">{{ $t('confirm_move.ask_confirmation') }}</label>
                        </div>
                        <div class="form-text" id="move-settings-help">{{ $t(getMoveSettingsHelpKey(playerSettings.moveSettingsCorrespondence)) }}</div>
                    </template>
                </div>

                <h4>{{ $t('game.board') }}</h4>

                <!-- Toggle coords -->
                <button
                    type="button"
                    class="btn btn-outline-primary me-2 mb-2"
                    @click.prevent="emits('toggleCoords')"
                    :aria-label="$t('toggle_coords')"
                    :title="$t('toggle_coords')"
                ><IconAlphabet /> {{ $t('toggle_coords_short') }}</button>

                <div class="row mt-2" v-if="playerSettings">
                    <div class="col-12" v-if="'landscape' === currentOrientation">
                        <div class="btn-group" role="group">
                            <template v-for="orientation in [0, 10, 11]" :key="orientation">
                                <input type="radio" class="btn-check" v-model="playerSettings.orientationLandscape" :value="orientation" :id="'landscape-radio-' + orientation" autocomplete="off">
                                <label class="btn" :for="'landscape-radio-' + orientation">
                                    <AppRhombus :orientation="orientation" />
                                </label>
                            </template>
                        </div>
                    </div>
                    <div class="col-12" v-if="'portrait' === currentOrientation">
                        <div class="btn-group" role="group">
                            <template v-for="orientation in [1, 9, 2]" :key="orientation">
                                <input type="radio" class="btn-check" v-model="playerSettings.orientationPortrait" :value="orientation" :id="'landscape-radio-' + orientation" autocomplete="off">
                                <label class="btn" :for="'landscape-radio-' + orientation">
                                    <AppRhombus :orientation="orientation" />
                                </label>
                            </template>
                        </div>
                    </div>
                </div>

                <!-- force board orientation -->
                <div class="form-text mt-4">{{ $t('force_board_orientation_mode') }}</div>
                <div class="btn-group btn-group-sm" role="group" aria-label="Change board orientation">
                    <input type="radio" class="btn-check" v-model="localSettings.selectedBoardOrientation" value="auto" id="btn-orientation-auto" autocomplete="off">
                    <label class="btn btn-outline-primary" for="btn-orientation-auto">{{ $t('auto') }}</label>

                    <input type="radio" class="btn-check" v-model="localSettings.selectedBoardOrientation" value="landscape" id="btn-orientation-landscape" autocomplete="off">
                    <label class="btn btn-outline-primary" for="btn-orientation-landscape">{{ $t('landscape') }}</label>

                    <input type="radio" class="btn-check" v-model="localSettings.selectedBoardOrientation" value="portrait" id="btn-orientation-portrait" autocomplete="off">
                    <label class="btn btn-outline-primary" for="btn-orientation-portrait">{{ $t('portrait') }}</label>
                </div>

                <p class="mt-4">
                    <router-link class="btn btn-outline-primary" :to="{ name: 'settings' }"><IconGear /> {{ $t('player_settings.title') }}</router-link>
                </p>
            </div>
        </div>

        <!--
            Game analyze
        -->
        <div class="sidebar-block block-analyze" v-if="isTab('main') && shouldShowAnalyzeBlock()">
            <div class="container-fluid">

                <!-- Request analyze -->
                <div v-if="null === gameAnalyze" class="text-center">
                    <button class="btn btn-sm btn-primary my-2" @click="doAnalyzeGame()">{{ $t('game_analysis.request_analysis') }}</button>
                </div>

                <!-- Waiting results -->
                <p v-else-if="null === gameAnalyze.endedAt" class="text-center analyze-min-height">
                    {{ $t('game_analysis.requested') }}
                    <br>
                    <small class="text-body-secondary">{{ formatDistanceToNow(gameAnalyze.startedAt, { addSuffix: true }) }}</small>
                </p>

                <!-- Errored, try again -->
                <p v-else-if="null === gameAnalyze.analyze" class="text-center text-warning analyze-min-height">
                    {{ $t('game_analysis.errored') }}
                    <button class="btn btn-sm btn-primary my-2" @click="doAnalyzeGame()">{{ $t('try_again') }}</button>
                </p>

                <!-- Done, analyze graph -->
                <template v-else>
                    <div v-if="!analyzeSummarized" class="analyze-min-height">
                        <!-- How it works link -->
                        <small>
                            {{ $t('game_analysis.game_analysis') }}
                            <router-link
                                :to="{ name: 'analysis-details' }"
                                class="text-decoration-none"
                                :title="$t('game_analysis.how_it_works')"
                                :aria-label="$t('game_analysis.how_it_works')"
                            ><IconInfoCircle /></router-link>
                            <a href="#" class="ps-2" @click.prevent="analyzeSummarized = true">Collapse</a>
                        </small>

                        <!-- Anayze graph -->
                        <AppGameAnalyze :analyze="gameAnalyze.analyze" :gameView />
                    </div>

                    <div v-else>
                        <!-- Anayze graph, collapsed -->
                        <AppGameAnalyzeSummary :analyze="gameAnalyze.analyze" @click="analyzeSummarized = false" class="pointer-clickable" />
                    </div>
                </template>

            </div>
        </div>

        <!--
            Conditional moves
        -->
        <div class="sidebar-block overflow-y-auto block-conditional-moves" v-if="isTab('conditional_moves')">
            <div class="container-fluid">
                <h3>{{ $t('conditional_moves.title') }}</h3>

                <AppConditionalMoves
                    v-if="null !== conditionalMovesEditor"
                    :conditionalMovesEditor="(conditionalMovesEditor as ConditionalMovesEditor)"
                />

                <p v-else>{{ $t('loading') }}</p>
            </div>
        </div>


        <!--
            Game chat
        -->
        <div class="sidebar-block block-fill-rest">
            <template v-if="isTab('main')">
                <div class="chat-messages" ref="chatMessagesElement" @click="chatClick">
                    <div class="container-fluid">
                        <div
                            v-for="message, key in hostedGameClient.getRichChatMessages()"
                            :key
                            class="chat-message"
                            :class="isChatMessage(message) ? '' : `chat-header chat-header-${message.type}`"
                        >
                            <template v-if="isChatMessage(message)">
                                <small class="time text-secondary">{{ formatHour(message.createdAt) }}</small>
                                <span>&nbsp;</span>
                                <span class="player" v-if="message.player"><AppPseudo :player="message.player" :classes="playerColor(message.player)" /></span>
                                <span v-if="message.player">&nbsp;</span>

                                <span class="content text-body-secondary fst-italic text-center" v-if="message.contentTranslationKey">{{ $t(message.contentTranslationKey, message.translationParameters ?? {}) }}</span>
                                <!-- eslint-disable-next-line vue/no-v-html message.content is sanitized for XSS, see renderMessage() -->
                                <span class="content" v-else v-html="renderMessage(message.content)"></span>
                            </template>

                            <template v-else-if="message.type === 'move'">
                                <span class="line"></span>
                                <button class="btn btn-link btn-sm header-move text-secondary p-0" @click="gameView?.setMovesHistoryCursor(message.moveNumber - 1)">{{ $t('move_number', { n: message.moveNumber }) }}</button>
                                <span class="line"></span>
                            </template>
                            <template v-else-if="message.type === 'date'">
                                <small class="header-date text-secondary mt-1">{{ formatChatDateHeader(message.date) }}</small>
                            </template>
                        </div>
                        <p v-if="0 === hostedGameClient.getRichChatMessages().length" class="text-secondary">{{ $t('chat') }}</p>
                    </div>
                </div>

                <form class="chat-input" v-if="loggedInPlayer && canPlayerChatInGame(loggedInPlayer, hostedGameClient.getHostedGame()) === true">
                    <div class="input-group">
                        <input v-model="chatInput" ref="chatInputElement" class="form-control bg-body-tertiary" aria-describedby="message-submit" :placeholder="$t('chat_message_placeholder')" maxlength="1000" />
                        <button class="btn btn-success" type="submit" @click="(e: PointerEvent) => { e.preventDefault(); sendChat() }" id="message-submit"><IconSendFill /> <span class="d-none d-md-inline">{{ $t('send_chat_message') }}</span></button>
                    </div>
                    <div class="form-text text-warning" v-if="chatInput.length > 980">{{ chatInput.length }} / {{ $t('n_characters', { count: 1000 }) }}</div>
                </form>
            </template>
        </div>

        <!--
            Close game sidebar
        -->
        <div class="sidebar-block block-close bg-dark-subtle">
            <button type="button" class="btn btn-link text-body" aria-label="Close" @click="emits('close')">{{ $t('close') }} <IconArrowBarRight /></button>
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
        font-size 0.9em
        overflow-y auto
        min-height 0

        .time
            font-family monospace
            margin-right 0.5em

        .player
            margin-right 0.5em

        .content
            overflow-wrap break-word
            hyphens auto

        .chat-message:last-child
            margin-bottom 1.5em

    .chat-input
        flex 0 1 auto
        margin-top auto

        input, button
            border-radius 0
            border-width 0

.nav-game-sidebar
    .nav-link
        border-radius 0

        &.active
            background-color transparent

.sidebar-block
    h3
        margin-top 0.75rem

.block-game-title
    h3
        margin-bottom 0

    .smaller
        font-size 0.75em

.block-game-date
    p
        margin 0

.block-game-options
    p
        margin 0.25em 0

.block-analyze .analyze-min-height
    min-height 9em
    margin 0

.block-settings
    margin-top 1em

    h4
        margin-top 1em

.block-close
    position relative
    z-index 3 // Fix "Send" button over Close button, because of bootstrap z-index 2
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
        display flex
        gap 1em

        .line
            border 0 solid unquote('rgba(var(--bs-secondary-rgb), 0.25)')
            border-top-width 1px
            flex-grow 1
            display block
            height 1px
            align-self center

.pointer-clickable
    cursor pointer

@media (max-height: 600px)
    .block-game-date
        display none

.btn-tournament
    width 100%
    border-radius 0
    background-color #ffc10780
    border none
    margin 0.5em 0
    position relative
    overflow hidden
    text-align left

    .icon
        opacity 0.15
        font-size 2.5em
        position absolute
        left 0.25em
        top 0
</style>

<!-- Unscoped because .coords class is added by javascript -->
<style lang="stylus">
.chat-messages
    .chat-message
        .coords
            font-weight bold
            color var(--bs-info)
            cursor pointer
</style>
