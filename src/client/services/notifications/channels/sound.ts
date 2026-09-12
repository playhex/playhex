import { iAmInGame, isMe, isMyTurn, viewingGame } from '../../context-utils.js';
import { notifier } from '../notifier.js';
import { playAudio } from '../../../../shared/app/audioPlayer.js';
import { getLoserPlayer, isBotGame } from '../../../../shared/app/gameUtils.js';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';

function playAudioIfNotMuted(filename: string): void {
    if (usePlayerLocalSettingsStore().localSettings.muteAudio) return;
    playAudio(filename);
}

notifier.on('gameStart', (game) => {
    if (!(
        iAmInGame(game)
    )) {
        return;
    }

    playAudioIfNotMuted('/sounds/lisp/GenericNotify.ogg');
});

notifier.on('gameEnd', (game) => {
    if (!(
        iAmInGame(game) || viewingGame(game)
    )) {
        return;
    }

    const loser = getLoserPlayer(game);

    if (loser === null) {
        playAudioIfNotMuted('/sounds/lisp/GenericNotify.ogg');
        return;
    }

    if (isMe(loser)) {
        playAudioIfNotMuted('/sounds/lisp/Defeat.ogg');
    } else {
        playAudioIfNotMuted('/sounds/lisp/Victory.ogg');
    }
});

notifier.on('chatMessage', (game, chatMessage) => {
    if (!viewingGame(game)) {
        return;
    }

    if (chatMessage.player === null) {
        return;
    }

    if (isMe(chatMessage.player)) {
        return;
    }

    playAudioIfNotMuted('/sounds/lisp/NewPM.ogg');
});

notifier.on('gameTimeControlWarning', (game) => {
    if (!isMyTurn(game)) {
        return;
    }

    playAudioIfNotMuted('/sounds/lisp/LowTime.ogg');
});

notifier.on('rematchOffer', game => {
    // Play sound to both players in game
    if (!iAmInGame(game)) {
        return;
    }

    // Only play sound for 1v1 games
    if (isBotGame(game)) {
        return;
    }

    playAudioIfNotMuted('/sounds/lisp/NewChallenge.ogg');
});

notifier.on('gameChallengeCreated', () => {
    playAudioIfNotMuted('/sounds/lisp/NewChallenge.ogg');
});
