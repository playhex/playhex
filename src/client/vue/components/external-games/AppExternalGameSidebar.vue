<script setup lang="ts">
import { PropType, computed, ref, toRefs, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { format, formatDistanceToNow, intlFormat, isSameDay } from 'date-fns';
import { GameView } from '@playhex/pixi-board';
import { IconAlphabet, IconArrowBarRight, IconBoxArrowUpRight, IconDownload, IconGear, IconHouse, IconInfoCircle, IconInfoLg, Icon123 } from '../../icons.js';
import { ExternalGame, Game } from '../../../../shared/app/models/index.js';
import { externalGameToSGF } from '../../../../shared/app/externalGameUtils.js';
import { autoLocale } from '../../../../shared/app/i18n/index.js';
import { downloadString } from '../../../services/fileDownload.js';
import useAnalyzeStore from '../../../stores/analyzeStore.js';
import useCurrentGameStore from '../../../stores/currentGameStore.js';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';
import usePlayerSettingsStore from '../../../stores/playerSettingsStore.js';
import { useGameViewOrientation } from '../../composables/useGameViewOrientation.js';
import AppGameAnalyze from '../AppGameAnalyze.vue';
import AppGameAnalyzeSummary from '../AppGameAnalyzeSummary.vue';
import AppHexWorldExplore from '../AppHexWorldExplore.vue';
import AppPseudo from '../AppPseudo.vue';
import AppRhombus from '../AppRhombus.vue';
import AppHexplorerLink from '../../hexplorer/components/AppHexplorerLink.vue';

const props = defineProps({
    externalGame: {
        type: Object as PropType<ExternalGame>,
        required: true,
    },
    game: {
        type: Object as PropType<Game>,
        required: true,
    },
    gameView: {
        type: GameView,
        required: true,
    },
});

const { externalGame, game, gameView } = toRefs(props);

const emits = defineEmits([
    'close',
]);

const { engineGame, playingGameFacade, playerSettingsFacade } = storeToRefs(useCurrentGameStore());
const { localSettings } = storeToRefs(usePlayerLocalSettingsStore());

const orientation = useGameViewOrientation(gameView);

const formatDateInfo = (date: null | Date): string => date === null
    ? '-'
    : intlFormat(date, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }, { locale: autoLocale() })
;

const winnerName = computed<null | string>(() => {
    if (externalGame.value.winner === null) {
        return null;
    }

    return externalGame.value.winner === 0
        ? externalGame.value.player0Name
        : externalGame.value.player1Name
    ;
});

const loserName = computed<null | string>(() => {
    if (externalGame.value.winner === null) {
        return null;
    }

    return externalGame.value.winner === 0
        ? externalGame.value.player1Name
        : externalGame.value.player0Name
    ;
});

const colorClass = (position: null | 0 | 1): string => position === 0 ? 'text-danger' : 'text-primary';

/*
 * SGF download
 */
const downloadSGF = (): void => {
    const { externalId, player0Name, player1Name } = externalGame.value;
    const filename = `${externalId.replace(/[^\w-]/g, '-')}-${player0Name}-vs-${player1Name}.sgf`.replace(/\s+/g, '_');

    downloadString(externalGameToSGF(externalGame.value), filename, 'application/x-go-sgf');
};

/*
 * Analyze
 */
const analyzeStore = useAnalyzeStore();
const gameId = externalGame.value.publicId;

analyzeStore.registerExternalGame(gameId);

const gameAnalyze = analyzeStore.getAnalyze(gameId);
const analyzeSummarized = ref(false);
const analyzedMovesCount = computed((): number => gameAnalyze.value?.analyze?.filter(move => move !== null).length ?? 0);
const shouldShowAnalyzeBlock = computed(() => externalGame.value.moves.length >= 2);

if (shouldShowAnalyzeBlock.value) {
    analyzeStore.loadAnalyze(gameId);
}

const doAnalyzeGame = () => {
    analyzeStore.loadAnalyze(gameId, true);
};

/*
 * Tabs
 */
type Tab = 'main' | 'info' | 'settings';

const currentTab = ref<Tab>('main');

const tabActiveClass = (tab: Tab): string => currentTab.value === tab ? 'active text-body' : ' bg-body-tertiary';
const isTab = (...tabs: Tab[]): boolean => tabs.includes(currentTab.value);

/*
 * Settings
 */
const playerSettingsStore = usePlayerSettingsStore();
const { playerSettings } = storeToRefs(playerSettingsStore);

// Auto save when any setting changed
watch(
    playerSettings,
    (settings, oldSettings) => {
        if (settings === null || oldSettings === null) {
            return;
        }

        void playerSettingsStore.updatePlayerSettings();
    },
    { deep: true },
);
</script>

<template>
    <div class="sidebar-blocks">

        <!--
            Tabs
        -->
        <nav class="nav nav-game-sidebar nav-pills nav-fill">
            <a class="nav-link" :class="tabActiveClass('main')" @click.prevent="currentTab = 'main'" href="#"><IconHouse /> <span class="d-none d-md-inline">{{ $t('game.title') }}</span></a>
            <a class="nav-link" :class="tabActiveClass('info')" @click.prevent="currentTab = 'info'" href="#"><IconInfoLg /> <span class="d-none d-md-inline">{{ $t('game.info') }}</span></a>
            <a class="nav-link" :class="tabActiveClass('settings')" @click.prevent="currentTab = 'settings'" href="#"><IconGear /></a>
        </nav>

        <!--
            Game title
        -->
        <div class="sidebar-block block-game-title" v-if="isTab('main', 'info')">
            <div class="container-fluid">
                <h3 v-if="null !== winnerName">
                    <i18next :translation="$t('player_wins_by.default')">
                        <template #player>
                            <span :class="colorClass(externalGame.winner)">{{ winnerName }}</span>
                        </template>
                    </i18next>
                </h3>
                <h3 v-else>
                    <span class="text-danger">{{ externalGame.player0Name }}</span>
                    -
                    <span class="text-primary">{{ externalGame.player1Name }}</span>
                </h3>
                <p v-if="null !== loserName" class="mb-0">
                    <i18next :translation="$t('player_loses_reason.' + (externalGame.outcome ?? 'default'))">
                        <template #player>
                            <span :class="colorClass(externalGame.winner === 0 ? 1 : 0)">{{ loserName }}</span>
                        </template>
                    </i18next>
                </p>
            </div>
        </div>

        <!--
            Source and date
        -->
        <div class="sidebar-block block-game-date text-secondary" v-if="isTab('main')">
            <div class="container-fluid">
                <p>
                    <small>
                        <i18next :translation="$t('external_games.played_on')">
                            <template #source>
                                <a v-if="externalGame.sourceUrl" :href="externalGame.sourceUrl" target="_blank" rel="noopener">{{ externalGame.source ?? externalGame.sourceUrl }} <IconBoxArrowUpRight /></a>
                                <template v-else>{{ externalGame.source ?? '?' }}</template>
                            </template>
                        </i18next>
                    </small>
                    <br>
                    <small v-if="externalGame.startedAt && externalGame.endedAt">
                        <template v-if="isSameDay(externalGame.startedAt, externalGame.endedAt)">
                            {{ format(externalGame.startedAt, 'd MMMM yyyy p') }}
                            →
                            {{ format(externalGame.endedAt, 'p') }}
                        </template>
                        <template v-else>
                            {{ format(externalGame.startedAt, 'd MMMM yyyy') }}
                            →
                            {{ format(externalGame.endedAt, 'd MMMM yyyy') }}
                        </template>
                    </small>
                    <small v-else-if="externalGame.endedAt">{{ format(externalGame.endedAt, 'd MMMM yyyy') }}</small>
                </p>
            </div>
        </div>

        <!--
            Explore, download SGF
        -->
        <div class="sidebar-block block-game-snippets pt-2" v-if="isTab('info')">
            <div class="container-fluid">
                <AppHexWorldExplore
                    v-if="engineGame"
                    :game
                    :engineGame
                    :orientation
                    class="btn btn-sm btn-outline-primary me-2 mb-2"
                />

                <AppHexplorerLink
                    v-if="engineGame"
                    :game
                    :orientation
                    class="btn btn-sm btn-outline-primary me-2 mb-2"
                />

                <button
                    v-if="playingGameFacade"
                    @click="playingGameFacade.toggleMoveNumbers()"
                    type="button"
                    class="btn btn-sm btn-outline-primary me-2 mb-2"
                ><Icon123 /> {{ $t('moves') }}</button>

                <button
                    type="button"
                    class="btn btn-sm btn-outline-primary me-2 mb-2"
                    @click="downloadSGF()"
                ><IconDownload /> SGF</button>
            </div>
        </div>

        <!--
            Game info
        -->
        <div class="sidebar-block block-game-info overflow-y-auto pt-2" v-if="isTab('info')">
            <div class="container-fluid">
                <dl class="row">
                    <dt class="col-md-5">{{ $t('external_games.source') }}</dt>
                    <dd class="col-md-7">
                        <a v-if="externalGame.sourceUrl" :href="externalGame.sourceUrl" target="_blank" rel="noopener">{{ externalGame.source ?? externalGame.sourceUrl }} <IconBoxArrowUpRight /></a>
                        <template v-else>{{ externalGame.source ?? '-' }}</template>
                    </dd>

                    <template v-if="null !== externalGame.player0Rating || null !== externalGame.player1Rating">
                        <dt class="col-md-5">{{ $t('external_games.ratings') }}</dt>
                        <dd class="col-md-7">
                            <span class="text-danger">{{ externalGame.player0Name }}</span> {{ externalGame.player0Rating ?? '-' }}
                            <br>
                            <span class="text-primary">{{ externalGame.player1Name }}</span> {{ externalGame.player1Rating ?? '-' }}
                        </dd>
                    </template>

                    <template v-if="externalGame.event">
                        <dt class="col-md-5">{{ $t('external_games.event') }}</dt>
                        <dd class="col-md-7">{{ externalGame.event }}</dd>
                    </template>

                    <dt class="col-md-5">{{ $t('external_games.external_id') }}</dt>
                    <dd class="col-md-7"><code>{{ externalGame.externalId }}</code></dd>

                    <dt class="col-md-5">{{ $t('game.board_size') }}</dt>
                    <dd class="col-md-7">{{ externalGame.boardsize }}</dd>

                    <dt class="col-md-5">{{ $t('game.started') }}</dt>
                    <dd class="col-md-7">{{ formatDateInfo(externalGame.startedAt) }}</dd>

                    <dt class="col-md-5">{{ $t('game.finished') }}</dt>
                    <dd class="col-md-7">{{ formatDateInfo(externalGame.endedAt) }}</dd>

                    <dt class="col-md-5">{{ $t('moves') }}</dt>
                    <dd class="col-md-7">{{ externalGame.moves.length }}</dd>

                    <dt class="col-md-5">{{ $t('external_games.imported_by') }}</dt>
                    <dd class="col-md-7">
                        <AppPseudo v-if="externalGame.createdBy" :player="externalGame.createdBy" />
                        <template v-else>-</template>
                    </dd>

                    <dt class="col-md-5">{{ $t('external_games.imported') }}</dt>
                    <dd class="col-md-7">{{ formatDateInfo(externalGame.createdAt) }}</dd>

                    <dt class="col-md-5">{{ $t('external_games.updated') }}</dt>
                    <dd class="col-md-7">{{ formatDateInfo(externalGame.updatedAt) }}</dd>
                </dl>
            </div>
        </div>

        <!--
            Settings
        -->
        <div class="sidebar-block block-settings overflow-y-auto" v-if="isTab('settings')">
            <div class="container-fluid">
                <h4>{{ $t('game.board') }}</h4>

                <button
                    type="button"
                    class="btn btn-outline-primary me-2 mb-2"
                    @click.prevent="gameView.toggleDisplayCoords()"
                    :aria-label="$t('toggle_coords')"
                    :title="$t('toggle_coords')"
                ><IconAlphabet /> {{ $t('toggle_coords_short') }}</button>

                <div class="row mt-2" v-if="playerSettingsFacade && playerSettings">
                    <div class="col-12" v-if="playerSettingsFacade.getCurrentOrientationMode() === 'landscape'">
                        <div class="btn-group" role="group">
                            <template v-for="orientation in [0, 11, 10]" :key="orientation">
                                <input type="radio" class="btn-check" v-model="playerSettings.orientationLandscape" :value="orientation" :id="'landscape-radio-' + orientation" autocomplete="off">
                                <label class="btn" :for="'landscape-radio-' + orientation">
                                    <AppRhombus :orientation />
                                </label>
                            </template>
                        </div>
                    </div>
                    <div class="col-12" v-if="playerSettingsFacade.getCurrentOrientationMode() === 'portrait'">
                        <div class="btn-group" role="group">
                            <template v-for="orientation in [1, 9, 2]" :key="orientation">
                                <input type="radio" class="btn-check" v-model="playerSettings.orientationPortrait" :value="orientation" :id="'landscape-radio-' + orientation" autocomplete="off">
                                <label class="btn" :for="'landscape-radio-' + orientation">
                                    <AppRhombus :orientation />
                                </label>
                            </template>
                        </div>
                    </div>
                </div>

                <div class="form-text mt-4">{{ $t('force_board_orientation_mode') }}</div>
                <div class="btn-group btn-group-sm" role="group" aria-label="Change board orientation">
                    <input type="radio" class="btn-check" v-model="localSettings.forcedBoardOrientation" :value="null" id="btn-orientation-auto" autocomplete="off">
                    <label class="btn btn-outline-primary" for="btn-orientation-auto">{{ $t('auto') }}</label>
                    <input type="radio" class="btn-check" v-model="localSettings.forcedBoardOrientation" value="landscape" id="btn-orientation-landscape" autocomplete="off">
                    <label class="btn btn-outline-primary" for="btn-orientation-landscape">{{ $t('landscape') }}</label>
                    <input type="radio" class="btn-check" v-model="localSettings.forcedBoardOrientation" value="portrait" id="btn-orientation-portrait" autocomplete="off">
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
        <div class="sidebar-block block-analyze" v-if="isTab('main') && shouldShowAnalyzeBlock">
            <div class="container-fluid">

                <div v-if="null === gameAnalyze" class="text-center">
                    <button class="btn btn-sm btn-primary my-2" @click="doAnalyzeGame()">{{ $t('game_analysis.request_analysis') }}</button>
                </div>

                <p v-else-if="null === gameAnalyze.endedAt && null === gameAnalyze.analyze" class="text-center analyze-min-height d-flex flex-column justify-content-center">
                    <span>{{ $t('game_analysis.requested') }}</span>
                    <small class="text-body-secondary">{{ formatDistanceToNow(gameAnalyze.startedAt, { addSuffix: true }) }}</small>
                </p>

                <p v-else-if="null === gameAnalyze.analyze" class="text-center text-warning analyze-min-height">
                    {{ $t('game_analysis.errored') }}
                    <button class="btn btn-sm btn-primary my-2" @click="doAnalyzeGame()">{{ $t('try_again') }}</button>
                </p>

                <template v-else-if="null !== gameAnalyze.analyze">
                    <div v-if="!analyzeSummarized || null === gameAnalyze.endedAt" class="analyze-min-height">
                        <small>
                            {{ $t('game_analysis.game_analysis') }}
                            <router-link
                                :to="{ name: 'analysis-details' }"
                                class="text-decoration-none"
                                :title="$t('game_analysis.how_it_works')"
                                :aria-label="$t('game_analysis.how_it_works')"
                            ><IconInfoCircle /></router-link>
                            <a v-if="null !== gameAnalyze.endedAt" href="#" class="ps-2" @click.prevent="analyzeSummarized = true">Collapse</a>
                            <span v-else class="ps-2 text-body-secondary">{{ $t('game_analysis.in_progress', { done: analyzedMovesCount, total: gameAnalyze.analyze.length }) }}</span>
                        </small>

                        <AppGameAnalyze :analyze="gameAnalyze.analyze" :gamePublicId="gameId" :deepAnalyzeEnabled="null !== gameAnalyze.endedAt" />
                    </div>
                    <div v-else>
                        <AppGameAnalyzeSummary :analyze="gameAnalyze.analyze" @click="analyzeSummarized = false" class="pointer-clickable" />
                    </div>
                </template>
            </div>
        </div>

        <div class="flex-grow-1"></div>

        <!--
            Close game sidebar
        -->
        <div class="sidebar-block block-close bg-dark-subtle">
            <button type="button" class="btn btn-link text-body" aria-label="Close" @click="emits('close')">{{ $t('close') }} <IconArrowBarRight /></button>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.sidebar-blocks
    position absolute
    width 100%
    height 100%
    display flex
    flex-direction column
    overflow-y auto

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

.block-game-date
    p
        margin 0.5em 0

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

.block-analyze .analyze-min-height
    min-height 9em
    margin 0
</style>
