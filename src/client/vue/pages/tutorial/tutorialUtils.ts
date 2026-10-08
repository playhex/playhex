import DOMPurify from 'dompurify';
import { t } from 'i18next';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { apiPostGame } from '../../../apiClient.js';
import useAiConfigsStore from '../../../stores/aiConfigsStore.js';

/**
 * Translation containing html, keeping only allowed tags.
 */
export const sanitizedT = (key: string, allowedTags: string[] = ['strong']): string => {
    return DOMPurify.sanitize(
        t(key),
        { ALLOWED_TAGS: allowedTags },
    );
};

/**
 * Create online games from tutorial, then go to game page.
 */
export const useTutorialGameCreation = () => {
    const router = useRouter();
    const { aiConfigs } = storeToRefs(useAiConfigsStore());

    /**
     * Ai configs are sorted by `order` from api:
     * plays against first ai config of this engine, or first ai config of any engine if none.
     */
    const playVsAI = async (engine?: string): Promise<void> => {
        const aiConfig = aiConfigs.value.find(aiConfig => aiConfig.engine === engine)
            ?? aiConfigs.value[0];

        if (!aiConfig) {
            throw new Error('No AI available');
        }

        const game = await apiPostGame({
            boardsize: 11,
            opponentType: 'ai',
            ranked: false,
            opponentPublicId: aiConfig.player.publicId,
            timeControlType: {
                family: 'fischer',
                options: {
                    initialTime: 1800000,
                    timeIncrement: 10000,
                },
            },
        });

        await router.push({
            name: 'online-game',
            params: {
                gameId: game.publicId,
            },
        });
    };

    const playVsPlayer = async (): Promise<void> => {
        const game = await apiPostGame({
            boardsize: 11,
            opponentType: 'player',
            ranked: false,
            timeControlType: {
                family: 'fischer',
                options: {
                    initialTime: 600000,
                    timeIncrement: 5000,
                },
            },
        });

        await router.push({
            name: 'online-game',
            params: {
                gameId: game.publicId,
            },
        });
    };

    return {
        aiConfigs,
        playVsAI,
        playVsPlayer,
    };
};
