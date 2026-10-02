import { t } from 'i18next';
import type { BreadcrumbItem } from '../../components/AppBreadcrumb.vue';

const home = (): BreadcrumbItem => ({ label: t('breadcrumb.home'), to: { name: 'home' } });
const puzzles = (): BreadcrumbItem => ({ label: t('puzzles.list_title'), to: { name: 'puzzles' } });

export const puzzlesBreadcrumb = (): BreadcrumbItem[] => [
    home(),
    { label: t('puzzles.list_title') },
];

export const myPuzzlesBreadcrumb = (): BreadcrumbItem[] => [
    home(),
    puzzles(),
    { label: t('puzzles.my_puzzles') },
];
