import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import { Move as EngineMove } from '../../shared/game-engine/index.js';
import { MoveData } from '../../shared/game-engine/normalization.js';
import { AppDataSource } from '../data-source.js';
import hexProgram from './hexProgram.js';
import { guessDemerHandicap } from '../../shared/app/demerHandicap.js';

type ExportedGame = {
    /**
     * uuid/publicId of game
     */
    id: string;

    /**
     * Url of the game. Based on BASE_URL of .env, or defaults to relative urls
     */
    url: string;

    boardsize: number;

    /**
     * Number of moves
     */
    movesCount: number;

    /**
     * Moves like "d4 swap-pieces e5"...
     */
    moves: string;

    winner: 'red' | 'blue';

    /**
     * How the game ended
     */
    outcome: 'time' | 'resign' | 'path';

    allowSwap: boolean;

    /**
     * Whether this was a rated game or not
     */
    rated: boolean;

    /**
     * Demer handicap guessed from pass moves and game settings
     */
    handicap: number | 'N/S';

    /**
     * Nickname of Red player
     */
    playerRed: string;

    /**
     * Nickname of Blue player
     */
    playerBlue: string;

    /**
     * Is Red player a player or a bot
     */
    playerRedType: 'player' | 'bot';

    /**
     * Is Blue player a player or a bot
     */
    playerBlueType: 'player' | 'bot';

    startedAt: Date;

    endedAt: Date;
};

const { BASE_URL } = process.env;

hexProgram
    .command('export-games')
    .description('Export games as json to a file')
    .action(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const gameUrlPrefix = (BASE_URL ?? '') + '/games/';

        const gameResults = await AppDataSource.query(`
            select
                *
            from hosted_game hg
            inner join game g on hg.id = g.hostedGameId
            inner join hosted_game_options hgo on hg.id = hgo.hostedGameId
            where hg.state = 'ended'
        `);

        const playerResults = await AppDataSource.query(`
            select
                hg.id,
                hgp.order,
                p.isBot,
                p.pseudo
            from hosted_game hg
            left join hosted_game_to_player hgp on hgp.hostedGameId = hg.id
            left join player p on hgp.playerId = p.id
            where hg.state = 'ended'
            order by hg.id, hgp.order
        `);

        type Player = {
            pseudo: string;
            type: 'player' | 'bot';
        };

        const gamePlayers: { [hostedGameId: number]: [null | Player, null | Player] } = [];

        for (const playerResult of playerResults) {
            if (!gamePlayers[playerResult.id]) {
                gamePlayers[playerResult.id] = [null, null];
            }

            gamePlayers[playerResult.id][playerResult.order] = {
                pseudo: playerResult.pseudo,
                type: playerResult.isBot ? 'bot' : 'player',
            };
        }

        const exportedGames: ExportedGame[] = [];

        for (const gameResult of gameResults) {
            if (!gamePlayers[gameResult.id] || gamePlayers[gameResult.id][0] === null || gamePlayers[gameResult.id][1] === null) {
                console.error('gamePlayers[] = ', gamePlayers[gameResult.id]);
                throw new Error(`Missing player for game #${gameResult.id}`);
            }

            if (gameResult.winner !== 0 && gameResult.winner !== 1) {
                console.error(gameResult);
                throw new Error('winner is not 0 or 1');
            }

            const moves = JSON.parse(gameResult.movesHistory);

            exportedGames.push({
                id: gameResult.publicId,
                url: gameUrlPrefix + gameResult.publicId,
                boardsize: gameResult.boardsize,
                movesCount: moves.length,
                moves: moves
                    .map((m: MoveData) => EngineMove.fromData(m).toString())
                    .join(' ')
                ,
                playerRed: gamePlayers[gameResult.id][0]!.pseudo,
                playerBlue: gamePlayers[gameResult.id][1]!.pseudo,
                playerRedType: gamePlayers[gameResult.id][0]!.type,
                playerBlueType: gamePlayers[gameResult.id][1]!.type,
                winner: ['red', 'blue'][gameResult.winner] as 'red' | 'blue',
                outcome: gameResult.outcome ?? 'path',
                allowSwap: gameResult.allowSwap === 1,
                rated: gameResult.ranked === 1,
                handicap: guessDemerHandicap(
                    gameResult.swapRule === 1,
                    gameResult.firstPlayer !== null,
                    moves,
                ),
                startedAt: gameResult.startedAt,
                endedAt: gameResult.endedAt,
            });
        }

        type FileStat = {
            description: string;
            filename: string;
            generated_at: string;
            filesize: number;
            filesizeUnzipped: number;
            itemsCount: number;
        };

        const fileContent = JSON.stringify(exportedGames);
        const date = new Date();
        const serverPath = 'assets/export-data';
        const publicPath = '/export-data';
        const filename = `playhex-games-${date.toISOString().substring(0, 10)}.json.gz`;

        if (!fs.existsSync(serverPath)){
            fs.mkdirSync(serverPath, { recursive: true });
        }

        console.log(exportedGames.length, 'games exported.');
        console.log('Generating manifest...');

        fs.writeFileSync(serverPath + '/' + filename, gzipSync(fileContent), 'utf-8');
        const stat = fs.statSync(serverPath + '/' + filename);

        const fileStat: FileStat = {
            description: 'All PlayHex games since the beginning, 1v1 and bots games.',
            filename: publicPath + '/' + filename,
            generated_at: date.toISOString(),
            filesize: stat.size,
            filesizeUnzipped: fileContent.length,
            itemsCount: exportedGames.length,
        };

        fs.writeFileSync(serverPath + '/manifest.json', JSON.stringify(fileStat), 'utf-8');

        console.log('done.');
    })
;
