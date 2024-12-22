import { v4 as uuidv4 } from 'uuid';
import { AIConfig, Player } from '../../../shared/app/models';
import { orm } from '../../data-source';

type CreateAiConfigParameters = {
    config: { [key: string]: unknown };
    engine: string;
    label: string;
    description: string;
    order: number;
    boardsizeMin?: number;
    boardsizeMax?: number;
    isRemote?: boolean;
    requireMorePower?: boolean;

    pseudo: string;
    slug: string;
};

/**
 * Creates an aiConfig and a player if not already exists.
 *
 * @returns {Boolean} true if aiConfig just has been created, false if it was already existing.
 */
export default async (parameters: CreateAiConfigParameters): Promise<boolean> => {
    const em = orm.em.fork();

    const alreadyExists = await em.getRepository(Player).findOne({
        slug: parameters.slug,
    });

    if (null !== alreadyExists) {
        return false;
    }

    const player = new Player();

    player.pseudo = parameters.pseudo;
    player.slug = parameters.slug;
    player.isBot = true;
    player.publicId = uuidv4();

    const aiConfig = new AIConfig();

    aiConfig.config = parameters.config;
    aiConfig.engine = parameters.engine;
    aiConfig.label = parameters.label;
    aiConfig.description = parameters.description;
    aiConfig.order = parameters.order;
    aiConfig.boardsizeMin = parameters.boardsizeMin;
    aiConfig.boardsizeMax = parameters.boardsizeMax;
    aiConfig.isRemote = parameters.isRemote ?? false;
    aiConfig.requireMorePower = parameters.requireMorePower ?? false;
    aiConfig.player = player;

    await em.persistAndFlush([player, aiConfig]);

    return true;
};
