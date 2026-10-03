import { t } from 'i18next';
import type { BreadcrumbItem } from '../../components/AppBreadcrumb.vue';

const home = (): BreadcrumbItem => ({ label: t('breadcrumb.home'), to: { name: 'home' } });
const videos = (): BreadcrumbItem => ({ label: t('videos.title'), to: { name: 'videos' } });

export const videosBreadcrumb = (): BreadcrumbItem[] => [
    home(),
    { label: t('videos.title') },
];

export const videoSubmitBreadcrumb = (): BreadcrumbItem[] => [
    home(),
    videos(),
    { label: t('videos.submit') },
];
