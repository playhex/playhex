<script setup lang="ts">
import AppPseudo from '../../components/AppPseudo.vue';
import { Tournament } from '../../../../shared/app/models';

defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});
</script>

<template>
    <p>
        <small>
            <i18next :translation="$t('tournament_organized_by')">
                <template #player>
                    <AppPseudo :player="tournament.organizer" is="strong" />
                </template>
            </i18next>
        </small>

        <small v-if="tournament.admins.length > 0">
            <br>
            <i18next :translation="$t('admins', { count: tournament.admins.length })">
                <template #players>
                    <ul class="list-inline d-inline">
                        <li v-for="admin in tournament.admins" class="list-inline-item"><AppPseudo :player="admin.player" is="strong" /></li>
                    </ul>
                </template>
            </i18next>
        </small>
    </p>
</template>
