import { storeToRefs } from 'pinia';
import usePlayerSettingsStore from '../../stores/playerSettingsStore.js';
import { computed, watch } from 'vue';
import { t } from 'i18next';
import useToastsStore from '../../stores/toastsStore.js';
import { getNextTutorialStep, tutorialSteps, type TutorialStep, type TutorialStepId } from '../pages/tutorial/tutorialSteps.js';

/**
 * Remember whether tutorial link was displayed last time,
 * to display it (or not) before player settings are loaded,
 * and prevent layout shift on lobby page.
 */
const DISPLAY_LINK_CACHE_KEY = 'tutorial-display-link';

const getCachedDisplayLink = (): boolean => localStorage?.getItem(DISPLAY_LINK_CACHE_KEY) !== 'false';

const setCachedDisplayLink = (displayLink: boolean): void => localStorage?.setItem(DISPLAY_LINK_CACHE_KEY, String(displayLink));

export const useTutorialControls = () => {
    const playerSettingsStore = usePlayerSettingsStore();
    const { playerSettings } = storeToRefs(playerSettingsStore);
    const toastsStore = useToastsStore();

    const completedSteps = computed<string[]>(() => playerSettings.value?.tutorialCompletedSteps ?? []);

    const isCompleted = (id: TutorialStepId): boolean => completedSteps.value.includes(id);

    const completedCount = computed<number>(() => tutorialSteps.filter(step => isCompleted(step.id)).length);

    const totalCount = tutorialSteps.length;

    const isFinished = computed<boolean>(() => completedCount.value === totalCount);

    /**
     * Where to continue the tutorial: first not completed step, or first step.
     */
    const firstIncompleteStep = computed<TutorialStep>(() => tutorialSteps.find(step => !isCompleted(step.id)) ?? tutorialSteps[0]);

    /**
     * Shows a toast with a link to next step, even if step was already completed.
     *
     * @param options.silent No toast, e.g when step is completed by going to next step.
     */
    const markCompleted = async (id: TutorialStepId, options: { silent?: boolean } = {}): Promise<void> => {
        if (!options.silent) {
            const nextStep = getNextTutorialStep(id);

            toastsStore.addToast(t('tutorial.step_completed'), {
                level: 'success',
                tag: 'tutorial-step-completed',
                autoCloseAfter: 8000,
                actions: nextStep
                    ? [{ label: `${t('tutorial.next_step')} →`, action: { name: nextStep.routeName } }]
                    : [],
            });
        }

        // Settings not loaded yet, should not happen: progress is just not saved
        if (!playerSettings.value || isCompleted(id)) {
            return;
        }

        playerSettings.value.tutorialCompletedSteps = [...completedSteps.value, id];
        await playerSettingsStore.updatePlayerSettings();
    };

    const shouldDisplayLink = computed<boolean>(() => {
        if (playerSettings.value === null) {
            return getCachedDisplayLink();
        }

        return playerSettings.value.showTutorial === true && !isFinished.value;
    });

    watch(shouldDisplayLink, displayLink => {
        if (playerSettings.value !== null) {
            setCachedDisplayLink(displayLink);
        }
    });

    const dismissTutorial = async () => {
        if (!playerSettings.value) {
            throw new Error('Cannot dismiss tutorial, player settings not yet loaded');
        }

        playerSettings.value.showTutorial = false;
        await playerSettingsStore.updatePlayerSettings();
    };

    return {
        completedSteps,
        isCompleted,
        completedCount,
        totalCount,
        isFinished,
        firstIncompleteStep,
        markCompleted,
        shouldDisplayLink,
        dismissTutorial,
    };
};
