import { iAmInGame, isMe, isMyTurn, viewingGame } from '../context-utils.js';
import { notifier } from '../notifier.js';
import { playAudio } from '../../../../shared/app/audioPlayer.js';
import { getLoserPlayer } from '../../../../shared/app/hostedGameUtils.js';

notifier.on('gameStart', (hostedGame) => {
    if (!(
        iAmInGame(hostedGame)
    )) {
        return;
    }

    playAudio('/sounds/lisp/GenericNotify.ogg');
});

notifier.on('gameEnd', (hostedGame) => {
    if (!(
        iAmInGame(hostedGame) || viewingGame(hostedGame)
    )) {
        return;
    }

    const loser = getLoserPlayer(hostedGame);

    if (loser === null) {
        playAudio('/sounds/lisp/GenericNotify.ogg');
        return;
    }

    if (isMe(loser)) {
        playAudio('/sounds/lisp/Defeat.ogg');
    } else {
        playAudio('/sounds/lisp/Victory.ogg');
    }
});

notifier.on('chatMessage', (hostedGame, chatMessage) => {
    if (!viewingGame(hostedGame)) {
        return;
    }

    if (chatMessage.player === null) {
        return;
    }

    if (isMe(chatMessage.player)) {
        return;
    }

    playAudio('/sounds/lisp/NewPM.ogg');
});

notifier.on('gameTimeControlWarning', (hostedGame) => {
    if (!isMyTurn(hostedGame)) {
        return;
    }

    playAudio('/sounds/lisp/LowTime.ogg');
});
