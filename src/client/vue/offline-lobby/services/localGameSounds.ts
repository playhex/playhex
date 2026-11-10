import { EngineGame } from '../../../../shared/game-engine/index.js';
import { TimestampedMove } from '../../../../shared/game-engine/Types.js';
import { playAudio } from '../../../../shared/app/audioPlayer.js';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';

export const playLocalGameSound = (filename: string): void => {
    if (usePlayerLocalSettingsStore().localSettings.muteAudio) return;
    playAudio(filename);
};

/**
 * Plays sounds on move played, pass, and game end.
 *
 * @param getEndSound Sound to play when game ends,
 *                    i.e Victory or Defeat vs AI, or Draw in local 1v1 to stay neutral.
 *
 * @returns Function to stop listening
 */
export const listenLocalGameSounds = (game: EngineGame, getEndSound: () => string): () => void => {
    const onPlayed = ({ move }: TimestampedMove) => playLocalGameSound(move === 'pass'
        ? '/sounds/lisp/Check.ogg'
        : '/sounds/lisp/Move.ogg',
    );

    const onEnded = () => playLocalGameSound(getEndSound());

    game.on('played', onPlayed);
    game.on('ended', onEnded);

    return () => {
        game.off('played', onPlayed);
        game.off('ended', onEnded);
    };
};
