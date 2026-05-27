import GameView from '../../GameView.js';

declare global {
    interface Window {
        gameView: GameView | null;
        mountGameView: (gameView: GameView) => Promise<void>;
    }
}

const container = document.createElement('div');
container.id = 'board';
container.style.width = '500px';
container.style.height = '500px';
document.body.appendChild(container);

let currentGameView: GameView | null = null;

// Disconnect ResizeObserver before Cypress navigates away to prevent
// the "ResizeObserver loop" error from firing during page unload
window.addEventListener('beforeunload', () => {
    if (currentGameView) {
        currentGameView.destroy();
        currentGameView = null;
        window.gameView = null;
    }
});

window.mountGameView = async (gameView: GameView): Promise<void> => {
    if (currentGameView) {
        currentGameView.destroy();
        currentGameView = null;
        window.gameView = null;
        container.innerHTML = '';
    }

    currentGameView = gameView;
    window.gameView = gameView;

    await gameView.mount(container);

    // Wait two frames to ensure PixiJS has fully rendered
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
};
