import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, watch, type Ref } from 'vue';
import { type PlayerFavoriteTimeControl } from '../../shared/app/models/index.js';
import { DAY_MS, getDefaultFavoriteTimeControls, isSameTimeControlType, type TimeControlCadency } from '../../shared/app/timeControlUtils.js';
import type TimeControlType from '../../shared/time-control/TimeControlType.js';
import { apiGetPlayerFavoriteTimeControls, apiPutPlayerFavoriteTimeControls } from '../apiClient.js';
import useAuthStore from './authStore.js';

const LAST_CUSTOM_KEY_LIVE = 'hex-last-custom-time-control-live';
const LAST_CUSTOM_KEY_CORRESPONDENCE = 'hex-last-custom-time-control-correspondence';

type LastCustomTimeControl = { name: null, cadency: TimeControlCadency, timeControlType: TimeControlType };

const loadLastCustom = (key: string): null | LastCustomTimeControl => {
    const serialized = localStorage?.getItem(key);
    if (!serialized) return null;

    try {
        return JSON.parse(serialized) as LastCustomTimeControl;
    } catch {
        return null;
    }
};

const saveLastCustom = (key: string, value: null | LastCustomTimeControl): void => {
    if (value === null) {
        localStorage?.removeItem(key);
    } else {
        localStorage?.setItem(key, JSON.stringify(value));
    }
};

const usePlayerFavoriteTimeControlsStore = defineStore('playerFavoriteTimeControlsStore', () => {

    const { loggedInPlayer } = storeToRefs(useAuthStore());

    const loadedFavorites: Ref<null | PlayerFavoriteTimeControl[]> = ref(null);

    const reloadFavoriteTimeControls = async (): Promise<void> => {
        loadedFavorites.value = await apiGetPlayerFavoriteTimeControls();
    };

    watch(loggedInPlayer, async player => {
        loadedFavorites.value = null;

        if (player === null) {
            return;
        }

        await reloadFavoriteTimeControls();
    }, {
        immediate: true,
    });

    const lastCustomLive = ref<null | LastCustomTimeControl>(loadLastCustom(LAST_CUSTOM_KEY_LIVE));
    const lastCustomCorrespondence = ref<null | LastCustomTimeControl>(loadLastCustom(LAST_CUSTOM_KEY_CORRESPONDENCE));

    watch(lastCustomLive, value => saveLastCustom(LAST_CUSTOM_KEY_LIVE, value));
    watch(lastCustomCorrespondence, value => saveLastCustom(LAST_CUSTOM_KEY_CORRESPONDENCE, value));


    /**
     * Effective list: player's favorites (or defaults) + last custom TC if not already in the list.
     * Single source of truth, consumers never need to handle the fallback.
     */
    const favoriteTimeControls = computed(() => {
        const loaded = loadedFavorites.value;
        const defaults = getDefaultFavoriteTimeControls();

        const base = loaded === null ? defaults : [
            ...(['live', 'correspondence'] as TimeControlCadency[]).flatMap(cadency => {
                const fromLoaded = loaded.filter(f => f.cadency === cadency);
                return fromLoaded.length > 0 ? fromLoaded : defaults.filter(f => f.cadency === cadency);
            }),
        ];

        const extras: LastCustomTimeControl[] = [];

        for (const last of [lastCustomLive.value, lastCustomCorrespondence.value]) {
            if (last !== null && !base.some(f => isSameTimeControlType(f.timeControlType, last.timeControlType))) {
                extras.push(last);
            }
        }

        return extras.length > 0 ? [...base, ...extras] : base;
    });

    /**
     * Save a time control as the last custom preset used to create a game.
     * No-op if the TC is already a known preset.
     * Replaces the previous last custom if any.
     */
    const setLastCustomTimeControl = (timeControlType: TimeControlType): void => {
        const cadency: TimeControlCadency = timeControlType.options.initialTime >= DAY_MS ? 'correspondence' : 'live';

        const entry: LastCustomTimeControl = {
            name: null,
            cadency,
            timeControlType: {
                family: timeControlType.family,
                options: { ...timeControlType.options },
            } as TimeControlType,
        };

        if (cadency === 'live') {
            lastCustomLive.value = entry;
        } else {
            lastCustomCorrespondence.value = entry;
        }
    };

    const getBaseForCadency = (cadency: TimeControlCadency): PlayerFavoriteTimeControl[] => {
        const defaults = getDefaultFavoriteTimeControls().filter(f => f.cadency === cadency);
        const loaded = loadedFavorites.value;

        if (loaded === null) return defaults;

        const fromLoaded = loaded.filter(f => f.cadency === cadency);

        return fromLoaded.length > 0 ? fromLoaded : defaults;
    };

    const saveFavoriteTimeControl = async (cadency: TimeControlCadency, timeControlType: TimeControlType): Promise<void> => {
        const base = getBaseForCadency(cadency);

        await apiPutPlayerFavoriteTimeControls(cadency, [
            ...base,
            { name: null, cadency, timeControlType, order: base.length },
        ]);

        await reloadFavoriteTimeControls();
    };

    const replaceFavoriteTimeControls = async (cadency: TimeControlCadency, items: PlayerFavoriteTimeControl[]): Promise<void> => {
        await apiPutPlayerFavoriteTimeControls(cadency, items);
        await reloadFavoriteTimeControls();
    };

    return {
        favoriteTimeControls,
        loadedFavorites,
        lastCustomLive,
        lastCustomCorrespondence,
        setLastCustomTimeControl,
        reloadFavoriteTimeControls,
        getBaseForCadency,
        saveFavoriteTimeControl,
        replaceFavoriteTimeControls,
    };
});

export default usePlayerFavoriteTimeControlsStore;
