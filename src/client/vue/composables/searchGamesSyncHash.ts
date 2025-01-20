import qs from 'qs';
import { Ref, watchEffect } from 'vue';
import SearchGamesParameters from '../../../shared/app/SearchGamesParameters';
import { plainToInstance } from '../../../shared/app/class-transformer-custom';

/**
 * On page load, set searchGamesParameters values to the ones in url hash if defined.
 * Then update url hash when changing searchGamesParameters values.
 */
export const useSearchGamesSyncHash = (searchGamesParameters: Ref<SearchGamesParameters>) => {

    // Set parameters from url hash if set
    // Must also replace default parameters from above because when using "Any" filter, undefined won't replace default parameter
    if ('' !== window.location.hash) {
        searchGamesParameters.value = plainToInstance(SearchGamesParameters, qs.parse(window.location.hash.substring(1)));
    }

    // Update hash when changing filters
    watchEffect(() => {
        history.replaceState(undefined, '', '#' + qs.stringify(searchGamesParameters.value));
    });
};
