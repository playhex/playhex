<script setup lang="ts">
import { ref } from 'vue';
import { Tournament } from '../../../../shared/app/models';

const tournament = ref(new Tournament());

const createTournament = (): void => {
    console.log(tournament.value);
};
</script>

<template>
    <div class="container-fluid my-3">
        <h1>Host Tournament</h1>

        <form @submit.prevent="createTournament">
            <div class="mb-3">
                <label for="name" class="form-label">Tournament name</label>
                <input type="text" class="form-control" id="name" v-model="tournament.title">
            </div>

            <div class="mb-3">
                <label for="startDate" class="form-label">Start date</label>
                <input type="datetime-local" class="form-control" id="startDate" v-model="tournament.startsAt">
            </div>

            <div class="mb-3">
                <label for="checkInAt" class="form-label">Check-in Opens</label>
                <input type="datetime-local" class="form-control" id="checkInAt" v-model="tournament.checkInAt">
            </div>

            <div class="mb-3">
                <label for="boardsize" class="form-label">Board size</label>
                <input type="number" class="form-control" id="boardsize" v-model="tournament.boardsize" min="9" max="19">
            </div>

            <button type="submit" class="btn btn-primary">Create</button>
        </form>
    </div>
</template>
