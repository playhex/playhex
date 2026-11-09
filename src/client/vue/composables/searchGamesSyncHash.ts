import qs from 'qs';
import { Ref, watchEffect } from 'vue';
import SearchGamesParameters, { GameType } from '../../../shared/app/SearchGamesParameters.js';
import { plainToInstance } from '../../../shared/app/class-transformer-custom.js';

/**
 * On page load, set searchGamesParameters values to the ones in url hash if defined.
 * Then update url hash when changing searchGamesParameters values.
 */
/**
 * Old urls used ranked and opponentType filters, convert them to gameTypes.
 * Done on raw parsed hash, where booleans are still 'true' or 'false' strings.
 */
const convertLegacyGameTypes = (plain: Record<string, unknown>): void => {
    const { ranked, opponentType } = plain;

    delete plain.ranked;
    delete plain.opponentType;

    if (undefined !== plain.gameTypes) {
        return;
    }

    let types: undefined | GameType[];

    if (opponentType === 'ai') {
        types = ['ai'];
    } else if (ranked === undefined) {
        types = opponentType === 'player' ? ['ranked', 'friendly'] : undefined;
    } else if (ranked === 'true') {
        types = ['ranked'];
    } else {
        types = opponentType === 'player' ? ['friendly'] : ['friendly', 'ai'];
    }

    plain.gameTypes = types;
};

export const useSearchGamesSyncHash = (searchGamesParameters: Ref<SearchGamesParameters>) => {

    // Set parameters from url hash if set
    // Must also replace default parameters from above because when using "Any" filter, undefined won't replace default parameter
    if (window.location.hash !== '') {
        const plain = qs.parse(window.location.hash.substring(1));

        convertLegacyGameTypes(plain);

        searchGamesParameters.value = plainToInstance(SearchGamesParameters, plain);
    }

    // Update hash when changing filters.
    // Keep vue-router state, and update its "current" url: else, when clicking a game,
    // vue-router replaces this history entry with its old url without hash, and filters are lost when going back.
    watchEffect(() => {
        const url = window.location.pathname + window.location.search + '#' + qs.stringify(searchGamesParameters.value);

        history.replaceState({ ...history.state, current: url }, '', url);
    });
};
