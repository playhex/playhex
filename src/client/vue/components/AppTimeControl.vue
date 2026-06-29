<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { t } from 'i18next';
import { defineOverlay } from '@overlastic/vue';
import { IconCalendar, IconLightningChargeFill, IconPencilSquare, IconSave2 } from '../icons.js';
import { DAY_MS, TimeControlCadency, correspondenceInitialTimeSteps, correspondenceSecondaryTimeSteps, defaultTimeControlTypes, getInitialTimeStep, getSecondaryTimeStep, isSameTimeControlType, liveInitialTimeSteps, liveSecondaryTimeSteps, msToDuration, timeControlToString } from '../../../shared/app/timeControlUtils.js';
import TimeControlType from '../../../shared/time-control/TimeControlType.js';
import useLobbyStore from '../../stores/lobbyStore.js';
import usePlayerFavoriteTimeControlsStore from '../../stores/playerFavoriteTimeControlsStore.js';
import useAuthStore from '../../stores/authStore.js';
import { storeToRefs } from 'pinia';
import EditFavoriteTimeControlsOverlay from './overlay/EditFavoriteTimeControlsOverlay.vue';

const timeControlType = defineModel<TimeControlType>({
    required: true,
});

const { currentLobby } = storeToRefs(useLobbyStore());
const { loggedInPlayer } = storeToRefs(useAuthStore());

const playerFavoriteStore = usePlayerFavoriteTimeControlsStore();
const { favoriteTimeControls, lastCustomLive, lastCustomCorrespondence } = storeToRefs(playerFavoriteStore);
const { getBaseForCadency, saveFavoriteTimeControl, replaceFavoriteTimeControls } = playerFavoriteStore;

const editFavoriteTimeControlsOverlay = defineOverlay(EditFavoriteTimeControlsOverlay);

const currentInitialTimeSteps = computed(() =>
    currentLobby.value === 'live' ? liveInitialTimeSteps : correspondenceInitialTimeSteps,
);

const currentSecondaryTimeSteps = computed(() =>
    currentLobby.value === 'live' ? liveSecondaryTimeSteps : correspondenceSecondaryTimeSteps,
);

const suggestedTimeControls = computed((): { label: string, timeControl: TimeControlType }[] => {
    const last = currentLobby.value === 'live' ? lastCustomLive.value : lastCustomCorrespondence.value;

    return favoriteTimeControls.value
        .filter(f => f.cadency === currentLobby.value)
        .map(f => {
            const isLast = last !== null && isSameTimeControlType(f.timeControlType, last.timeControlType);
            const base = f.name ?? timeControlToString(f.timeControlType);
            return {
                label: isLast ? `${base} (${t('time_control.last')})` : base,
                timeControl: f.timeControlType,
            };
        })
    ;
});

const customTimeControl = ref<null | { label: string, timeControl: TimeControlType }>(null);

const capped = ref(false);

const setCappedFromTimeControl = (timeControlType: TimeControlType): void => {
    if (timeControlType.family === 'fischer') {
        const { maxTime, initialTime } = timeControlType.options;

        capped.value = maxTime === initialTime;
    }
};

setCappedFromTimeControl(timeControlType.value);

const initialTimeStep = ref(getInitialTimeStep(timeControlType.value, currentInitialTimeSteps.value));
const secondaryTimeStep = ref(getSecondaryTimeStep(timeControlType.value, currentSecondaryTimeSteps.value));

const selectTimeControl = (timeControl: TimeControlType): void => {
    timeControlType.value = {
        family: timeControl.family,
        options: {
            ...timeControl.options,
        },
    } as TimeControlType;

    setCappedFromTimeControl(timeControl);

    initialTimeStep.value = getInitialTimeStep(timeControl, currentInitialTimeSteps.value);
    secondaryTimeStep.value = getSecondaryTimeStep(timeControl, currentSecondaryTimeSteps.value);
};

const changeCadence = (newCadence: TimeControlCadency): void => {
    currentLobby.value = newCadence;
};

// On mount: pre-select last custom if any, otherwise ensure TC matches current cadency
const initialLast = currentLobby.value === 'live' ? lastCustomLive.value : lastCustomCorrespondence.value;
if (initialLast !== null) {
    selectTimeControl(initialLast.timeControlType);
} else {
    const currentIsLive = timeControlType.value.options.initialTime < DAY_MS;
    if (currentLobby.value === 'live' && !currentIsLive) {
        selectTimeControl(defaultTimeControlTypes.normal);
    } else if (currentLobby.value === 'correspondence' && currentIsLive) {
        selectTimeControl(defaultTimeControlTypes.correspondenceNormal);
    }
}

// When cadency changes and TC doesn't match, switch to last custom or default
watch(currentLobby, lobby => {
    const currentIsLive = timeControlType.value.options.initialTime < DAY_MS;

    if (lobby === 'live' && !currentIsLive) {
        selectTimeControl(lastCustomLive.value?.timeControlType ?? defaultTimeControlTypes.normal);
    } else if (lobby === 'correspondence' && currentIsLive) {
        selectTimeControl(lastCustomCorrespondence.value?.timeControlType ?? defaultTimeControlTypes.correspondenceNormal);
    }
});

// track custom time control: update when sliders produce a non-preset value, freeze otherwise
watch(timeControlType, tc => {
    if (suggestedTimeControls.value.some(({ timeControl }) => isSameTimeControlType(tc, timeControl))) {
        return;
    }

    customTimeControl.value = {
        label: timeControlToString(tc),
        timeControl: { family: tc.family, options: { ...tc.options } } as TimeControlType,
    };
});

// update initialTime when sliding
watch(initialTimeStep, step => {
    timeControlType.value.options.initialTime = currentInitialTimeSteps.value[step];
    timeControlType.value = {
        ...timeControlType.value,
    };

    if (timeControlType.value.family === 'fischer' && capped.value) {
        timeControlType.value.options.maxTime = timeControlType.value.options.initialTime;
    }
});

// update secondary time when sliding
watch(secondaryTimeStep, step => {
    if (timeControlType.value.family === 'fischer') {
        timeControlType.value.options.timeIncrement = currentSecondaryTimeSteps.value[step];
    }

    timeControlType.value = {
        ...timeControlType.value,
    };
});

// set/unset maxTime when checking capped
watch(capped, isCapped => {
    if (timeControlType.value.family !== 'fischer') {
        return;
    }

    timeControlType.value.options.maxTime = isCapped
        ? timeControlType.value.options.initialTime
        : undefined
    ;
});

// clear customTimeControl if it's now part of the saved favorites (e.g. after saving)
watch(suggestedTimeControls, (suggested) => {
    if (customTimeControl.value !== null && suggested.some(({ timeControl }) => isSameTimeControlType(customTimeControl.value!.timeControl, timeControl))) {
        customTimeControl.value = null;
    }
});

const isSaving = ref(false);

const handleSave = async (): Promise<void> => {
    if (customTimeControl.value === null || isSaving.value) {
        return;
    }

    isSaving.value = true;

    try {
        await saveFavoriteTimeControl(currentLobby.value, customTimeControl.value.timeControl);
    } finally {
        isSaving.value = false;
    }
};

const handleEdit = async (): Promise<void> => {
    const cadency = currentLobby.value;

    try {
        const updated = await editFavoriteTimeControlsOverlay({ favorites: getBaseForCadency(cadency) });
        await replaceFavoriteTimeControls(cadency, updated);
    } catch {
        // overlay cancelled
    }
};
</script>

<template>
    <!-- Live / Correspondence toggle -->
    <ul class="nav nav-underline mb-2">
        <li class="nav-item">
            <button type="button" @click="changeCadence('live')" :class="currentLobby === 'live' ? 'active text-success' : 'text-body'" class="nav-link">
                <IconLightningChargeFill />
                {{ $t('time_cadency.normal') }}
            </button>
        </li>
        <li class="nav-item">
            <button type="button" @click="changeCadence('correspondence')" :class="currentLobby === 'correspondence' ? 'active text-warning' : 'text-body'" class="nav-link">
                <IconCalendar />
                {{ $t('time_cadency.correspondence') }}
            </button>
        </li>
    </ul>

    <!-- Preset buttons -->
    <button
        v-for="{ timeControl, label } in suggestedTimeControls" :key="label"
        @click="selectTimeControl(timeControl)"
        :class="isSameTimeControlType(timeControlType, timeControl)
            ? (currentLobby === 'live' ? 'btn-success' : 'btn-warning')
            : (currentLobby === 'live' ? 'btn-outline-success' : 'btn-outline-warning')"
        class="btn btn-sm me-2 mb-2"
        type="button"
    >{{ label }}</button>

    <!-- Custom time control button: shown when sliders produce a value not matching any preset -->
    <button
        v-if="customTimeControl !== null"
        @click="selectTimeControl(customTimeControl.timeControl)"
        :class="isSameTimeControlType(timeControlType, customTimeControl.timeControl)
            ? (currentLobby === 'live' ? 'btn-success' : 'btn-warning')
            : (currentLobby === 'live' ? 'btn-outline-success' : 'btn-outline-warning')"
        class="btn btn-sm me-2 mb-2"
        type="button"
    >{{ customTimeControl.label }}</button>

    <!-- Save / Edit preset buttons -->
    <div class="d-flex gap-2 mb-2">
        <button
            v-if="loggedInPlayer !== null && customTimeControl !== null"
            type="button"
            class="btn btn-sm btn-outline-primary"
            :disabled="isSaving"
            @click="handleSave()"
        ><IconSave2 /> {{ $t('save') }}</button>

        <button
            v-if="loggedInPlayer !== null"
            type="button"
            class="btn btn-sm btn-outline-secondary"
            @click="handleEdit()"
        ><IconPencilSquare /> {{ $t('time_control.edit_presets') }}</button>
    </div>

    <div class="mt-2">
        <!-- Initial time label -->
        <label for="custom-initial-time" class="form-label">
            {{ $t('2dots', { s: $t('time_control.initial_time') }) }}
            {{ msToDuration(currentInitialTimeSteps[initialTimeStep]) }}
        </label>

        <!-- Initial time slider -->
        <input
            v-model="initialTimeStep"
            type="range"
            min="0"
            :max="currentInitialTimeSteps.length - 1"
            step="1"
            class="form-range"
            id="custom-initial-time"
        >

        <!-- Time increment label -->
        <label for="custom-time-increment" class="form-label">
            {{ $t('2dots', { s: $t('time_control.time_increment') }) }}
            {{ msToDuration(currentSecondaryTimeSteps[secondaryTimeStep]) }}
        </label>

        <!-- Time increment slider -->
        <input
            v-model="secondaryTimeStep"
            type="range"
            class="form-range"
            id="custom-time-increment"
            min="0"
            :max="currentSecondaryTimeSteps.length - 1"
            step="1"
        >

        <!-- Fischer capped checkbox -->
        <div class="form-check">
            <input class="form-check-input" v-model="capped" type="checkbox" id="capped">
            <label class="form-check-label" for="capped">
                {{ $t('time_control.fischer_capped') }}
            </label>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
// Prevent scrolling when sliding a range input.
input[type=range]
    touch-action none
</style>
