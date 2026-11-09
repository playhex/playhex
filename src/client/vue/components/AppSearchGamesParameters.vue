<script setup lang="ts">
import { PropType, toRefs, ref, computed, watch } from 'vue';
import SearchGamesParameters, { gameStates, gameTypes, GameType, gameTypeTranslationKeys, MOVES_COUNT_SLIDER_MAX, searchableOutcomes } from '../../../shared/app/SearchGamesParameters.js';
import { MAX_BOARDSIZE, MIN_BOARDSIZE } from '../../../shared/app/boardsizeLimits.js';
import { Player } from '../../../shared/app/models/index.js';
import { getPlayer } from '../../apiClient.js';
import { IconX } from '../icons.js';
import AppRangeSlider from './AppRangeSlider.vue';
import AppGameTypeIcon from './AppGameTypeIcon.vue';
import AppPlayerSelectMultiple from '../tournaments/components/AppPlayerSelectMultiple.vue';
import { t } from 'i18next';

const props = defineProps({
    searchGamesParameters: {
        type: Object as PropType<SearchGamesParameters>,
        required: true,
    },

    /**
     * Default filters, used to reset filters and count active filters.
     */
    defaults: {
        type: Object as PropType<SearchGamesParameters>,
        required: true,
    },

    /**
     * On a player page: this player is always the first player of searchGamesParameters.players,
     * and the players select only allows to choose an opponent.
     */
    lockedPlayer: {
        type: Object as PropType<null | Player>,
        required: false,
        default: null,
    },
});

const { searchGamesParameters } = toRefs(props);

/*
 * Checkboxes: all checked when no filter.
 */
const selectedGameTypes = computed<GameType[]>({
    get: () => searchGamesParameters.value.gameTypes ?? [...gameTypes],
    set: value => searchGamesParameters.value.gameTypes = value,
});

const selectedOutcomes = computed({
    get: () => searchGamesParameters.value.outcomes ?? [...searchableOutcomes],
    set: value => searchGamesParameters.value.outcomes = value.length === searchableOutcomes.length
        ? undefined
        : value,
});

/*
 * Sliders: full range means no filter.
 */
const boardsizeRange = computed<[number, number]>({
    get: () => [
        searchGamesParameters.value.minBoardsize ?? MIN_BOARDSIZE,
        searchGamesParameters.value.maxBoardsize ?? MAX_BOARDSIZE,
    ] as [number, number],
    set: ([min, max]) => {
        searchGamesParameters.value.minBoardsize = min <= MIN_BOARDSIZE ? undefined : min;
        searchGamesParameters.value.maxBoardsize = max >= MAX_BOARDSIZE ? undefined : max;
    },
});

const movesCountRange = computed<[number, number]>({
    get: () => [
        Math.min(searchGamesParameters.value.minMovesCount ?? 0, MOVES_COUNT_SLIDER_MAX),
        Math.min(searchGamesParameters.value.maxMovesCount ?? MOVES_COUNT_SLIDER_MAX, MOVES_COUNT_SLIDER_MAX),
    ] as [number, number],
    set: ([min, max]) => {
        searchGamesParameters.value.minMovesCount = min <= 0 ? undefined : min;
        searchGamesParameters.value.maxMovesCount = max >= MOVES_COUNT_SLIDER_MAX ? undefined : max;
    },
});

const formatMovesCount = (value: number): string => value >= MOVES_COUNT_SLIDER_MAX
    ? t('n_plus', { n: value })
    : String(value)
;

/*
 * Players
 */
const selectedPlayers = ref<Player[]>([]);
const knownPlayers = new Map<string, Player>();

/**
 * Player public ids selectable in the select, i.e all except locked player.
 */
const selectablePlayerIds = computed<string[]>(() => {
    const ids = (searchGamesParameters.value.players ?? [])
        .map(p => p.publicId)
        .filter((id): id is string => undefined !== id)
    ;

    return props.lockedPlayer ? ids.slice(1) : ids;
});

// Sync select from parameters (url hash, or set by parent page)
watch(
    () => selectablePlayerIds.value.join(','),
    async idsKey => {
        if (idsKey === selectedPlayers.value.map(p => p.publicId).join(',')) {
            return;
        }

        const players = await Promise.all(selectablePlayerIds.value.map(async id => knownPlayers.get(id) ?? await getPlayer(id)));

        // Parameters changed meanwhile
        if (idsKey !== selectablePlayerIds.value.join(',')) {
            return;
        }

        players.forEach(p => knownPlayers.set(p.publicId, p));
        selectedPlayers.value = players;
    },
    { immediate: true },
);

const onPlayersSelected = (players: Player[]): void => {
    players.forEach(p => knownPlayers.set(p.publicId, p));
    selectedPlayers.value = players;

    const criteria = players.map(p => ({ publicId: p.publicId }));

    if (props.lockedPlayer) {
        searchGamesParameters.value.players = [
            searchGamesParameters.value.players?.[0] ?? { publicId: props.lockedPlayer.publicId },
            ...criteria,
        ];
    } else {
        searchGamesParameters.value.players = criteria.length > 0 ? criteria : undefined;
    }
};

/*
 * Dates
 */
const resetDateRange = () => {
    searchGamesParameters.value.fromEndedAt = undefined;
    searchGamesParameters.value.toEndedAt = undefined;
    searchGamesParameters.value.endedAtSort = 'desc';
};

/**
 * Incomplete date (e.g. year not yet typed) is ignored and shown as invalid.
 * Class is toggled directly on element to not trigger a re-render, which would reset the input.
 */
const onDateInput = (event: Event, key: 'fromEndedAt' | 'toEndedAt') => {
    const input = event.target as HTMLInputElement;

    input.classList.toggle('is-invalid', input.validity.badInput);

    if (!input.validity.badInput) {
        searchGamesParameters.value[key] = input.valueAsDate ?? undefined;
    }
};

/*
 * Active filters count, and reset
 */
const filterKeys = [
    'gameTypes',
    'states',
    'outcomes',
    'minBoardsize',
    'maxBoardsize',
    'minMovesCount',
    'maxMovesCount',
    'fromEndedAt',
    'toEndedAt',
    'endedAtSort',
] as const satisfies (keyof SearchGamesParameters)[];

const normalize = (value: unknown): string => JSON.stringify(Array.isArray(value) ? [...value].sort() : value ?? null);

const isChanged = (key: typeof filterKeys[number]): boolean =>
    normalize(searchGamesParameters.value[key]) !== normalize(props.defaults[key]);

const activeFiltersCount = computed<number>(() => filterKeys.filter(isChanged).length
    + (selectablePlayerIds.value.length > 0 ? 1 : 0),
);

const resetFilters = () => {
    const params = searchGamesParameters.value;

    for (const key of filterKeys) {
        const defaultValue = props.defaults[key];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (params as any)[key] = Array.isArray(defaultValue) ? [...defaultValue] : defaultValue;
    }

    params.players = props.lockedPlayer
        ? [params.players?.[0] ?? { publicId: props.lockedPlayer.publicId }]
        : undefined
    ;
};

// Go back to first page when changing a filter
watch(
    () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { paginationPage, paginationPageSize, ...filters } = searchGamesParameters.value;
        return JSON.stringify(filters);
    },
    () => searchGamesParameters.value.paginationPage = 0,
);

/*
 * On small screens, only main filters are shown, others are collapsed.
 */
const showAllFilters = ref(false);

const collapsedFilterKeys = [
    'outcomes',
    'minBoardsize',
    'maxBoardsize',
    'minMovesCount',
    'maxMovesCount',
    'states',
] as const satisfies (typeof filterKeys[number])[];

const collapsedActiveFiltersCount = computed<number>(() => collapsedFilterKeys.filter(isChanged).length);
</script>

<template>
    <div class="search-games-parameters">
        <div class="d-flex align-items-center justify-content-between mb-2">
            <h2 class="h6 mb-0">
                {{ $t('filters') }}
                <span v-if="activeFiltersCount > 0" class="badge text-bg-primary ms-1">{{ activeFiltersCount }}</span>
            </h2>
            <button
                type="button"
                class="btn btn-sm btn-link px-0"
                :class="{ invisible: 0 === activeFiltersCount }"
                @click="resetFilters"
            >{{ $t('reset_filters') }}</button>
        </div>

        <fieldset class="mb-3 filter-checks">
            <legend class="small mb-1">{{ $t('game_type') }}</legend>
            <div v-for="gameType in gameTypes" :key="gameType" class="form-check">
                <input type="checkbox" v-model="selectedGameTypes" :value="gameType" class="form-check-input" :id="'game-type-' + gameType" autocomplete="off">
                <label class="form-check-label" :for="'game-type-' + gameType"><AppGameTypeIcon :gameType class="me-1" /> {{ $t(gameTypeTranslationKeys[gameType]) }}</label>
            </div>
        </fieldset>

        <div :class="{ 'd-none': !showAllFilters }" class="d-md-block">
            <fieldset class="mb-3 filter-checks">
                <legend class="small mb-1">{{ $t('game.issue') }}</legend>
                <div v-for="outcome in searchableOutcomes" :key="outcome" class="form-check">
                    <input type="checkbox" v-model="selectedOutcomes" :value="outcome" class="form-check-input" :id="'outcome-' + outcome" autocomplete="off">
                    <label class="form-check-label" :for="'outcome-' + outcome">{{ $t('game_outcome.' + outcome) }}</label>
                </div>
            </fieldset>

            <div class="mb-3">
                <AppRangeSlider
                    v-model="boardsizeRange"
                    :min="MIN_BOARDSIZE"
                    :max="MAX_BOARDSIZE"
                    :label="$t('game.size')"
                />
            </div>

            <div class="mb-3">
                <AppRangeSlider
                    v-model="movesCountRange"
                    :min="0"
                    :max="MOVES_COUNT_SLIDER_MAX"
                    :label="$t('game.moves_count')"
                    :formatValue="formatMovesCount"
                />
            </div>
        </div>

        <div class="mb-3">
            <label class="form-label small mb-1">{{ $t(lockedPlayer ? 'search_opponent' : 'opponent_or_players') }}</label>
            <AppPlayerSelectMultiple
                :modelValue="selectedPlayers"
                @update:modelValue="onPlayersSelected"
                :max="lockedPlayer ? 1 : 2"
                :placeholder="$t(lockedPlayer ? 'search_opponent' : 'opponent_or_players')"
            />
            <div v-if="!lockedPlayer" class="form-text">{{ $t('one_or_two_players_help') }}</div>
        </div>

        <div class="mb-2">
            <div class="d-flex align-items-center gap-1 mb-2">
                <div class="flex-grow-1 d-flex flex-column gap-1">
                    <input
                        type="date"
                        class="form-control form-control-sm"
                        :value="searchGamesParameters.fromEndedAt?.toISOString().slice(0,10) ?? ''"
                        @input="onDateInput($event, 'fromEndedAt')"
                    />
                    <input
                        type="date"
                        class="form-control form-control-sm"
                        :value="searchGamesParameters.toEndedAt?.toISOString().slice(0,10) ?? ''"
                        @input="onDateInput($event, 'toEndedAt')"
                    />
                </div>
                <button class="btn btn-sm btn-outline-danger" @click="resetDateRange" :aria-label="$t('reset_dates')"><IconX /></button>
            </div>

            <div class="filter-checks">
                <div class="form-check">
                    <input type="radio" v-model="searchGamesParameters.endedAtSort" value="desc" class="form-check-input" id="sort-desc" autocomplete="off">
                    <label class="form-check-label" for="sort-desc">{{ $t('sort_date.desc') }}</label>
                </div>
                <div class="form-check">
                    <input type="radio" v-model="searchGamesParameters.endedAtSort" value="asc" class="form-check-input" id="sort-asc" autocomplete="off">
                    <label class="form-check-label" for="sort-asc">{{ $t('sort_date.asc') }}</label>
                </div>
            </div>
        </div>

        <div :class="{ 'd-none': !showAllFilters }" class="d-md-block">
            <fieldset class="mb-3 filter-checks">
                <legend class="small mb-1">{{ $t('game_state_filter') }}</legend>
                <div v-for="gameState in gameStates" :key="gameState" class="form-check">
                    <input type="checkbox" v-model="searchGamesParameters.states" :value="gameState" class="form-check-input" :id="'states-' + gameState" autocomplete="off">
                    <label class="form-check-label" :for="'states-' + gameState">{{ $t('game_state.' + gameState) }}</label>
                </div>
            </fieldset>
        </div>

        <button
            type="button"
            class="btn btn-sm btn-outline-secondary w-100 mb-3 d-md-none"
            @click="showAllFilters = !showAllFilters"
            :aria-expanded="showAllFilters"
        >
            {{ $t(showAllFilters ? 'hide_filters' : 'show_all_filters') }}
            <span v-if="!showAllFilters && collapsedActiveFiltersCount > 0" class="badge text-bg-primary ms-1">{{ collapsedActiveFiltersCount }}</span>
        </button>
    </div>
</template>

<style lang="stylus" scoped>
legend
    font-size .875rem

// Checkboxes on a same line on small screens
@media (max-width: 767.98px)
    .filter-checks .form-check
        display inline-block
        margin-right 1rem
</style>
