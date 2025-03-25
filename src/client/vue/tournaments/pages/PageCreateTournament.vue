<script setup lang="ts">
import { computed, ref } from 'vue';
import { TournamentCreateDTO } from '../../../../shared/app/models';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../../../../shared/app/ratingUtils';
import { TournamentFormatStage1 } from '../../../../shared/app/tournamentUtils';
import { apiPostTournament } from '../../../apiClient';
import AppTimeControl from '../components/AppTimeControl.vue';
import { useRouter } from 'vue-router';

const tournament = ref(new TournamentCreateDTO());

// By default, make tournament starts at 20h
tournament.value.startsAt = new Date();
tournament.value.startsAt.setHours(20, 0, 0, 0);

if (tournament.value.startsAt < new Date()) {
    tournament.value.startsAt.setDate(tournament.value.startsAt.getDate() + 1);
}

const stage1Formats: {
    value: TournamentFormatStage1;
    label: string;
    image?: string;
}[] = [
    {
        value: 'single-elimination',
        label: 'Single elimination',
        image: '/images/tournament/single.svg',
    },
    {
        value: 'double-elimination',
        label: 'Double elimination',
        image: '/images/tournament/double.svg',
    },
    {
        value: 'swiss',
        label: 'Swiss',
        image: '/images/tournament/swiss.svg',
    },
    {
        value: 'round-robin',
        label: 'Round robin',
        image: '/images/tournament/round-robin.svg',
    },
];

/**
 * Convert startAt Date to "datetime-local" input format (e.g "2025-04-01T22:00")
 */
const startsAtDatetimeLocal = computed<string>({
    get(): string
    {
        return tournament.value.startsAt.toLocaleString('sv').replace(' ', 'T').substring(0, 16);
    },

    set(newValue: string): void
    {
        tournament.value.startsAt = new Date(newValue + ':00');
    },
});

const checkInBefore = ref(15);
const checkInBeforeUnit = ref<'min' | 'hours'>('min');

const toggleCheckInUnit = () => {
    checkInBeforeUnit.value = 'min' === checkInBeforeUnit.value
        ? 'hours'
        : 'min'
    ;
};

const router = useRouter();

const createTournament = async (): Promise<void> => {
    tournament.value.checkInOpensBefore = checkInBefore.value * { min: 60000, hours: 3600000 }[checkInBeforeUnit.value];

    const created = await apiPostTournament(tournament.value);

    if (null === created) {
        throw new Error('Could not create tournament');
    }

    router.push({
        name: 'tournament',
        params: {
            slug: created.slug,
        },
    });
};
</script>

<template>
    <div class="container-fluid my-3">
        <h1>Host Tournament</h1>

        <form @submit.prevent="createTournament">
            <!-- TODO handle tournament name already exists -->
            <div class="mb-3">
                <label for="name" class="form-label">Tournament name</label>
                <input
                    v-model="tournament.title"
                    type="text"
                    class="form-control form-control-lg"
                    id="name"
                >
            </div>

            <div class="mb-3">
                <div class="row">
                    <div v-for="stage1Format in stage1Formats" :key="stage1Format.value" class="col-6 col-sm-3">
                        <input
                            type="radio"
                            class="btn-check"
                            v-model="tournament.stage1Format"
                            :value="stage1Format.value"
                            :id="'format-stage1-' + stage1Format.value"
                            autocomplete="off"
                        >
                        <label class="btn tournament-format-label" :for="'format-stage1-' + stage1Format.value">
                            <img
                                v-if="stage1Format.image"
                                :src="stage1Format.image"
                                :alt="stage1Format.label"
                                class="img-fluid"
                            />
                            <span>{{ stage1Format.label }}</span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="mb-3" v-if="'single-elimination' === tournament.stage1Format">
                <div class="form-check">
                    <input
                        v-model="tournament.consolation"
                        type="checkbox"
                        class="form-check-input"
                        id="tournament-consolation"
                    >
                    <label class="form-check-label" for="tournament-consolation">Consolation</label>
                    <div class="form-text mb-3">Add a loosers final to determine third place.</div>
                </div>
            </div>

            <div class="mb-3" v-if="'swiss' === tournament.stage1Format">
                <label for="max-players" class="form-label">Rounds</label>
                <input
                    v-model="tournament.stage1Rounds"
                    type="number"
                    class="form-control"
                    id="max-players"
                    min="0"
                >
                <div class="form-text mb-3">Custom number of rounds. Let empty to define number of rounds based on the number of players.</div>
            </div>

            <div class="mb-3">
                <label for="startDate" class="form-label">Start date</label>
                <input
                    type="datetime-local"
                    class="form-control form-control-lg"
                    id="startDate"
                    v-model="startsAtDatetimeLocal"
                >
            </div>

            <div class="row">
                <div class="col-sm-6 col-lg-4">
                    <label for="checkInAt" class="form-label">Check-in Opens</label>
                    <div class="input-group">
                        <input
                            type="number"
                            class="form-control"
                            id="checkInAt"
                            v-model="checkInBefore"
                        >
                        <button
                            @click="toggleCheckInUnit"
                            class="btn btn-outline-primary"
                            type="button"
                        >{{ { min: 'minutes before', hours: 'hours before' }[checkInBeforeUnit] }}</button>
                    </div>
                    <div class="form-text mb-3">Players will need to confirm their participation before tournament starts, within this time window.</div>
                </div>
            </div>

            <h3>Games format</h3>

            <div class="mb-3">
                <label for="boardsize" class="form-label">Board size</label>
                <input
                    v-model="tournament.boardsize"
                    :min="RANKED_BOARDSIZE_MIN"
                    :max="RANKED_BOARDSIZE_MAX"
                    type="number"
                    class="form-control form-control-lg"
                    id="boardsize"
                >
            </div>

            <div class="mb-3">
                <label class="form-label">Time control</label>
                <AppTimeControl :timeControl="tournament.timeControl" />
            </div>

            <div class="mb-3">
                <div class="form-check">
                    <input
                        v-model="tournament.ranked"
                        type="checkbox"
                        class="form-check-input"
                        id="tournament-ranked"
                    >
                    <label class="form-check-label" for="tournament-ranked">Ranked</label>
                </div>
            </div>

            <div class="mb-3">
                <label for="max-players" class="form-label">Max players</label>
                <input
                    v-model="tournament.maxPlayers"
                    type="number"
                    class="form-control"
                    id="max-players"
                    min="0"
                >
                <div class="form-text mb-3">Limit the number of participants. Let empty for no limit.</div>
            </div>

            <button type="submit" class="btn btn-primary">Create</button>
        </form>
    </div>
</template>

<style lang="stylus" scoped>
.tournament-format-label
    width 100%

    img
        height 12vw
        max-height 150px

    img + span
        display block
        margin-top 0.5em

[data-bs-theme=light]
    .tournament-format-label img
        filter invert(95%) sepia(11%) saturate(78%) hue-rotate(169deg) brightness(92%) contrast(99%)

[data-bs-theme=dark]
    .tournament-format-label img
        filter invert(12%) sepia(11%) saturate(78%) hue-rotate(169deg) brightness(97%) contrast(94%)
</style>
