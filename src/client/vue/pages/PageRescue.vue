<script setup lang="ts">
import { onBeforeMount, onUnmounted, reactive, ref, Ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useSeoMeta } from '@unhead/vue';
import { useServerVersionChecker } from '../composables/useServerVersionChecker.js';
import { GameView, getGpuRenderer, loadTheme, resolveTheme, themeNeedsLoading } from '@playhex/pixi-board';
import { PlayingGameFacade } from '@playhex/pixi-board';
import AppGameView from '../components/AppGameView.vue';
import { PlayerSettingsFacade } from '../../services/board-view-facades/PlayerSettingsFacade.js';
import { CUSTOM_BOARD_THEME_ID, getPlayerBoardTheme, parseCustomBoardTheme } from '../../services/customBoardTheme.js';
import usePlayerSettingsStore from '../../stores/playerSettingsStore.js';
import usePlayerLocalSettingsStore from '../../stores/playerLocalSettingsStore.js';
import { apiPostClientErrorReport } from '../../apiClient.js';
import { ClientErrorReport } from '../../../shared/app/models/index.js';
import { errorToString } from '../../../shared/app/utils.js';

useSeoMeta({
    robots: 'noindex',
});

/*
 * Check version diff between server and client
 */
const {
    clientVersion,
    serverVersion,
    clientUpToDate,
    tryUpdateClient,
} = useServerVersionChecker();

/*
 * Device and board info
 */
const { playerSettings } = storeToRefs(usePlayerSettingsStore());
const { displayedTheme } = usePlayerLocalSettingsStore();

const userAgent = navigator.userAgent;
const gpuRenderer = getGpuRenderer();

/**
 * Pixi renderer used by test board, i.e "webgl", null if board not yet mounted.
 */
const pixiRenderer = ref<null | string>(null);

/**
 * Player theme assets loading status, null while loading.
 */
const themeAssetsStatus = ref<null | string>(null);

/*
 * Empty all service worker cached resources
 */
const cacheKeysFound = ref<null | number>(null);
const cacheKeysDeleted = ref<null | number>(null);
const reloading = ref(false);

void (async () => {
    const cache = await caches.open('cache');
    const keys = await cache.keys();

    cacheKeysFound.value = keys.length;
})();

const clearCache = async () => {
    cacheKeysFound.value = null;
    cacheKeysDeleted.value = 0;

    const cache = await caches.open('cache');
    const keys = await cache.keys();

    cacheKeysFound.value = keys.length;

    for (const key of keys) {
        await cache.delete(key);
        ++cacheKeysDeleted.value;
    }

    reloading.value = true;
    setTimeout(() => window.location.reload(), 1000);
};

/*
 * Capture js errors on this page, and report them
 */
type LoggedError = {
    type: string;
    message: string;
    stack: null | string;
    report: 'sending' | 'sent' | 'failed';
    reportError: null | string;
};

const loggedErrors: Ref<LoggedError[]> = ref([]);

/**
 * Same info as displayed on this page, in plain text, sent with every report.
 */
const getDiagnostic = (): string => [
    `URL: ${window.location.href}`,
    `Client version: ${clientVersion}`,
    `Server version: ${serverVersion.value ?? 'unknown'}`,
    `Client up to date: ${clientUpToDate.value ?? 'unknown'}`,
    `Cache keys found: ${cacheKeysFound.value ?? 'unknown'}`,
    `User agent: ${userAgent}`,
    `GPU renderer: ${gpuRenderer ?? 'unknown'}`,
    `Pixi renderer: ${pixiRenderer.value ?? 'not initialized'}`,
    `Board theme: ${playerSettings.value?.boardTheme ?? 'default'} (${displayedTheme()})`,
    `Board theme assets: ${themeAssetsStatus.value ?? 'loading…'}`,
    `Device pixel ratio: ${window.devicePixelRatio}`,
    `Screen: ${window.screen.width}x${window.screen.height}`,
    `Errors on this page: ${loggedErrors.value.length}`,
].join('\n');

const sendReport = async (type: string, message: string, stack: null | string = null): Promise<void> => {
    const clientErrorReport = new ClientErrorReport();

    clientErrorReport.type = type;
    clientErrorReport.message = message.substring(0, 4096);
    clientErrorReport.stack = stack?.substring(0, 16384) ?? null;
    clientErrorReport.diagnostic = getDiagnostic().substring(0, 8192);

    await apiPostClientErrorReport(clientErrorReport);
};

const logError = (type: string, error: unknown): void => {
    const loggedError = reactive<LoggedError>({
        type,
        message: errorToString(error),
        stack: error instanceof Error && error.stack ? error.stack : null,
        report: 'sending',
        reportError: null,
    });

    loggedErrors.value.push(loggedError);

    sendReport(type, loggedError.message, loggedError.stack)
        .then(() => loggedError.report = 'sent')
        .catch((e: unknown) => {
            loggedError.report = 'failed';
            loggedError.reportError = errorToString(e);
        })
    ;
};

const onErrorListener = (event: ErrorEvent): void => {
    logError('error', event.error ?? event.message);
};

const onUnhandledRejectionListener = (event: PromiseRejectionEvent): void => {
    logError('unhandledrejection', event.reason);
};

/*
 * Send diagnostic manually, even when no error happened
 */
const manualReport = ref<null | 'sending' | 'sent' | 'failed'>(null);
const manualReportError = ref<null | string>(null);

const sendManualReport = async (): Promise<void> => {
    manualReport.value = 'sending';
    manualReportError.value = null;

    try {
        await sendReport('manual', 'Diagnostic sent manually from rescue page');
        manualReport.value = 'sent';
    } catch (e) {
        manualReport.value = 'failed';
        manualReportError.value = errorToString(e);
    }
};

onBeforeMount(() => {
    window.addEventListener('error', onErrorListener);
    window.addEventListener('unhandledrejection', onUnhandledRejectionListener);
});

onUnmounted(() => {
    window.removeEventListener('error', onErrorListener);
    window.removeEventListener('unhandledrejection', onUnhandledRejectionListener);
});

/*
 * Test board rendering, with player theme, like on a game page
 */
const gameView = new GameView(3);
const playingGameFacade = new PlayingGameFacade(gameView);
const playerSettingsFacade = new PlayerSettingsFacade(gameView);

playingGameFacade.addMove('b2');

const boardMountTimeout = setTimeout(() => logError('board_mount', new Error('Board still not mounted after 10s')), 10000);

gameView.ready()
    .then(() => pixiRenderer.value = gameView.getRendererName())
    .catch((e: unknown) => logError('board_mount', e))
    .finally(() => clearTimeout(boardMountTimeout))
;

onUnmounted(() => {
    clearTimeout(boardMountTimeout);
    playerSettingsFacade.destroy();
    gameView.destroy();
});

/*
 * Test player theme assets loading
 */
const checkThemeAssets = async (): Promise<void> => {
    // Wait for player settings, else default theme would be checked instead of player theme
    if (!playerSettings.value) {
        return;
    }

    const { boardTheme, customBoardTheme } = playerSettings.value;

    // Invalid custom theme silently falls back to default theme on game page
    if (boardTheme === CUSTOM_BOARD_THEME_ID && customBoardTheme) {
        const parsed = parseCustomBoardTheme(customBoardTheme);

        if (parsed instanceof Error) {
            logError('custom_theme', parsed);
        }
    }

    const theme = resolveTheme(getPlayerBoardTheme(boardTheme, customBoardTheme), displayedTheme());

    if (!themeNeedsLoading(theme)) {
        themeAssetsStatus.value = 'no assets to load';
        return;
    }

    themeAssetsStatus.value = null;

    const start = performance.now();
    const errors = await loadTheme(theme);

    for (const error of errors) {
        logError('theme_load', error);
    }

    themeAssetsStatus.value = errors.length > 0
        ? `${errors.length} error(s)`
        : `loaded in ${Math.round(performance.now() - start)}ms`
    ;
};

watch(playerSettings, () => {
    checkThemeAssets().catch((e: unknown) => logError('theme_load', e));
}, { immediate: true });
</script>

<template>
    <div class="container">
        <h1>Rescue page</h1>

        <h2>Versions</h2>

        <p>Client version: {{ clientVersion }}</p>
        <p>Server version: {{ serverVersion }}</p>

        <p v-if="clientUpToDate" class="text-success">Client seems up to date.</p>
        <template v-else>
            <p class="text-warning">Client seems not up to date, try clearing the cache.</p>
            <button class="btn btn-warning mb-4" @click="tryUpdateClient">Try to update now</button>
        </template>

        <h2>Cache</h2>

        <button class="btn btn-lg btn-primary" @click="clearCache()">Clear cache</button>

        <p>
            <small v-if="null !== cacheKeysFound">{{ cacheKeysFound }} cache keys found</small>
            <br>
            <small v-if="null !== cacheKeysDeleted">{{ cacheKeysDeleted }} deleted<template v-if="reloading">. Reloading...</template></small>
        </p>

        <h2>Device</h2>

        <ul>
            <li>User agent: <code>{{ userAgent }}</code></li>
            <li>GPU renderer: <code>{{ gpuRenderer ?? 'unknown' }}</code></li>
            <li>Pixi renderer: <code>{{ pixiRenderer ?? 'not initialized' }}</code></li>
            <li>Board theme: <code>{{ playerSettings?.boardTheme ?? 'default' }}</code> ({{ displayedTheme() }})</li>
            <li>Board theme assets: {{ themeAssetsStatus ?? 'loading…' }}</li>
        </ul>

        <h2>Hex board rendering</h2>

        <p>Displaying Hex board, with your board theme:</p>

        <AppGameView :gameView class="board-container" />

        <p>You should see a 3x3 board above.</p>

        <h2>Logged errors</h2>

        <p :class="loggedErrors.length > 0 ? 'text-warning' : 'text-success'">{{ loggedErrors.length }} error(s) on this page.</p>

        <div v-for="loggedError, index in loggedErrors" :key="index" class="mb-3">
            <p class="mb-1">{{ loggedError.type }}: {{ loggedError.message }}</p>
            <pre v-if="loggedError.stack" class="small mb-1">{{ loggedError.stack }}</pre>
            <p class="small">
                <span v-if="'sending' === loggedError.report" class="text-body-secondary">Reporting error…</span>
                <span v-else-if="'sent' === loggedError.report" class="text-success">Error reported.</span>
                <span v-else class="text-danger">Could not report error: {{ loggedError.reportError }}</span>
            </p>
        </div>

        <h2>Send diagnostic</h2>

        <p>Errors are reported automatically. If you still have an issue, you can send us this page diagnostic anyway.</p>

        <button
            class="btn"
            :class="'sent' === manualReport ? 'btn-success' : 'btn-outline-primary'"
            :disabled="'sending' === manualReport || 'sent' === manualReport"
            @click="sendManualReport()"
        >{{ 'sent' === manualReport ? 'Diagnostic sent' : 'Send diagnostic' }}</button>

        <p class="small mt-2">
            <span v-if="'sending' === manualReport" class="text-body-secondary">Sending diagnostic…</span>
            <span v-else-if="'failed' === manualReport" class="text-danger">Could not send diagnostic: {{ manualReportError }}</span>
        </p>
    </div>
</template>

<style lang="stylus" scoped>
.board-container
    width 200px
    height 200px

pre
    white-space pre-wrap
</style>
