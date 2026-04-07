import { defineOverlay } from '@overlastic/vue';
import { useRouter } from 'vue-router';
import Create1v1RankedOverlay from '../components/overlay/Create1v1RankedOverlay.vue';
import HostedGameOptions from '../../../shared/app/models/HostedGameOptions.js';
import Create1v1FriendlyOverlay from '../components/overlay/Create1v1FriendlyOverlay.vue';
import { apiPostGame } from '../../apiClient.js';
import Create1vAIRankedOverlay from '../components/overlay/Create1vAIRankedOverlay.vue';
import Create1vAIOverlay from '../components/overlay/Create1vAIOverlay.vue';
import { createGameOptionsFromUrlHash } from '../../services/create-game-options-from-url-hash.js';

// @ts-ignore: ALLOW_RANKED_BOT_GAMES replaced at build time by webpack.
export const allowRankedBotGames: boolean = ALLOW_RANKED_BOT_GAMES === 'true';

const create1v1RankedOverlay = defineOverlay(Create1v1RankedOverlay);
const create1v1FriendlyOverlay = defineOverlay(Create1v1FriendlyOverlay);
const create1vAIRankedOverlay = defineOverlay(Create1vAIRankedOverlay);
const create1vAIOverlay = defineOverlay(Create1vAIOverlay);

export const useCreateGameOverlay = () => {
    const router = useRouter();

    const goToGame = async (gameId: string) => {
        await router.push({
            name: 'online-game',
            params: {
                gameId,
            },
        });
    };

    /*
     * 1 vs 1 - ranked
     */
    const create1v1RankedAndJoinGame = async (gameOptions: HostedGameOptions = new HostedGameOptions()) => {
        gameOptions.opponentType = 'player';
        gameOptions.ranked = true;

        try {
            gameOptions = await create1v1RankedOverlay({ gameOptions });

            const hostedGame = await apiPostGame(gameOptions);
            await goToGame(hostedGame.publicId);
        } catch (e) {
            // noop, player just closed popin
        }
    };

    /*
     * 1 vs 1 - friendly
     */
    const create1v1FriendlyAndJoinGame = async (gameOptions: HostedGameOptions = new HostedGameOptions()) => {
        gameOptions.opponentType = 'player';
        gameOptions.ranked = false;

        try {
            gameOptions = await create1v1FriendlyOverlay({ gameOptions });

            const hostedGame = await apiPostGame(gameOptions);
            await goToGame(hostedGame.publicId);
        } catch (e) {
            // noop, player just closed popin
        }
    };

    /*
     * 1 vs AI ranked
     */
    const create1vAIRankedAndJoinGame = async (gameOptions: HostedGameOptions = new HostedGameOptions()) => {
        gameOptions.opponentType = 'ai';
        gameOptions.ranked = true;

        try {
            gameOptions = await create1vAIRankedOverlay({ gameOptions });

            const hostedGame = await apiPostGame(gameOptions);
            await goToGame(hostedGame.publicId);
        } catch (e) {
            // noop, player just closed popin
        }
    };

    /*
     * 1 vs AI
     */
    const create1vAIFriendlyAndJoinGame = async (gameOptions: HostedGameOptions = new HostedGameOptions()) => {
        gameOptions.opponentType = 'ai';
        gameOptions.ranked = false;

        try {
            gameOptions = await create1vAIOverlay({ gameOptions });

            const hostedGame = await apiPostGame(gameOptions);
            await goToGame(hostedGame.publicId);
        } catch (e) {
            // noop, player just closed popin
        }
    };

    /*
     * Auto create game with options from url hash
     * I.e "/#create-1v1" -> open create 1v1 popin with predefined parameters
     */
    const createGameFromHash = () => {
        const gameOptions = createGameOptionsFromUrlHash();

        if (gameOptions === null) {
            return;
        }

        // Remove hash to allow re-open create game overlay in case of clicking on a link again
        document.location.hash = '';

        if (gameOptions.opponentType === 'player') {
            if (gameOptions.ranked) {
                void create1v1RankedAndJoinGame(gameOptions);
            } else {
                void create1v1FriendlyAndJoinGame(gameOptions);
            }
        } else {
            void create1vAIFriendlyAndJoinGame(gameOptions);
        }
    };

    return {
        create1v1RankedAndJoinGame,
        create1v1FriendlyAndJoinGame,
        create1vAIRankedAndJoinGame,
        create1vAIFriendlyAndJoinGame,

        createGameFromHash,
    };
};
