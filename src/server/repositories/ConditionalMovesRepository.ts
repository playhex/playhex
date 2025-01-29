import { Inject, Service } from 'typedi';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ConditionalMoves, HostedGame, Player } from '../../shared/app/models';
import { Move } from '../../shared/game-engine';
import { conditionalMovesShift } from '../../shared/app/conditionalMovesUtils';

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

    save(conditionalMove: ConditionalMoves): Promise<ConditionalMoves>
    {
        return this.conditionalMovesRepository.save(conditionalMove);
    }

    async shift(player: Player, hostedGame: HostedGame, lastMove: Move): Promise<null | Move>
    {
        const conditionalMoves = await this.find(player, hostedGame);

        if (null === conditionalMoves) {
            return null;
        }

        const result = conditionalMovesShift(conditionalMoves, lastMove);

        // save() should be awaited to make sure we get up-to-date conditional moves if we recall shift() right after
        await this.conditionalMovesRepository.save(conditionalMoves);

        return result;
    }
}
