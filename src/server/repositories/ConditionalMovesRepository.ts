import { Inject, Service } from 'typedi';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ConditionalMoves, HostedGame, Player } from '../../shared/app/models/index.js';
import { conditionalMovesShift, getNextMovesAfterLine } from '../../shared/pixi-board/conditional-moves/conditionalMovesUtils.js';
import logger from '../services/logger.js';
import { Move } from '../../shared/move-notation/move-notation.js';
import { HexMove, isSpecialHexMove } from '../../shared/move-notation/hex-move-notation.js';

@Service()
export default class ConditionalMovesRepository
{
    constructor(
        @Inject('Repository<ConditionalMoves>')
        private conditionalMovesRepository: Repository<ConditionalMoves>,
    ) {}

    find(player: Player, hostedGame: HostedGame): Promise<null | ConditionalMoves>
    {
        return this.conditionalMovesRepository.findOneBy({
            playerId: player.id,
            hostedGameId: hostedGame.id,
        } as FindOptionsWhere<ConditionalMoves>);
    }

    save(conditionalMoves: ConditionalMoves): Promise<ConditionalMoves>
    {
        logger.info('Conditional moves updated', {
            hostedGameId: conditionalMoves.hostedGameId,
            player: conditionalMoves.playerId,
            nextMoves: getNextMovesAfterLine(conditionalMoves.tree, []),
        });

        return this.conditionalMovesRepository.save(conditionalMoves);
    }

    /**
     * Get conditional move for a player after a given lastMove.
     *
     * @param player Which player needs to play now: we'll return this player's answer to his opponent move
     * @param lastMove Opponent move just played: we should return the answer for this move
     *
     * @returns answer, or null if no answer for this move
     */
    async shift(player: Player, hostedGame: HostedGame, lastMove: HexMove): Promise<null | Move>
    {
        const conditionalMoves = await this.find(player, hostedGame);

        if (conditionalMoves === null) {
            return null;
        }

        logger.info('Conditional moves candidates', {
            hostedGamePublicId: hostedGame.publicId,
            player: player.slug,
            lastMove,
            nextMoves: getNextMovesAfterLine(conditionalMoves.tree, []),
        });

        if (isSpecialHexMove(lastMove)) {
            logger.info('Conditional moves: answer to special moves not supported, ignore, but keep lines', {
                hostedGamePublicId: hostedGame.publicId,
                player: player.slug,
                lastMove,
                nextMoves: getNextMovesAfterLine(conditionalMoves.tree, []),
            });

            return null;
        }

        const result = conditionalMovesShift(conditionalMoves, lastMove);

        // save() should be awaited to make sure we get up-to-date conditional moves if we recall shift() right after
        await this.conditionalMovesRepository.save(conditionalMoves);

        return result;
    }
}
