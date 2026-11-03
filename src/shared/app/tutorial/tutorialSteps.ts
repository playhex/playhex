/**
 * Onboarding steps, in order.
 * Ids are stored in player settings when completed: do not rename them.
 * To add a step: add it here, add its route in router.ts, and its title in tutorial.steps i18n keys.
 *
 * Steps with "seo" are indexed: listed in sitemap, with their own title, social preview and json-ld.
 * They need "social_preview.static.tutorial_<id>" i18n keys, and "/tutorial/<id>" as path.
 */
export const tutorialSteps = [
    { id: 'rules', routeName: 'tutorial-rules', chapter: 'hex_rule', seo: { teaches: 'Rules of the Hex board game' } },
    { id: 'swap', routeName: 'tutorial-swap', chapter: 'hex_rule', seo: { teaches: 'Swap rule of the Hex board game' } },
    { id: 'davies-1', routeName: 'tutorial-davies-1', chapter: 'beginners_strategy' },
    { id: 'bridge', routeName: 'tutorial-bridge', chapter: 'beginners_strategy', seo: { teaches: 'Bridge template of the Hex board game' } },
    { id: 'davies-4', routeName: 'tutorial-davies-4', chapter: 'beginners_strategy' },
    { id: 'block', routeName: 'tutorial-block', chapter: 'beginners_strategy', seo: { teaches: 'Blocking strategy of the Hex board game' } },
    { id: 'davies-7', routeName: 'tutorial-davies-7', chapter: 'beginners_strategy' },
    { id: 'ziggurat', routeName: 'tutorial-ziggurat', chapter: 'beginners_strategy', seo: { teaches: 'Ziggurat template of the Hex board game' } },
    { id: 'davies-10', routeName: 'tutorial-davies-10', chapter: 'beginners_strategy', boss: true },
    { id: 'next', routeName: 'tutorial-next', chapter: 'beginners_strategy' },
] as const;

/**
 * Chapters, in order. Progress is displayed by chapter, to not discourage players with a long list of steps.
 * Their titles are in tutorial.chapters i18n keys.
 */
export const tutorialChapters = ['hex_rule', 'beginners_strategy'] as const;

export type TutorialChapter = typeof tutorialChapters[number];

export type TutorialStep = typeof tutorialSteps[number];

export type TutorialStepId = TutorialStep['id'];

export type TutorialSeoStep = Extract<TutorialStep, { seo: object }>;

export const findTutorialStep = (id: TutorialStepId): TutorialStep => {
    const step = tutorialSteps.find(step => step.id === id);

    if (!step) {
        throw new Error(`No tutorial step "${id}"`);
    }

    return step;
};

export const getTutorialChapterSteps = (chapter: TutorialChapter): TutorialStep[] => {
    return tutorialSteps.filter(step => step.chapter === chapter);
};

export const isBossTutorialStep = (step: TutorialStep): boolean => 'boss' in step;

export const isSeoTutorialStep = (step: TutorialStep): step is TutorialSeoStep => 'seo' in step;

export const tutorialSeoSteps: TutorialSeoStep[] = tutorialSteps.filter(isSeoTutorialStep);

export const tutorialSeoPath = (step: TutorialSeoStep): string => `/tutorial/${step.id}`;

/**
 * Key of step title and description in "social_preview.static" i18n keys.
 */
export const tutorialSeoKey = (step: TutorialSeoStep): string => `tutorial_${step.id}`;

/**
 * Step after given one, or null if last.
 */
export const getNextTutorialStep = (id: TutorialStepId): null | TutorialStep => {
    const index = tutorialSteps.findIndex(step => step.id === id);

    return tutorialSteps[index + 1] ?? null;
};
