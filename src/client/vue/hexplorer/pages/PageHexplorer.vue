<script setup lang="ts">
import { onKeyDown, useMediaQuery, whenever } from '@vueuse/core';
import { computed, provide, ref, useTemplateRef, watch } from 'vue';
import { t } from 'i18next';
import { storeToRefs } from 'pinia';
import { useHead } from '@unhead/vue';
import { hexplorerKey, useHexplorer } from '../composables/useHexplorer.js';
import { hexplorerStudyKey, useHexplorerStudy } from '../composables/useHexplorerStudy.js';
import { HEXPLORER_ANALYSIS_STATE_KEY } from '../HexplorerState.js';
import {
    IconArrowBarLeft,
    IconArrowDownUp,
    IconArrowBarRight,
    IconChevronLeft,
    IconChevronRight,
    IconCircleFill,
    IconDiagram2,
    IconFolder2Open,
    IconQuestionCircle,
    IconTrash,
} from '../../icons.js';
import AppResizableSidebar from '../../components/AppResizableSidebar.vue';
import HexplorerFileTab from '../components/HexplorerFileTab.vue';
import HexplorerHelpTab from '../components/HexplorerHelpTab.vue';
import HexplorerSetupTools from '../components/HexplorerSetupTools.vue';
import HexplorerTreeTab from '../components/HexplorerTreeTab.vue';
import { NoopAnalyzer } from '../analyzers/NoopAnalyzer';
import { AnalyzerInterface } from '../analyzers/AnalyzerInterface.js';
import { createKatahexAnalyzers } from '../composables/useAnalysisEngines.js';
import usePlayerLocalSettingsStore from '../../../stores/playerLocalSettingsStore.js';

// Available analysis engines, selectable in the sidebar. First one is the default.
const analyzers: AnalyzerInterface[] = [
    ...createKatahexAnalyzers(),
    new NoopAnalyzer(),
];

const hexplorer = useHexplorer(document.location.hash, analyzers);

provide(hexplorerKey, hexplorer);

const {
    whiteWin,
    state,
    analysisLoading,
    goToParent,
    goToFirstChild,
    pass,
    canDeleteCurrentNode,
    deleteCurrentNode,
    updateAnalysis,
    bindKeys,
    mount,
    importAnalysis,
    restoreState,
} = hexplorer;

const hexplorerStudy = useHexplorerStudy(state, restoreState);

provide(hexplorerStudyKey, hexplorerStudy);

const { canUpdate, error: studyError, hasUnsavedChanges, loading: studyLoading, notFound, save: saveStudy, saving: studySaving, title: studyTitle } = hexplorerStudy;

useHead({
    title: () => [studyTitle.value.trim(), t('hexplorer.title')].filter(Boolean).join(' - '),
});

const gameViewElement = useTemplateRef('game-view-element');

whenever(gameViewElement, async element => {
    await mount(element);
    await importAnalysisFromHistoryState();
    await hexplorerStudy.init();
    await updateAnalysis();
}, {
    once: true,
});

const redBarHeightCss = computed(() => `${100 - (whiteWin.value ?? 0.5) * 100}%`);
const blueBarHeightCss = computed(() => `${(whiteWin.value ?? 0.5) * 100}%`);
const whiteWinAvailable = computed(() => typeof whiteWin.value === 'number');

bindKeys();

/**
 * On small screens, sidebar covers the board: main setup tools are also under it.
 */
const isLargeScreen = useMediaQuery('(min-width: 576px)');

const sidebarOpen = ref(true);

type HexplorerTab = 'file' | 'tree' | 'help';

const { localSettings } = storeToRefs(usePlayerLocalSettingsStore());

const currentTab = ref<HexplorerTab>(localSettings.value.hexplorerHelpDismissed ? 'tree' : 'help');

const navPanels = computed(() => [
    {
        key: 'file' as const,
        icon: IconFolder2Open,
        labelKey: 'hexplorer.tab_file',
        badge: hasUnsavedChanges.value ? { variant: 'warning', titleKey: 'hexplorer.study_unsaved_changes' } : null,
    },
    { key: 'tree' as const, icon: IconDiagram2, labelKey: 'hexplorer.tab_tree' },
    { key: 'help' as const, icon: IconQuestionCircle, labelKey: 'hexplorer.tab_help' },
]);

const openFileTab = (): void => {
    sidebarOpen.value = true;
    currentTab.value = 'file';
};

/*
 * ctrl+S, also while typing a comment or a title.
 * File tab tells why study cannot be saved, or why saving failed.
 */
onKeyDown(e => (e.ctrlKey || e.metaKey) && e.key === 's', async e => {
    e.preventDefault();

    if (studySaving.value || studyLoading.value) {
        return;
    }

    if (state.value.setupMode || !canUpdate.value) {
        openFileTab();
        return;
    }

    if (!hasUnsavedChanges.value) {
        return;
    }

    await saveStudy();
});

const analysisImportError = ref<string | null>(null);

// Errors are displayed in file tab, also tells why study is not displayed
watch([notFound, studyError, analysisImportError], errors => {
    if (errors.some(Boolean)) {
        openFileTab();
    }
});

/**
 * Import analysis passed when navigating to Hexplorer, e.g a puzzle.
 * Removed from history state once imported, to not import it again on reload.
 */
const importAnalysisFromHistoryState = async (): Promise<void> => {
    const analysis: unknown = history.state?.[HEXPLORER_ANALYSIS_STATE_KEY];

    if (typeof analysis !== 'string') {
        return;
    }

    history.replaceState({ ...history.state, [HEXPLORER_ANALYSIS_STATE_KEY]: undefined }, '');

    try {
        await importAnalysis(analysis);
    } catch (e) {
        analysisImportError.value = e instanceof Error ? e.message : String(e);
    }
};
</script>

<template>
    <div class="layout bg-body" :class="sidebarOpen ? 'sidebar-open' : 'sidebar-closed'">
        <div class="game">
            <div class="game-inner">
                <div class="left-analysis-bar" :class="{
                    'analysis-loading': analysisLoading,
                    'analysis-unavailable': !whiteWinAvailable,
                }">
                    <div class="advantage advantage-blue bg-primary"></div>
                    <div class="advantage advantage-red bg-danger"></div>
                </div>
                <div ref="game-view-element" class="game-view"></div>
            </div>

            <div class="bottom-menu">
                <HexplorerSetupTools v-if="!isLargeScreen" compact />

                <div class="btn-group" v-if="!state.setupMode">
                    <button
                        @click="goToParent()"
                        class="btn btn-outline-primary"
                        :title="$t('hexplorer.go_back')"
                    ><IconChevronLeft /></button>

                    <button
                        @click="goToFirstChild()"
                        class="btn btn-outline-primary"
                        :title="$t('hexplorer.go_forward')"
                    ><IconChevronRight /></button>

                    <button
                        @click="deleteCurrentNode()"
                        class="btn btn-outline-danger"
                        :disabled="!canDeleteCurrentNode"
                        :title="$t('hexplorer.delete_branch')"
                    ><IconTrash /></button>

                    <button
                        @click="pass()"
                        class="btn btn-outline-warning d-flex align-items-center gap-1"
                        :title="$t('hexplorer.pass_turn')"
                    ><IconArrowDownUp /> {{ $t('pass') }}</button>
                </div>

                <button
                    @click="state.currentPlayer = state.currentPlayer === 0 ? 1 : 0; updateAnalysis()"
                    class="btn d-flex align-items-center gap-2"
                    :class="state.currentPlayer === 0 ? 'btn-danger' : 'btn-primary'"
                    :title="$t('hexplorer.change_current_player')"
                >
                    <IconCircleFill />
                    {{ state.currentPlayer === 0 ? $t('game.red') : $t('game.blue') }}
                </button>

                <button type="button" class="btn btn-outline-primary open-sidebar-btn" @click="sidebarOpen = !sidebarOpen">
                    <IconArrowBarLeft v-if="!sidebarOpen" />
                    <IconArrowBarRight v-else />
                </button>
            </div>
        </div>

        <AppResizableSidebar
            v-if="sidebarOpen"
            :panels="navPanels"
            :active="currentTab"
            @select="tab => currentTab = tab"
        >
            <template #nav-header="{ collapsed }">
                <template v-if="!collapsed">
                    <h1 class="fs-4 fw-semibold text-truncate px-3 pt-2 mb-0">{{ $t('hexplorer.title') }}</h1>
                    <div
                        class="small fw-semibold text-truncate px-3"
                        :title="studyTitle || undefined"
                    >{{ studyTitle || $t('hexplorer.study_default_title') }}</div>
                </template>
            </template>

            <div class="flex-grow-1 overflow-auto p-3">
                <HexplorerFileTab v-if="currentTab === 'file'" :importError="analysisImportError" />
                <HexplorerHelpTab v-else-if="currentTab === 'help'" @dismiss="currentTab = 'tree'" />
                <HexplorerTreeTab v-else :analyzers />
            </div>

            <template #footer>
                <button
                    type="button"
                    class="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                    @click="sidebarOpen = false"
                ><IconArrowBarRight /> {{ $t('close') }}</button>
            </template>
        </AppResizableSidebar>
    </div>
</template>

<style lang="stylus" scoped>
.layout
    display flex
    position relative
    height calc(100vh - 3rem) // (fallback if dvh is not supported)
    height calc(100dvh - 3rem) // 3rem = header height

    .game
        flex 1 1 0
        min-width 0
        height 100%
        display flex
        flex-direction column

        .game-inner
            display flex
            flex 1
            min-height 0

        .left-analysis-bar
            display block
            width 1rem
            height 100%
            opacity 1
            transition-property opacity
            transition-duration 200ms

            &.analysis-loading
                opacity 0.3

            .advantage
                display flex
                width 1rem
                transition-property height
                transition-duration 200ms

            .advantage-red
                height v-bind(redBarHeightCss)

            .advantage-blue
                height v-bind(blueBarHeightCss)

            &.analysis-unavailable
                .advantage
                    background-color #888 !important

        .game-view
            width calc(100% - 1rem)
            height 100%

.bottom-menu
    flex-shrink 0
    display flex
    flex-wrap wrap
    justify-content center
    gap 0.25em
    align-items center
    position relative
    padding 0.25rem 3.5rem 0.25rem 0.5rem

    .open-sidebar-btn
        position absolute
        top 0
        bottom 0
        right 0
        margin-inline-end 0.75em
</style>
