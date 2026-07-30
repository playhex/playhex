import { Container, Service } from 'typedi';
import { createCanonicalPosition, type CandidatePosition } from '../../../shared/position-comparator/position-comparator.js';
import { CandidatePositionsProviderInterface } from './CandidatePositionsProviderInterface.js';
import GameStore from '../../store/GameStore.js';
import logger from '../logger.js';
import { errorToLogger } from '../../../shared/app/utils.js';
import type { TimestampedMove } from '../../../shared/game-engine/Types.js';

const { BASE_URL } = process.env;

/**
 * Provides all currently playing 1v1 games,
 * ranked or not, live or correspondence.
 */
@Service()
export class CandidatePositionsProvider implements CandidatePositionsProviderInterface
{
    /**
     * Canonical positions of playing games, by game publicId.
     * Recalculated only when moves changed.
     * Keyed by moves count and last move instance, not only moves count:
     * undo then replay would keep same count with a different position,
     * but replayed move is a new TimestampedMove instance.
     * Candidate is null when position is invalid, to log it only once.
     */
    private cache = new Map<string, { movesCount: number, lastMove: null | TimestampedMove, candidate: null | CandidatePosition }>();

    getCandidatePositions(): CandidatePosition[]
    {
        // Lazy get, to prevent a circular dependency: GameServer => AIManager => RemoteApiPlayer => ... => GameStore => GameServer
        const activeGames = Container.get(GameStore).getActiveGames();
        const candidates: CandidatePosition[] = [];
        const seen = new Set<string>();

        for (const publicId in activeGames) {
            const gameServer = activeGames[publicId];

            // Do not use gameServer.getGame(), it rebuilds whole game state on each call
            const engineGame = gameServer.getEngineGame();

            if (
                engineGame === null
                || gameServer.getState() !== 'playing'
                || gameServer.getPlayers().some(player => player.isBot)
            ) {
                continue;
            }

            seen.add(publicId);

            const movesHistory = engineGame.getMovesHistory();
            const movesCount = movesHistory.length;
            const lastMove = movesHistory[movesCount - 1] ?? null;
            let cached = this.cache.get(publicId);

            if (cached?.movesCount !== movesCount || cached.lastMove !== lastMove) {
                try {
                    cached = {
                        movesCount,
                        lastMove,
                        candidate: {
                            ...createCanonicalPosition({
                                boardsize: engineGame.getSize(),
                                moves: movesHistory.map(({ move }) => move),
                            }),
                            gamePublicId: publicId,
                            source: BASE_URL
                                ? BASE_URL + '/games/' + publicId
                                : publicId
                            ,
                        },
                    };
                } catch (e) {
                    // Do not break whole check because of a single invalid game
                    logger.error('Anti-cheat: could not create canonical position of a playing game, ignore it', { publicId, ...errorToLogger(e) });
                    cached = { movesCount, lastMove, candidate: null };
                }

                this.cache.set(publicId, cached);
            }

            if (cached.candidate !== null) {
                candidates.push(cached.candidate);
            }
        }

        for (const publicId of this.cache.keys()) {
            if (!seen.has(publicId)) {
                this.cache.delete(publicId);
            }
        }

        return candidates;
    }
}
