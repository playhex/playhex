import { Service } from 'typedi';
import HostedGame from '../HostedGame';
import { Move } from '../../shared/game-engine';
import { HostedGameData, MoveData, PlayerData } from '../../shared/app/Types';
import { HexServer } from '../server';
import { GameOptionsData } from '@shared/app/GameOptions';
import AppPlayer from '../../shared/app/AppPlayer';
import Rooms from '../../shared/app/Rooms';
import { GameState } from '../../shared/game-engine/Game';

@Service()
export default class HostedGameRepository
{
    private hostedGames: { [key: string]: HostedGame } = {};

    constructor(
        private io: HexServer,
    ) {}

    getGames()
    {
        return this.hostedGames;
    }

    getGame(id: string): null | HostedGame
    {
        return this.hostedGames[id] ?? null;
    }

    createGame(host: AppPlayer, gameOptions: GameOptionsData, opponent: null | AppPlayer = null): HostedGame
    {
        const hostedGame = new HostedGame(this.io, gameOptions, host);
        this.hostedGames[hostedGame.getId()] = hostedGame;
        this.io.to(Rooms.lobby).emit('gameCreated', hostedGame.toData());

        if (null !== opponent) {
            hostedGame.playerJoin(opponent);
            this.io.to([Rooms.lobby, Rooms.game(hostedGame.getId())]).emit('gameJoined', hostedGame.getId(), opponent.getPlayerData());
        }

        return hostedGame;
    }

    getPlayerGames(playerData: PlayerData, state: null | GameState = null): HostedGameData[]
    {
        const hostedGameData: HostedGameData[] = [];

        for (const key in this.hostedGames) {
            if (!this.hostedGames[key].isPlayerInGame(playerData)) {
                continue;
            }

            if (null !== state && this.hostedGames[key].getState() !== state) {
                continue;
            }

            hostedGameData.push(this.hostedGames[key].toData());
        }

        const byRecentFirst = (game0: HostedGameData, game1: HostedGameData): number => {
            const date0 = game0.gameData?.endedAt ?? game0.createdAt;
            const date1 = game1.gameData?.endedAt ?? game1.createdAt;

            return date1.getTime() - date0.getTime();
        };

        hostedGameData.sort(byRecentFirst);

        return hostedGameData;
    }

    playerJoinGame(playerData: PlayerData, gameId: string): true | string
    {
        const hostedGame = this.hostedGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        const joinResult = hostedGame.playerJoin(playerData);

        if ('string' === typeof joinResult) {
            return joinResult;
        }

        this.io.to([Rooms.lobby, Rooms.game(gameId)]).emit('gameJoined', gameId, playerData);

        return true;
    }

    playerMove(playerData: PlayerData, gameId: string, move: MoveData): true | string
    {
        const hostedGame = this.hostedGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        return hostedGame.playerMove(playerData, new Move(move.row, move.col));
    }

    playerResign(playerData: PlayerData, gameId: string): true | string
    {
        const hostedGame = this.hostedGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        return hostedGame.playerResign(playerData);
    }

    playerCancel(playerData: PlayerData, gameId: string): true | string
    {
        const hostedGame = this.hostedGames[gameId];

        if (!hostedGame) {
            return 'no game ' + gameId;
        }

        return hostedGame.playerCancel(playerData);
    }
}
