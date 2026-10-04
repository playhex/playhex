import { t } from 'i18next';
import type { BreadcrumbItem } from '../../components/AppBreadcrumb.vue';
import type { Puzzle, PuzzleCollection } from '../../../../shared/app/models/index.js';

const home = (): BreadcrumbItem => ({ label: t('breadcrumb.home'), to: { name: 'home' } });
const puzzles = (): BreadcrumbItem => ({ label: t('puzzles.list_title'), to: { name: 'puzzles' } });
const myPuzzles = (): BreadcrumbItem => ({ label: t('puzzles.my_puzzles'), to: { name: 'puzzles-mine' } });
const collection = (puzzleCollection: Pick<PuzzleCollection, 'publicId' | 'name'>): BreadcrumbItem => ({
    label: puzzleCollection.name,
    to: { name: 'puzzle-collection', params: { publicId: puzzleCollection.publicId } },
});

export const puzzlesBreadcrumb = (): BreadcrumbItem[] => [
    home(),
    { label: t('puzzles.list_title') },
];

export const myPuzzlesBreadcrumb = (): BreadcrumbItem[] => [
    home(),
    puzzles(),
    { label: t('puzzles.my_puzzles') },
];

/**
 * Home > Puzzles [> Collection]
 * Without puzzle title, already displayed just below in puzzle sidebar.
 */
export const puzzleBreadcrumb = (puzzle: Puzzle): BreadcrumbItem[] => [
    home(),
    puzzles(),
    ...(puzzle.collection ? [collection(puzzle.collection)] : []),
];

export const puzzleCollectionBreadcrumb = (puzzleCollection: PuzzleCollection): BreadcrumbItem[] => [
    home(),
    puzzles(),
    { label: puzzleCollection.name },
];

/**
 * Create collection: Home > Puzzles > My puzzles > Create
 * Edit collection: Home > Puzzles > Collection > Edit
 */
export const puzzleCollectionEditorBreadcrumb = (puzzleCollection: null | PuzzleCollection): BreadcrumbItem[] => [
    home(),
    puzzles(),
    puzzleCollection === null ? myPuzzles() : collection(puzzleCollection),
    { label: t(puzzleCollection === null ? 'puzzles.collections.create' : 'puzzles.collections.edit') },
];
