<script setup lang="ts">
/*
 * Viewer side of a Hexplorer live session, opened from a shared link:
 * follows streamed analysis (read only) and streamer cursor, shows match and chat.
 * Match opponent also plays from here.
 */
import { computed, onBeforeUnmount, provide, ref, toRef, useTemplateRef, watch } from 'vue';
import { whenever } from '@vueuse/core';
import { useHead } from '@unhead/vue';
import { t } from 'i18next';
import { hexplorerKey, useHexplorer } from '../composables/useHexplorer.js';
import { useHexplorerLiveSession } from '../composables/hexplorerLiveSession.js';
import { NoopAnalyzer } from '../analyzers/NoopAnalyzer.js';
import { LiveCursorLayer } from '../liveCursor.js';
import { storeHexplorerCopy } from '../services/hexplorerCopy.js';
import { hexplorerLiveChannelName, type HexplorerLiveCursor, type HexplorerLiveSnapshot } from '../../../../shared/app/hexplorerLive.js';
import MoveTree from '../components/MoveTree.vue';
import HexplorerMatchBoard from '../components/HexplorerMatchBoard.vue';
import HexplorerMatchPanel from '../components/HexplorerMatchPanel.vue';
import HexplorerLiveChat from '../components/HexplorerLiveChat.vue';
import useSocketStore from '../../../stores/socketStore.js';
import AppPseudo from '../../components/AppPseudo.vue';
import { IconArrowBarLeft, IconArrowBarRight, IconBoxArrowUpRight, IconBroadcast } from '../../icons.js';

const props = defineProps<{
    publicId: string;
}>();

const hexplorer = useHexplorer('', [new NoopAnalyzer()], { readonly: true });

provide(hexplorerKey, hexplorer);

const { tree, currentNodeId, currentComment, whiteWin, state, mount, gameView, applyLiveSnapshot } = hexplorer;

const cursorLayer = new LiveCursorLayer();

onBeforeUnmount(() => cursorLayer.destroy());

/*
 * Snapshots are applied one at a time, only the last received one is kept while applying.
 */
let applying = false;
let pendingSnapshot: null | HexplorerLiveSnapshot = null;
let pendingCursor: HexplorerLiveCursor = null;
const mounted = ref(false);

const applyPendingSnapshot = async (): Promise<void> => {
    if (applying || !mounted.value) {
        return;
    }

    applying = true;

    try {
        while (pendingSnapshot !== null) {
            const snapshot = pendingSnapshot;
            pendingSnapshot = null;
            await applyLiveSnapshot(snapshot);
        }

        // Board may have been rebuilt
        cursorLayer.setCursor(gameView.value, pendingCursor);
    } finally {
        applying = false;
    }
};

const hasSnapshot = ref(false);

const onSnapshot = (snapshot: HexplorerLiveSnapshot): void => {
    hasSnapshot.value = true;
    pendingSnapshot = snapshot;
    void applyPendingSnapshot();
};

const onCursor = (cursor: HexplorerLiveCursor): void => {
    pendingCursor = cursor;

    if (mounted.value && !applying) {
        cursorLayer.setCursor(gameView.value, cursor);
    }
};

const publicIdRef = toRef(props, 'publicId');
const { session, match, myColor, canJoin, isMyTurn, joinMatch, playMatchMove, resignMatch } = useHexplorerLiveSession(publicIdRef, { onSnapshot, onCursor });

const gameViewElement = useTemplateRef('game-view-element');

whenever(gameViewElement, async element => {
    await mount(element);
    mounted.value = true;
    await applyPendingSnapshot();
}, { once: true });

const ended = computed(() => session.value === null);
const streaming = computed(() => session.value?.streaming ?? false);

// Streamer cursor is not sent anymore
watch(streaming, isStreaming => {
    if (!isStreaming) {
        onCursor(null);
    }
});

/**
 * Match is shown instead of analysis while playing,
 * or when there is no stream to go back to.
 */
const showMatch = computed(() => match.value !== null && (match.value.state !== 'ended' || !streaming.value || !hasSnapshot.value));

useHead({
    title: () => [
        session.value?.host.pseudo,
        t('hexplorer_live.title'),
    ].filter(Boolean).join(' - '),
});

const redBarHeightCss = computed(() => `${100 - (whiteWin.value ?? 0.5) * 100}%`);
const blueBarHeightCss = computed(() => `${(whiteWin.value ?? 0.5) * 100}%`);

/*
 * Sidebar, closed by default on small screens where it covers the board
 */
const sidebarOpen = ref(window.innerWidth >= 576);
const unreadMessages = ref(0);

watch(sidebarOpen, open => {
    if (open) {
        unreadMessages.value = 0;
    }
});

// Chat stays mounted (v-show) so channel room is kept, count messages posted while sidebar is closed
const { socket } = useSocketStore();

const onChannelMessage = (channel: string): void => {
    if (channel === hexplorerLiveChannelName(props.publicId) && !sidebarOpen.value) {
        ++unreadMessages.value;
    }
};

socket.on('channelChatMessagePosted', onChannelMessage);
onBeforeUnmount(() => socket.off('channelChatMessagePosted', onChannelMessage));

const copyError = ref(false);

/**
 * Opens current streamed analysis in a new Hexplorer tab, to explore it freely.
 */
const openCopy = (): void => {
    const id = storeHexplorerCopy(state.value);

    if (id === null) {
        copyError.value = true;
        return;
    }

    window.open(`/hexplorer?import=${id}`, '_blank', 'noopener');
};
</script>

<template>
    <div class="layout bg-body">
        <div class="game">
            <div class="game-inner">
                <div class="left-analysis-bar" :class="{ 'analysis-unavailable': typeof whiteWin !== 'number' }">
                    <div class="advantage advantage-blue bg-primary"></div>
                    <div class="advantage advantage-red bg-danger"></div>
                </div>
                <div ref="game-view-element" class="game-view"></div>

                <div v-if="showMatch && match" class="match-overlay bg-body">
                    <HexplorerMatchBoard
                        :match
                        :canPlay="isMyTurn"
                        @move="move => playMatchMove(move)"
                    />
                </div>

                <div v-else-if="!hasSnapshot" class="match-overlay bg-body d-flex flex-column align-items-center justify-content-center text-body-secondary">
                    <span v-if="session === undefined">{{ $t('loading') }}</span>
                    <template v-else>
                        <IconBroadcast class="status-icon" />
                        <p class="lead mb-0">{{ ended ? $t('hexplorer_live.session_ended') : $t('hexplorer_live.waiting_for_stream') }}</p>
                    </template>
                </div>
            </div>

            <div class="bottom-menu">
                <span v-if="streaming" class="badge text-bg-danger">{{ $t('hexplorer_live.live') }}</span>

                <button
                    type="button"
                    class="btn btn-outline-primary open-sidebar-btn"
                    :aria-label="$t('hexplorer_live.tab_chat')"
                    @click="sidebarOpen = !sidebarOpen"
                >
                    <IconArrowBarLeft v-if="!sidebarOpen" />
                    <IconArrowBarRight v-else />
                    <span v-if="unreadMessages > 0" class="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-danger">
                        {{ unreadMessages }}
                        <span class="d-none">{{ ' ' + $t('unread_messages') }}</span>
                    </span>
                </button>
            </div>
        </div>

        <!-- Kept mounted when closed, so chat keeps receiving messages -->
        <aside v-show="sidebarOpen" class="sidebar bg-body border-start">
            <div class="sidebar-inner">
                <div class="sidebar-info">
                    <h1 class="fs-5 fw-semibold mb-0 d-flex align-items-center gap-2">
                        {{ $t('hexplorer_live.title') }}
                        <span v-if="streaming" class="badge text-bg-danger fs-6">{{ $t('hexplorer_live.live') }}</span>
                    </h1>
                    <div v-if="session" class="small">
                        {{ $t('hexplorer_live.hosted_by') }} <AppPseudo :player="session.host" />
                    </div>

                    <div v-if="ended" class="session-ended text-body-secondary text-center pt-3">
                        <IconBroadcast class="status-icon" />
                        <p class="lead mb-0">{{ $t('hexplorer_live.session_ended') }}</p>
                    </div>

                    <section v-if="match" class="mt-3">
                        <h2 class="h6">{{ $t('hexplorer_live.match') }}</h2>
                        <HexplorerMatchPanel
                            :match
                            :myColor
                            :canJoin
                            @join="joinMatch()"
                            @resign="resignMatch()"
                        />
                    </section>

                    <section v-if="hasSnapshot && !showMatch" class="mt-3">
                        <p v-if="currentComment" class="comment border rounded p-2 mb-2 small">{{ currentComment }}</p>

                        <div class="tree-container border rounded bg-body p-2">
                            <MoveTree :tree :nodeId="0" :currentNodeId />
                        </div>

                        <button type="button" class="btn btn-outline-primary btn-sm mt-2" @click="openCopy()">
                            <IconBoxArrowUpRight /> {{ $t('hexplorer_live.open_copy') }}
                        </button>
                        <div v-if="copyError" class="small text-danger mt-1">{{ $t('hexplorer_live.open_copy_failed') }}</div>
                    </section>
                </div>

                <HexplorerLiveChat :key="publicId" :publicId :closed="ended" class="sidebar-chat border-top" />

                <button
                    type="button"
                    class="btn btn-link text-body sidebar-close bg-dark-subtle"
                    @click="sidebarOpen = false"
                >{{ $t('close') }} <IconArrowBarRight /></button>
            </div>
        </aside>
    </div>
</template>

<style lang="stylus" scoped>
.layout
    display flex
    position relative
    height calc(100vh - 3rem)
    height calc(100dvh - 3rem)

.game
    flex 1 1 0
    min-width 0
    height 100%
    display flex
    flex-direction column

.game-inner
    position relative
    display flex
    flex 1
    min-height 0

.left-analysis-bar
    width 1rem
    height 100%

    .advantage
        width 1rem
        transition-property height
        transition-duration 200ms

    .advantage-red
        height v-bind(redBarHeightCss)

    .advantage-blue
        height v-bind(blueBarHeightCss)

    &.analysis-unavailable .advantage
        background-color #888 !important

.game-view
    width calc(100% - 1rem)
    height 100%

.match-overlay
    position absolute
    inset 0
    z-index 1

.bottom-menu
    flex-shrink 0
    display flex
    justify-content center
    gap 0.5em
    align-items center
    position relative
    min-height 3rem
    padding 0.25rem 3.5rem 0.25rem 0.5rem

    .open-sidebar-btn
        position absolute
        top 0.25rem
        bottom 0.25rem
        right 0
        margin-inline-end 0.75em

.status-icon
    font-size 6rem
    opacity 0.12
    margin-bottom 0.5rem

.sidebar
    width 24rem
    height 100%

    // Over the board on small screens
    @media (max-width: 575.5px)
        position absolute
        inset 0
        width 100%
        z-index 2

.sidebar-inner
    display flex
    flex-direction column
    height 100%

.sidebar-info
    flex 0 1 auto
    overflow-y auto
    padding 1rem

.sidebar-chat
    flex 1 1 0
    min-height 10rem

.sidebar-close
    flex 0 0 3em
    border-radius 0
    text-decoration none

.comment
    white-space pre-wrap

.tree-container
    max-height 16rem
    overflow auto
</style>
