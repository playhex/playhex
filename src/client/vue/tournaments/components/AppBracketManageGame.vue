<script setup lang="ts">
import { ref, toRefs } from 'vue';
import { Tournament, TournamentMatch } from '../../../../shared/app/models';
import { BIconCaretDownFill, BIconCaretRight } from 'bootstrap-icons-vue';
import { apiPostForfeitTournamentMatchPlayer, apiPostResetAndRecreateGame } from '../../../apiClient';

const props = defineProps({
    tournamentMatch: {
        type: TournamentMatch,
        required: true,
    },
    tournament: {
        type: Tournament,
        required: true,
    },
});

const { tournamentMatch } = toRefs(props);
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

        <template v-if="showManage && 'running' === tournament.state && tournamentMatch.hostedGame">
            <button
                v-if="tournamentMatch.player1"
                @click="apiPostForfeitTournamentMatchPlayer(tournament.slug, tournamentMatch.hostedGame.publicId, tournamentMatch.player1)"
                :disabled="'playing' !== tournamentMatch.state"
                class="btn btn-outline-warning mt-1"
            >Forfeit {{ tournamentMatch.player1.pseudo }}</button>
            <button
                v-if="tournamentMatch.player2"
                @click="apiPostForfeitTournamentMatchPlayer(tournament.slug, tournamentMatch.hostedGame.publicId, tournamentMatch.player2)"
                :disabled="'playing' !== tournamentMatch.state"
                class="btn btn-outline-warning mt-1"
            >Forfeit {{ tournamentMatch.player2.pseudo }}</button>

            <button
                @click="apiPostResetAndRecreateGame(tournament.slug, tournamentMatch.hostedGame.publicId)"
                :disabled="'done' !== tournamentMatch.state"
                class="btn btn-outline-danger mt-1"
            >Reset and recreate</button>
        </template>
    </div>
</template>

<style lang="stylus" scoped>
.manage-button
    float right
</style>
