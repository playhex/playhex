import Game from './Game';

/*
 * https://www.red-bean.com/sgf/index.html
 *
 * Very basic SGF generation.
 */

const baseRootNode = {
    FF: 4,
    GM: 11,
    AP: 'Alcalyn_SGF:0.0.0',
    PL: 'B',
};

const colors = ['B', 'W'];

const gameToSGF = (game: Game): string => {
    const rootNode: { [key: string]: string | number } = {
        ...baseRootNode,
        SZ: game.getSize(),
        DT: (game.getStartedAt() ?? game.getCreatedAt()).toISOString().substring(0, 10),
    };

    if (game.hasPlayers()) {
        rootNode.PB = game.getPlayer(0).getName();
        rootNode.PW = game.getPlayer(1).getName();
    }

    if (game.isEnded()) {
        rootNode.RE = game.getStrictWinner() === 0 ? 'B' : 'W';

        switch (game.getOutcome()) {
            case 'resign': rootNode.RE += '+Resign'; break;
            case 'time': rootNode.RE += '+Time'; break;
            case 'forfeit': rootNode.RE += '+Forfeit'; break;
        }
    }

    let str = '(;';

    str += Object.keys(rootNode)
        .map(key => `${key}[${rootNode[key]}]`)
        .join('')
    ;

    str += ';';

    str += game.getMovesHistory()
        .map((move, index) => `${colors[index % 2]}[${move.toString()}]`)
        .join(';')
    ;

    str += ')';

    return str;
};

export {
    gameToSGF,
};
