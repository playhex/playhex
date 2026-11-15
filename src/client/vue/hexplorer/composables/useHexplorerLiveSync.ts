import { onBeforeUnmount, ref, Ref, watch } from 'vue';
import useSocketStore from '../../../stores/socketStore.js';
import useAuthStore from '../../../stores/authStore.js';
import type { HexplorerLiveCursor, HexplorerLiveSession, HexplorerLiveSnapshot } from '../../../../shared/app/hexplorerLive.js';
import { getLiveCursorAppearance, LiveCursorLayer, trackBoardCursor } from '../liveCursor.js';
import type { HexplorerLiveSessionHandlers } from './hexplorerLiveSession.js';
import type { useHexplorer } from './useHexplorer.js';

/**
 * - off: nothing is applied nor sent, received snapshots wait
 * - view: displays snapshots and cursors sent by participants
 * - edit: also sends my changes and cursor (host or editor, while streaming)
 */
export type HexplorerLiveSyncMode = 'off' | 'view' | 'edit';

/**
 * Interval between checks of local changes to send.
 */
const SEND_INTERVAL_MS = 200;

/**
 * Sent snapshot is considered lost if not answered meanwhile, e.g connection lost, so next ones can be sent.
 */
const SEND_TIMEOUT_MS = 5000;

/**
 * Keeps a Hexplorer in sync with a live session, for host, editors and viewers.
 *
 * Whole snapshot is polled and sent when changed: also catches changes made on board only,
 * like setup stones not yet validated.
 * Server only accepts a snapshot based on its last revision: when two participants change analysis
 * at the same time, the first one wins, and the other receives it instead of its own change.
 * Only host analyzes positions with AI: editors receive its analysis like viewers.
 *
 * @param publicId Session followed
 * @param session Session as received, to get current snapshot and participants
 * @param mode See HexplorerLiveSyncMode
 * @param getBoardElement Element where board is mounted, to track cursor
 * @param analyzeRemoteChanges Whether this participant analyzes changes made by others (host), see applyLiveSnapshot()
 *
 * @returns Handlers to pass to session follower, and boardMounted() to call once board is mounted
 */
export const useHexplorerLiveSync = (
    hexplorer: ReturnType<typeof useHexplorer>,
    publicId: Ref<null | string>,
    session: Ref<undefined | null | HexplorerLiveSession>,
    mode: Ref<HexplorerLiveSyncMode>,
    getBoardElement: () => null | HTMLElement,
    analyzeRemoteChanges = false,
) => {
    const { socket } = useSocketStore();
    const authStore = useAuthStore();

    const cursorLayer = new LiveCursorLayer(playerPublicId => playerPublicId === authStore.loggedInPlayer?.publicId
        ? null
        : getLiveCursorAppearance(session.value, playerPublicId),
    );

    const mounted = ref(false);

    /**
     * Revision of the last snapshot received or sent, -1 if unknown yet.
     */
    let knownRevision = -1;

    /**
     * Last snapshot received, waiting to be applied. Only the last one is kept.
     */
    let pendingSnapshot: null | HexplorerLiveSnapshot = null;

    let applying = false;

    /**
     * Snapshot as displayed after last sent or applied one, to only send changes.
     */
    let lastSnapshot = '';

    /**
     * A snapshot has been sent, waiting for answer. Only one at a time.
     */
    let sending = false;

    /**
     * Incremented when following another session, to ignore answers of snapshots sent to previous one.
     */
    let generation = 0;

    /**
     * Forgets what is known from followed session, when it changes or ends:
     * a new session of same study starts from another revision.
     */
    const reset = (): void => {
        knownRevision = -1;
        pendingSnapshot = null;
        lastSnapshot = '';
        sending = false;
        ++generation;
    };

    watch(publicId, reset);

    /**
     * Whether a snapshot has been displayed, or sent.
     */
    const hasSnapshot = ref(false);

    const refreshCursors = (): void => {
        if (mounted.value) {
            cursorLayer.refresh(hexplorer.gameView.value);
        }
    };

    const applyPendingSnapshot = async (): Promise<void> => {
        if (applying || !mounted.value || mode.value === 'off') {
            return;
        }

        applying = true;

        try {
            while (pendingSnapshot !== null) {
                const snapshot = pendingSnapshot;
                pendingSnapshot = null;
                await hexplorer.applyLiveSnapshot(snapshot, analyzeRemoteChanges && mode.value === 'edit');
                hasSnapshot.value = true;
                lastSnapshot = JSON.stringify(hexplorer.getLiveSnapshot());
            }

            // Board may have been rebuilt
            refreshCursors();
        } finally {
            applying = false;
        }
    };

    const onSnapshot = (snapshot: HexplorerLiveSnapshot, revision: number): void => {
        if (revision <= knownRevision) {
            return;
        }

        knownRevision = revision;
        pendingSnapshot = snapshot;
        void applyPendingSnapshot();
    };

    const onCursor = (playerPublicId: string, cursor: HexplorerLiveCursor): void => {
        if (mounted.value && mode.value !== 'off') {
            cursorLayer.setCursor(hexplorer.gameView.value, playerPublicId, cursor);
        }
    };

    const handlers: HexplorerLiveSessionHandlers = { onSnapshot, onCursor };

    // Current snapshot, e.g when page is opened while session already running
    watch(session, current => {
        // Nobody sends cursor anymore
        if (!current?.streaming) {
            cursorLayer.clear();
        }

        // Ended, or does not exist
        if (current === null) {
            reset();
        }

        if (!current) {
            return;
        }

        if (current.snapshot !== null) {
            onSnapshot(current.snapshot, current.revision);
        } else {
            knownRevision = Math.max(knownRevision, current.revision);
        }

        // Participants may have changed
        refreshCursors();
    }, { immediate: true });

    const sendSnapshotIfChanged = (id: string): void => {
        if (sending || applying || pendingSnapshot !== null || knownRevision < 0) {
            return;
        }

        const snapshot = hexplorer.getLiveSnapshot();
        const serialized = JSON.stringify(snapshot);

        if (serialized === lastSnapshot) {
            return;
        }

        sending = true;

        const sentGeneration = generation;

        socket.timeout(SEND_TIMEOUT_MS).emit('hexplorerLiveSnapshot', id, knownRevision, snapshot, (timeout, result) => {
            if (sentGeneration !== generation) {
                return;
            }

            sending = false;

            // Timeout: lost, sent again on next check.
            // Rejected: another participant changed analysis first, and it has been received.
            // Error: e.g no longer editor, mode will change.
            if (timeout || !('revision' in result)) {
                return;
            }

            knownRevision = Math.max(knownRevision, result.revision);
            lastSnapshot = serialized;
            hasSnapshot.value = true;
        });
    };

    watch(mode, current => {
        if (current === 'off') {
            cursorLayer.clear();
            return;
        }

        void applyPendingSnapshot();
    });

    // Sends my changes and cursor while editing. Also resumes after reconnection.
    watch(() => mode.value === 'edit' && mounted.value ? publicId.value : null, (id, _, onCleanup) => {
        if (id === null) {
            return;
        }

        const interval = setInterval(() => sendSnapshotIfChanged(id), SEND_INTERVAL_MS);
        const element = getBoardElement();
        const stopCursorTracking = element === null
            ? null
            : trackBoardCursor(element, () => hexplorer.gameView.value, cursor => socket.emit('hexplorerLiveCursor', id, cursor))
        ;

        onCleanup(() => {
            clearInterval(interval);
            stopCursorTracking?.();
            socket.emit('hexplorerLiveCursor', id, null);
        });
    }, { immediate: true });

    onBeforeUnmount(() => cursorLayer.destroy());

    /**
     * To call once board is mounted: snapshot received meanwhile is applied.
     */
    const boardMounted = async (): Promise<void> => {
        mounted.value = true;
        await applyPendingSnapshot();
    };

    return {
        handlers,
        hasSnapshot,
        boardMounted,
    };
};
