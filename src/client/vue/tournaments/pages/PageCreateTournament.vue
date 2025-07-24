<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { apiPostTournament } from '../../../apiClient';
import { useRouter } from 'vue-router';
import { DomainHttpError } from '../../../../shared/app/DomainHttpError';
import i18next from 'i18next';
import { createTournamentDefaultsCreate } from '../../../../shared/app/models/Tournament';
import { useHead } from '@unhead/vue';
import AppTournamentForm from '../components/AppTournamentForm.vue';
import type { ComponentExposed } from 'vue-component-type-helpers';
import useToastsStore from '../../../stores/toastsStore';
import { Toast } from '../../../../shared/app/Toast';

const tournament = ref(createTournamentDefaultsCreate());

useHead({
    title: () => tournament.value.title ?? i18next.t('tournament_create'),
});

const router = useRouter();
const tournamentForm = useTemplateRef<ComponentExposed<typeof AppTournamentForm>>('tournamentForm');

// submit
const createTournament = async (): Promise<void> => {
    if (!tournamentForm.value) {
        throw new Error('Missing element with ref tournamentForm');
    }

    if (!await tournamentForm.value.validateTournament()) {
        return;
    }

    try {
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

        useToastsStore().addToast(new Toast(
            'Tournament created successfully.',
            {
                level: 'success',
            },
        ));
    } catch (e) {
        if (e instanceof DomainHttpError) {
            if (e.type === 'tournament_title_duplicate') {
                useToastsStore().addToast(new Toast(
                    i18next.t('tournament_title_duplicate'),
                    {
                        level: 'danger',
                    },
                ));

                window.scrollTo(0, 0);
                return;
            }
        }

        useToastsStore().addToast(new Toast(
            'Error while creating tournament',
            {
                level: 'danger',
            },
        ));

        throw e;
    }
};
</script>

<template>
    <div class="container my-3">
        <h1>Create Tournament</h1>

        <form @submit.prevent="createTournament">
            <AppTournamentForm :tournament ref="tournamentForm" />

            <button type="submit" class="btn btn-success">Create tournament</button>
        </form>
    </div>
</template>
