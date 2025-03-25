<script setup lang="ts">
import { computed } from 'vue';
import { apiPatchTournament, apiPostIterateTournament } from '../../../apiClient.js';
import { useTournamentFromUrl } from '../../composables/useTournamentFromUrl.js';

const {
    tournament,
    slug,
    iAmHost,
} = useTournamentFromUrl();

/**
 * Convert startAt Date to "datetime-local" input format (e.g "2025-04-01T22:00")
 */
const startsAtDatetimeLocal = computed<string>({
    get(): string
    {
        if (!tournament.value) {
            return '';
        }

        return tournament.value.startsAt.toLocaleString('sv').replace(' ', 'T').substring(0, 16);
    },

    set(newValue: string): void
    {
        if (!tournament.value) {
            return;
        }

        tournament.value.startsAt = new Date(newValue + ':00');
    },
});

const editTournament = async () => {
    if (!tournament.value) {
        return;
    }

    await apiPatchTournament(tournament.value);
};

const iterateTournament = async () => {
    await apiPostIterateTournament(slug);
};
</script>

<template>
    <div class="container my-3">
        <router-link
            v-if="iAmHost()"
            :to="{ name: 'tournament', params: { slug }}"
            class="btn btn-outline-primary float-end"
        >
            Back
        </router-link>

        <h1>Manage tournament <span v-if="tournament">{{ tournament.title }}</span></h1>

        <template v-if="tournament && 'created' === tournament.state">
            <h2>Edit</h2>

            <p v-if="false === iAmHost()" class="text-warning">Tournament can be edited by host only.</p>

            <form v-if="tournament" @submit.prevent="editTournament">
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
                    <label for="startDate" class="form-label">Start date</label>
                    <input
                        type="datetime-local"
                        class="form-control form-control-lg"
                        id="startDate"
                        v-model="startsAtDatetimeLocal"
                    >
                </div>

                <button type="submit" class="btn btn-success">Submit modifications</button>
            </form>
        </template>

        <template v-if="tournament && 'ended' !== tournament.state">
            <p>In case tournament seems stuck (next games not starting), this button should fix it by checking whole tournament state:</p>

            <button @click="iterateTournament" class="btn btn-warning">Progress now</button>
        </template>
    </div>
</template>
