import Game from './Game';

/*
 * https://www.red-bean.com/sgf/index.html
 *
 * Very basic SGF generation.
 */

const baseRootNode = {
    FF: 4,
    GM: 11,
    AP: 'PlayHex:0.0.0',
    PL: 'B',
};

type Options = {
    PB?: string;
    PW?: string;
};

const colors = ['B', 'W'];

const gameToSGF = (game: Game, options: null | Options = null): string => {
    const rootNode: { [key: string]: string | number } = {
        ...baseRootNode,
        SZ: game.getSize(),
        DT: game.getStartedAt().toISOString().substring(0, 10),
    };

    if (options?.PB) {
        rootNode.PB = options.PB;
    }

    if (options?.PW) {
        rootNode.PW = options.PW;
    }

    if (game.isEnded()) {
        if (game.isCanceled()) {
            rootNode.RE = 'Void';
        } else {
            rootNode.RE = game.getStrictWinner() === 0 ? 'B+' : 'W+';

            switch (game.getOutcome()) {
                case 'resign': rootNode.RE += 'Resign'; break;
                case 'time': rootNode.RE += 'Time'; break;
                case 'forfeit': rootNode.RE += 'Forfeit'; break;
            }
        }
    }

    let str = '(;';

    str += Object.keys(rootNode)
        .map(key => `${key}[${rootNode[key]}]`)
        .join('')
    ;

    str += ';';

    const movesStr = game.getMovesHistory().map(move => move.toString());

    if (game.getAllowSwap() && movesStr.length >= 2 && movesStr[0] === movesStr[1]) {
        movesStr[1] = 'swap-pieces';
    }

    str += movesStr
        .map((moveStr, index) => `${colors[index % 2]}[${moveStr}]`)
        .join(';')
    ;

    str += ')';

    return str;
};

export {
    gameToSGF,
};
