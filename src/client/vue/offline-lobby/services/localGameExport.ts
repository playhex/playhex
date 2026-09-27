import { EngineGame } from '../../../../shared/game-engine/index.js';
import { SGF, SGFColor, SGFMove, sgfToString } from '../../../../shared/sgf/index.js';
import { createHexworldString, gameToHexworldLink } from '../../../../shared/app/hexworld.js';
import { pseudoSlug } from '../../../../shared/app/pseudoUtils.js';
import { downloadString } from '../../../services/fileDownload.js';

/*
 * Export a local game (vs AI or 1v1) to SGF, HexWorld or Hexplorer.
 */

const toHexworldGame = (game: EngineGame) => ({
    boardsize: game.getSize(),
    moves: game.getMovesHistory().map(({ move }) => move),
    outcome: game.getOutcome(),
    winner: game.getWinner(),
});

export const localGameToHexworldLink = (game: EngineGame, orientation: number): string => gameToHexworldLink(toHexworldGame(game), orientation);

/**
 * Hash to pass to Hexplorer route to load this game.
 */
export const localGameToHexplorerHash = (game: EngineGame, orientation: number): string => '#' + createHexworldString(toHexworldGame(game), orientation);

/**
 * @param pseudos Players pseudos, indexed by color
 */
export const localGameToSGF = (game: EngineGame, pseudos: [string, string]): string => {
    const colors: SGFColor[] = ['B', 'W'];

    const sgf: SGF = {
        FF: 4,
        CA: 'UTF-8',
        AP: 'PlayHex:0.0.0',
        GM: 11,
        SO: 'PlayHex.org',
        SZ: game.getSize(),
        PB: pseudos[0],
        PW: pseudos[1],
        DT: game.getStartedAt().toISOString().substring(0, 10),
        moves: game.getMovesHistory().map(({ move }, index): SGFMove => ({ [colors[index % 2]]: move })),
    };

    const winner = game.getWinner();

    if (winner === null) {
        sgf.RE = '?';
    } else {
        sgf.RE = winner === 0 ? 'B+' : 'W+';

        switch (game.getOutcome()) {
            case 'resign': sgf.RE += 'Resign'; break;
            case 'time': sgf.RE += 'Time'; break;
            case 'forfeit': sgf.RE += 'Forfeit'; break;
        }
    }

    return sgfToString(sgf);
};

export const downloadLocalGameSGF = (game: EngineGame, pseudos: [string, string]): void => {
    const filename = 'playhex-local-'
        + game.getStartedAt().toISOString().substring(0, 10) + '-'
        + pseudos.map(pseudo => pseudoSlug(pseudo) || 'player').join('-vs-')
        + '.sgf'
    ;

    downloadString(localGameToSGF(game, pseudos), filename, 'application/x-go-sgf');
};
