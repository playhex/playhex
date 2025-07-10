import { Inject, Service } from 'typedi';
import Tournament from '../../../shared/app/models/Tournament.js';
import TournamentBannedPlayer from '../../../shared/app/models/TournamentBannedPlayer.js';
import { Repository } from 'typeorm';
import Player from '../../../shared/app/models/Player.js';
import logger from '../../services/logger.js';
import { ActiveTournament } from '../ActiveTournament.js';
import { TournamentError } from '../TournamentError.js';
import { addTournamentHistory } from '../../../shared/app/models/TournamentHistory.js';

/**
 * Perform more complex actions on tournament
 * that an ActiveTournament can't do itself,
 * because need other services or repositories.
 */
@Service()
export class TournamentBanManager
{
    constructor(
        @Inject('Repository<TournamentBannedPlayer>')
        private tournamentBannedPlayerRepository: Repository<TournamentBannedPlayer>,
    ) {}

    async getBannedPlayers(tournament: Tournament): Promise<TournamentBannedPlayer[]>
    {
        return await this.tournamentBannedPlayerRepository.find({
            where: {
                tournament: { publicId: tournament.publicId },
            },
            relations: {
                player: true,
            },
        });
    }

    async isBanned(tournament: Tournament, player: Player): Promise<boolean>
    {
        if (!player.id || !tournament.id) {
            logger.error('Cannot check if player is banned, missing playerId or tournamentId', {
                playerId: player.id,
                tournamentId: tournament.id,
                tournamentPublicId: tournament.publicId,
            });

            throw new Error('Error while checking if player is banned');
        }

        const result = await this.tournamentBannedPlayerRepository.countBy({
            playerId: player.id,
            tournamentId: tournament.id,
        });

        return result > 0;
    }

    /**
     * Ban a given player from tournament.
     * Only before tournament started.
     * If player was subscribed, he is unsubscribed and cannot join again.
     * If player wasn't subscribed, he is marked as banned and can't join.
     */
    async banPlayer(activeTournament: ActiveTournament, player: Player): Promise<TournamentBannedPlayer>
    {
        const tournament = activeTournament.getTournament();

        if ('created' !== tournament.state) {
            throw new TournamentError('Cannot ban player, tournament already started');
        }

        // Mark player as banned if not yet done
        let tournamentBannedPlayer = await this.tournamentBannedPlayerRepository
            .findOneBy({
                player: { publicId: player.publicId },
                tournament: { publicId: tournament.publicId },
            })
        ;

        if (null === tournamentBannedPlayer) {
            tournamentBannedPlayer = new TournamentBannedPlayer();

            tournamentBannedPlayer.tournament = tournament;
            tournamentBannedPlayer.player = player;

            await this.tournamentBannedPlayerRepository.save(tournamentBannedPlayer);
        }

        const subscription = activeTournament.unsubscribePlayer(player.publicId);

        // Log ban in tournament history if player subscription has been removed
        // i.e do not add in history when player was just banned but wasn't subscribed to prevent noise
        if (subscription) {
            addTournamentHistory(tournament, 'player_banned', {
                playerPseudo: player.pseudo,
                playerPublicId: player.publicId,
            });
        }

        return tournamentBannedPlayer;
    }

    /**
     * Unban player from tournament.
     * Player will be allowed again to subscribe to tournament.
     */
    async unbanPlayer(activeTournament: ActiveTournament, player: Player): Promise<void>
    {
        const tournament = activeTournament.getTournament();

        if ('created' !== tournament.state) {
            throw new TournamentError('Cannot ban player, tournament already started');
        }

        if (!player.id || !tournament.id) {
            logger.error('Cannot unban player, missing playerId or tournamentId', {
                playerId: player.id,
                tournamentId: tournament.id,
                tournamentPublicId: tournament.publicId,
            });

            throw new Error('Error while unban player');
        }

        await this.tournamentBannedPlayerRepository.delete({
            playerId: player.id,
            tournamentId: tournament.id,
        });
    }
}
