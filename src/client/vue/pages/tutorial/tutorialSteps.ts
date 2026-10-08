/**
 * Onboarding steps, in order.
 * Ids are stored in player settings when completed: do not rename them.
 * To add a step: add it here, add its route in router.ts, and its title in tutorial.steps i18n keys.
 */
export const tutorialSteps = [
    { id: 'rules', routeName: 'tutorial-rules' },
    { id: 'swap', routeName: 'tutorial-swap' },
    { id: 'davies-1', routeName: 'tutorial-davies-1' },
    { id: 'bridge', routeName: 'tutorial-bridge' },
    { id: 'davies-4', routeName: 'tutorial-davies-4' },
    { id: 'block', routeName: 'tutorial-block' },
    { id: 'davies-7', routeName: 'tutorial-davies-7' },
    { id: 'ziggurat', routeName: 'tutorial-ziggurat' },
    { id: 'davies-10', routeName: 'tutorial-davies-10' },
    { id: 'next', routeName: 'tutorial-next' },
] as const;

export type TutorialStep = typeof tutorialSteps[number];

export type TutorialStepId = TutorialStep['id'];

export const findTutorialStep = (id: TutorialStepId): TutorialStep => {
    const step = tutorialSteps.find(step => step.id === id);

    if (!step) {
        throw new Error(`No tutorial step "${id}"`);
    }

    return step;
};

/**
 * Step after given one, or null if last.
 */
export const getNextTutorialStep = (id: TutorialStepId): null | TutorialStep => {
    const index = tutorialSteps.findIndex(step => step.id === id);

    return tutorialSteps[index + 1] ?? null;
};
