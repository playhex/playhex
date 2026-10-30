import { Container } from 'typedi';
import { AppDataSource } from '../data-source.js';
import { Game, type Puzzle, type Tournament } from '../../shared/app/models/index.js';
import type { LadderDto } from '../../shared/app/models/LadderDto.js';
import PlayerRepository from '../repositories/PlayerRepository.js';
import StatsRepository from '../repositories/StatsRepository.js';
import TournamentRepository from '../repositories/TournamentRepository.js';
import TournamentSeriesRepository from '../repositories/TournamentSeriesRepository.js';
import PuzzleRepository from '../puzzles/PuzzleRepository.js';
import PuzzleCollectionRepository from '../puzzles/PuzzleCollectionRepository.js';
import LadderService from '../ladder/LadderService.js';
import { LadderError } from '../ladder/LadderError.js';
import type { TournamentSeriesPageData } from './meta/TournamentSeriesMetaBuilder.js';
import type { PuzzleCollectionPageData } from './meta/PuzzleCollectionMetaBuilder.js';
import type { PlayerPageData } from './meta/PlayerMetaBuilder.js';

/*
 * Loads only what social previews need, from database.
 * Each loader returns null when the entity does not exist.
 */

export const loadGame = async (publicId: string): Promise<null | Game> => {
    return await AppDataSource.getRepository(Game).findOne({
        where: { publicId },
        relations: {
            host: true,
            gameToPlayers: { player: true },
            ratings: { player: true },
            tournamentMatch: { tournament: true },
            ladderChallenge: true,
        },
    });
};

export const loadTournament = async (slug: string): Promise<null | Tournament> => {
    return await Container.get(TournamentRepository).findBySlugFull(slug);
};

export const loadTournamentSeries = async (slug: string): Promise<null | TournamentSeriesPageData> => {
    const series = await Container.get(TournamentSeriesRepository).findBySlug(slug);

    if (series === null) {
        return null;
    }

    return {
        series,
        tournaments: await Container.get(TournamentRepository).findBySeries(series.id),
    };
};

export const loadPuzzle = async (publicId: string): Promise<null | Puzzle> => {
    return await Container.get(PuzzleRepository).findPuzzleByPublicId(publicId);
};

export const loadPuzzleCollection = async (publicId: string): Promise<null | PuzzleCollectionPageData> => {
    const collection = await Container.get(PuzzleCollectionRepository).findByPublicId(publicId);

    if (collection === null) {
        return null;
    }

    return {
        collection,
        puzzles: await Container.get(PuzzleRepository).findByCollection(collection, false),
    };
};

export const loadPlayer = async (slug: string): Promise<null | PlayerPageData> => {
    const player = await Container.get(PlayerRepository).getPlayerBySlug(slug);

    if (player === null || player.id === undefined) {
        return null;
    }

    return {
        player,
        stats: await Container.get(StatsRepository).getPlayerStats(player.id),
    };
};

export const loadLadder = async (slug: string): Promise<null | LadderDto> => {
    const ladderService = Container.get(LadderService);

    try {
        return await ladderService.getLadderView(await ladderService.getLadderBySlug(slug));
    } catch (e) {
        if (e instanceof LadderError) {
            return null;
        }

        throw e;
    }
};
