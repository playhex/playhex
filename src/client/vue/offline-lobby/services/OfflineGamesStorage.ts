import { OfflineGame } from '../models/OfflineGame.js';

const localStorageKey = 'offline-games-storage';

class OfflineGamesStorage
{
    private currentGame: null | OfflineGame = null;

    constructor()
    {
        this.loadStorage();
    }

    getCurrentGame(): null | OfflineGame
    {
        return this.currentGame;
    }

    setCurrentGame(currentGame: OfflineGame): void
    {
        this.currentGame = currentGame;

        this.saveStorage();
    }

    clearCurrentGame(): void
    {
        this.currentGame = null;

        this.saveStorage();
    }

    saveStorage(): void
    {
        if (!localStorage) {
            return;
        }

        localStorage.setItem(localStorageKey, JSON.stringify({
            currentGame: this.currentGame,
        }));
    }

    loadStorage(): void
    {
        if (!localStorage) {
            return;
        }

        const json = localStorage.getItem(localStorageKey);

        if (json === null) {
            return;
        }

        const data = JSON.parse(json);

        this.currentGame = data.currentGame ?? null;
    }
}

export const offlineGamesStorage = new OfflineGamesStorage();
