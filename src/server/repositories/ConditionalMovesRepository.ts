import { Inject, Service } from 'typedi';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ConditionalMoves, HostedGame, Player } from '../../shared/app/models';
import { Move } from '../../shared/game-engine';
import { conditionalMovesShift, getNextMovesAfterLine } from '../../shared/app/conditionalMovesUtils';
import logger from '../services/logger';

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

    async shift(player: Player, hostedGame: HostedGame, lastMove: Move): Promise<null | Move>
    {
        const conditionalMoves = await this.find(player, hostedGame);

        if (null === conditionalMoves) {
            return null;
        }

        logger.info('Conditional moves candidates', {
            hostedGamePublicId: hostedGame.publicId,
            player: player.slug,
            lastMove: lastMove.toString(),
            nextMoves: getNextMovesAfterLine(conditionalMoves.tree, []),
        });

        const result = conditionalMovesShift(conditionalMoves, lastMove.toString());

        // save() should be awaited to make sure we get up-to-date conditional moves if we recall shift() right after
        await this.conditionalMovesRepository.save(conditionalMoves);

        return null === result
            ? null
            : Move.fromString(result)
        ;
    }
}
