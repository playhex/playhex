import { OfflineGame } from '../models/OfflineGame.js';
import { Local1v1Game } from '../models/Local1v1Game.js';
import { OfflineGameHistoryEntry } from '../models/OfflineGameHistoryEntry.js';

const localStorageKey = 'offline-games-storage';

const HISTORY_MAX_LENGTH = 5;

export type OfflineGameMode = 'ai' | 'local1v1';

/**
 * Board display chosen from local game menu.
 * null to use player settings.
 */
export type LocalBoardDisplay = {
    orientation: null | 'flat' | 'diamond';
    showCoords: null | boolean;
};

const getLocalStorage = (): null | Storage => {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    } catch (e) {
        // Access to localStorage can throw when blocked by browser settings
        return null;
    }
};

class OfflineGamesStorage
{
    private currentAIGame: null | OfflineGame = null;
    private currentLocal1v1Game: null | Local1v1Game = null;
    private lastLocal1v1Names: null | [string, string] = null;
    private boardDisplay: LocalBoardDisplay = { orientation: null, showCoords: null };

    private histories: { [mode in OfflineGameMode]: OfflineGameHistoryEntry[] } = {
        ai: [],
        local1v1: [],
    };

    constructor()
    {
        this.loadStorage();
    }

    /**
     * Whether games can be persisted on this device.
     */
    isAvailable(): boolean
    {
        return getLocalStorage() !== null;
    }

    getCurrentAIGame(): null | OfflineGame
    {
        return this.currentAIGame;
    }

    setCurrentAIGame(currentGame: OfflineGame): void
    {
        this.currentAIGame = currentGame;

        this.saveStorage();
    }

    clearCurrentAIGame(): void
    {
        this.currentAIGame = null;

        this.saveStorage();
    }

    getCurrentLocal1v1Game(): null | Local1v1Game
    {
        return this.currentLocal1v1Game;
    }

    setCurrentLocal1v1Game(currentGame: Local1v1Game): void
    {
        this.currentLocal1v1Game = currentGame;
        this.lastLocal1v1Names = currentGame.seats;

        this.saveStorage();
    }

    clearCurrentLocal1v1Game(): void
    {
        this.currentLocal1v1Game = null;

        this.saveStorage();
    }

    getLastLocal1v1Names(): null | [string, string]
    {
        return this.lastLocal1v1Names;
    }

    getBoardDisplay(): LocalBoardDisplay
    {
        return this.boardDisplay;
    }

    setBoardDisplay(boardDisplay: LocalBoardDisplay): void
    {
        this.boardDisplay = boardDisplay;

        this.saveStorage();
    }

    getHistory(mode: OfflineGameMode): OfflineGameHistoryEntry[]
    {
        return this.histories[mode];
    }

    addToHistory(mode: OfflineGameMode, entry: OfflineGameHistoryEntry): void
    {
        this.histories[mode] = [entry, ...this.histories[mode]].slice(0, HISTORY_MAX_LENGTH);

        this.saveStorage();
    }

    saveStorage(): void
    {
        const storage = getLocalStorage();

        if (!storage) {
            return;
        }

        try {
            storage.setItem(localStorageKey, JSON.stringify({
                currentAIGame: this.currentAIGame,
                currentLocal1v1Game: this.currentLocal1v1Game,
                lastLocal1v1Names: this.lastLocal1v1Names,
                boardDisplay: this.boardDisplay,
                histories: this.histories,
            }));
        } catch (e) {
            // noop, storage full or not allowed
        }
    }

    loadStorage(): void
    {
        const storage = getLocalStorage();

        if (!storage) {
            return;
        }

        try {
            const json = storage.getItem(localStorageKey);

            if (json === null) {
                return;
            }

            const data = JSON.parse(json);

            // "currentGame" is the legacy key, when only games vs AI were stored
            this.currentAIGame = data.currentAIGame ?? data.currentGame ?? null;
            this.currentLocal1v1Game = data.currentLocal1v1Game ?? null;
            this.lastLocal1v1Names = data.lastLocal1v1Names ?? null;
            this.boardDisplay = { ...this.boardDisplay, ...data.boardDisplay };
            this.histories.ai = data.histories?.ai ?? [];
            this.histories.local1v1 = data.histories?.local1v1 ?? [];
        } catch (e) {
            // noop, corrupted or not allowed storage, start fresh
        }
    }
}

export const offlineGamesStorage = new OfflineGamesStorage();
