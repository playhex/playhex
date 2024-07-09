import { getLoser, iAmInGame, isMe, isMyTurn, viewingGame } from '../context-utils';
import { notifier } from '../notifier';

const play = (filename: string): void => {
    try {
        const audio = new Audio(filename);
        audio.play();
    } catch (e) {
        // noop, browser says user has not allowed audio permission
    }
};

notifier.on('gameStart', (hostedGame) => {
    if (!(
        iAmInGame(hostedGame) || viewingGame(hostedGame)
    )) {
        return;
    }

    play('/sounds/lisp/GenericNotify.ogg');
});

notifier.on('move', (hostedGame) => {
    if (!(
        viewingGame(hostedGame)
    )) {
        return;
    }

    play('/sounds/lisp/Move.ogg');
});

notifier.on('gameEnd', (hostedGame) => {
    if (!(
        iAmInGame(hostedGame) || viewingGame(hostedGame)
    )) {
        return;
    }

    const loser = getLoser(hostedGame);

    if (isMe(loser)) {
        play('/sounds/lisp/Defeat.ogg');
    } else {
        play('/sounds/lisp/Victory.ogg');
    }
});

notifier.on('chatMessage', (hostedGame, chatMessage) => {
    if (!viewingGame(hostedGame)) {
        return;
    }

    if (isMe(chatMessage.player)) {
        return;
    }

    play('/sounds/lisp/NewPM.ogg');
});

notifier.on('gameTimeControlWarning', (hostedGame) => {
    if (!isMyTurn(hostedGame)) {
        return;
    }

    play('/sounds/lisp/LowTime.ogg');
});
