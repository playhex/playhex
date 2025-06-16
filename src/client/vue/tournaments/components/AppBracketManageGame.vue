<script setup lang="ts">
import { ref, toRefs } from 'vue';
import { Tournament, TournamentGame } from '../../../../shared/app/models';
import { BIconCaretDownFill, BIconCaretRight } from 'bootstrap-icons-vue';
import { apiPostForfeitTournamentGamePlayer, apiPostResetAndRecreateGame } from '../../../apiClient';

const props = defineProps({
    tournamentGame: {
        type: TournamentGame,
        required: true,
    },
    tournament: {
        type: Tournament,
        required: true,
    },
});

const { tournamentGame } = toRefs(props);
const showManage = ref(false);
</script>

<template>
    <div>
        <button
            v-if="'running' === tournament.state"
            @click="showManage = !showManage"
            class="btn btn-outline-primary btn-sm manage-button"
        >
            <BIconCaretDownFill v-if="showManage" />
            <BIconCaretRight v-else />
            Manage
        </button>

        <template v-if="showManage && 'running' === tournament.state && tournamentGame.hostedGame">
            <button
                v-if="tournamentGame.player1"
                @click="apiPostForfeitTournamentGamePlayer(tournament.slug, tournamentGame.hostedGame.publicId, tournamentGame.player1)"
                :disabled="'playing' !== tournamentGame.state"
                class="btn btn-outline-warning mt-1"
            >Forfeit {{ tournamentGame.player1.pseudo }}</button>
            <button
                v-if="tournamentGame.player2"
                @click="apiPostForfeitTournamentGamePlayer(tournament.slug, tournamentGame.hostedGame.publicId, tournamentGame.player2)"
                :disabled="'playing' !== tournamentGame.state"
                class="btn btn-outline-warning mt-1"
            >Forfeit {{ tournamentGame.player2.pseudo }}</button>

            <button
                @click="apiPostResetAndRecreateGame(tournament.slug, tournamentGame.hostedGame.publicId)"
                :disabled="'done' !== tournamentGame.state"
                class="btn btn-outline-danger mt-1"
            >Reset and recreate</button>
        </template>
    </div>
</template>

<style lang="stylus" scoped>
.manage-button
    float right
</style>
