<script setup lang="ts">
import { PropType, toRefs, ref } from 'vue';
import SearchGamesParameters, { gameStates } from '../../../shared/app/SearchGamesParameters.js';
import SearchPlayersParameters from '../../../shared/app/SearchPlayersParameters.js';
import { IconArrowRight, IconX } from '../icons';

const props = defineProps({
    searchGamesParameters: {
        type: Object as PropType<SearchGamesParameters>,
        required: true,
    },
});

const { searchGamesParameters } = toRefs(props);

const resetDateRange = () => {
    searchGamesParameters.value.fromEndedAt = undefined;
    searchGamesParameters.value.toEndedAt = undefined;
    searchGamesParameters.value.endedAtSort = 'desc';
};

const searchPlayersParameters = ref(new SearchPlayersParameters());

searchPlayersParameters.value.isBot = false;
searchPlayersParameters.value.isGuest = false;
</script>

<template>
    <div class="row">
        <div class="col-6 col-sm-4 col-md-2">
            <div class="form-check">
                <input type="radio" v-model="searchGamesParameters.ranked" :value="undefined" class="form-check-input" id="ranked-any" autocomplete="off">
                <label class="form-check-label" for="ranked-any">{{ $t('any') }}</label>
            </div>
            <div class="form-check">
                <input type="radio" v-model="searchGamesParameters.ranked" :value="true" class="form-check-input" id="ranked-yes" autocomplete="off">
                <label class="form-check-label" for="ranked-yes">{{ $t('ranked_games') }}</label>
            </div>
            <div class="form-check">
                <input type="radio" v-model="searchGamesParameters.ranked" :value="false" class="form-check-input" id="ranked-no" autocomplete="off">
                <label class="form-check-label" for="ranked-no">{{ $t('friendly_games') }}</label>
            </div>
        </div>

        <div class="col-6 col-sm-4 col-md-2">
            <div class="form-check">
                <input type="radio" v-model="searchGamesParameters.opponentType" :value="undefined" class="form-check-input" id="opponent-any" autocomplete="off">
                <label class="form-check-label" for="opponent-any">{{ $t('any') }}</label>
            </div>
            <div class="form-check">
                <input type="radio" v-model="searchGamesParameters.opponentType" value="player" class="form-check-input" id="opponent-player" autocomplete="off">
                <label class="form-check-label" for="opponent-player">{{ $t('1v1') }}</label>
            </div>
            <div class="form-check">
                <input type="radio" v-model="searchGamesParameters.opponentType" value="ai" class="form-check-input" id="opponent-ai" autocomplete="off">
                <label class="form-check-label" for="opponent-ai">{{ $t('bot_games') }}</label>
            </div>
        </div>

        <div class="col-12 col-sm-4 col-md-2">
            <div v-for="gameState in gameStates" :key="gameState" class="form-check">
                <input type="checkbox" v-model="searchGamesParameters.states" :value="gameState" class="form-check-input" :id="'states-' + gameState" autocomplete="off">
                <label class="form-check-label" :for="'states-' + gameState">{{ $t('game_state.' + gameState) }}</label>
            </div>
        </div>

        <div class="col-12 col-md-6">
            <div class="input-group mb-3">
                <input
                    type="date"
                    class="form-control"
                    :value="searchGamesParameters.fromEndedAt?.toISOString().slice(0,10) ?? ''"
                    @input="searchGamesParameters.fromEndedAt = new Date(($event.target as HTMLInputElement).value)"
                />
                <span class="input-group-text"><IconArrowRight /></span>
                <input
                    type="date"
                    class="form-control"
                    :value="searchGamesParameters.toEndedAt?.toISOString().slice(0,10) ?? ''"
                    @input="searchGamesParameters.toEndedAt = new Date(($event.target as HTMLInputElement).value)"
                />
                <button class="btn btn-sm btn-outline-danger" @click="resetDateRange"><IconX /></button>
            </div>

            <div class="form-check">
                <input type="radio" v-model="searchGamesParameters.endedAtSort" value="desc" class="form-check-input" id="sort-asc" autocomplete="off">
                <label class="form-check-label" for="sort-asc">{{ $t('sort_date.desc') }}</label>
            </div>
            <div class="form-check">
                <input type="radio" v-model="searchGamesParameters.endedAtSort" value="asc" class="form-check-input" id="sort-desc" autocomplete="off">
                <label class="form-check-label" for="sort-desc">{{ $t('sort_date.asc') }}</label>
            </div>
        </div>
    </div>
</template>
