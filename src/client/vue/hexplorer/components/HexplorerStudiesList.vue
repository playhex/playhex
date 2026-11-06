<script setup lang="ts">
/*
 * Studies of current player, to open one of them.
 */
import { computed, inject, ref, shallowRef, watch } from 'vue';
import { formatDistanceToNowStrict } from 'date-fns';
import { apiGetHexplorerStudies } from '../../../apiClient.js';
import { apiErrorMessage } from '../../../services/apiErrorMessage.js';
import { useSearchGamesPagination } from '../../composables/searchGamesPagination.js';
import { hexplorerStudyKey } from '../composables/useHexplorerStudy.js';
import type { HexplorerStudy } from '../../../../shared/app/models/index.js';
import { HEXPLORER_STUDIES_PAGE_SIZE } from '../../../../shared/app/hexplorerStudy.js';
import type SearchHexplorerStudiesParameters from '../../../../shared/app/SearchHexplorerStudiesParameters.js';

const { study } = inject(hexplorerStudyKey)!;

const studies = shallowRef<HexplorerStudy[]>([]);
const count = ref<null | number>(null);
const error = ref<null | string>(null);
const parameters = ref<SearchHexplorerStudiesParameters>({
    sortBy: 'date',
    sortDirection: 'desc',
    paginationPage: 0,
});

const { totalPages, goPagePrevious, goPageNext } = useSearchGamesPagination(parameters, count, HEXPLORER_STUDIES_PAGE_SIZE);

// Only last request counts, responses may come back in another order
let lastRequest = 0;

const loadStudies = async (): Promise<void> => {
    const request = ++lastRequest;

    try {
        const { results, count: total } = await apiGetHexplorerStudies(parameters.value);

        if (request === lastRequest) {
            studies.value = results;
            count.value = total;
            error.value = null;
        }
    } catch (e) {
        if (request === lastRequest) {
            error.value = apiErrorMessage(e);
        }
    }
};

watch(parameters, () => void loadStudies(), { deep: true });

// Opened study changes when it is saved, forked or deleted
watch(study, () => void loadStudies(), { immediate: true });

type StudiesSort = Pick<SearchHexplorerStudiesParameters, 'sortBy' | 'sortDirection'>;

const sortOptions: { value: StudiesSort, label: string }[] = [
    { value: { sortBy: 'date', sortDirection: 'desc' }, label: 'hexplorer.study_sort_date_desc' },
    { value: { sortBy: 'date', sortDirection: 'asc' }, label: 'hexplorer.study_sort_date_asc' },
    { value: { sortBy: 'title', sortDirection: 'asc' }, label: 'hexplorer.study_sort_title_asc' },
    { value: { sortBy: 'title', sortDirection: 'desc' }, label: 'hexplorer.study_sort_title_desc' },
];

const sort = computed<StudiesSort>({
    get: () => ({
        sortBy: parameters.value.sortBy,
        sortDirection: parameters.value.sortDirection,
    }),
    set: value => parameters.value = { ...value, paginationPage: 0 },
});

const page = computed(() => parameters.value.paginationPage ?? 0);
</script>

<template>
    <p v-if="error" class="small text-danger mb-2">{{ error }}</p>

    <template v-if="count">
        <h6 class="mb-2">{{ $t('hexplorer.my_studies') }}</h6>

        <select
            v-model="sort"
            class="form-select form-select-sm mb-2"
            :aria-label="$t('hexplorer.study_sort')"
        >
            <option
                v-for="option in sortOptions"
                :key="option.label"
                :value="option.value"
            >{{ $t(option.label) }}</option>
        </select>

        <div class="list-group">
            <router-link
                v-for="myStudy in studies"
                :key="myStudy.publicId"
                :to="{ name: 'hexplorer', params: { publicId: myStudy.publicId } }"
                class="list-group-item list-group-item-action"
                :class="{ active: myStudy.publicId === study?.publicId }"
            >
                <div class="fw-semibold text-truncate">{{ myStudy.title || $t('hexplorer.study_default_title') }}</div>
                <small class="d-flex justify-content-between gap-2" :class="{ 'text-body-secondary': myStudy.publicId !== study?.publicId }">
                    <span class="text-truncate">{{ formatDistanceToNowStrict(myStudy.updatedAt, { addSuffix: true }) }}</span>
                    <span class="text-nowrap">{{ $t('hexplorer.study_nodes', { count: myStudy.nodesCount }) }}</span>
                </small>
            </router-link>
        </div>

        <div v-if="totalPages > 1" class="d-flex align-items-center justify-content-between gap-2 mt-2">
            <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                :disabled="page < 1"
                @click="goPagePrevious()"
            >{{ $t('previous') }}</button>
            <small>{{ $t('page_page_of_max', { page: page + 1, max: totalPages }) }}</small>
            <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                :disabled="page + 1 >= totalPages"
                @click="goPageNext()"
            >{{ $t('next') }}</button>
        </div>
    </template>
</template>
