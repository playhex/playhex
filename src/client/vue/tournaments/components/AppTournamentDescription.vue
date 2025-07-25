<script setup lang="ts">
import markdownit from 'markdown-it';
import { Tournament } from '../../../../shared/app/models';

defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const md = markdownit({
    linkify: true,
    breaks: true,
});
</script>

<template>
    <h2>{{ $t('tournament_description') }}</h2>

    <div v-if="tournament.description" v-html="md.render(tournament.description)">
    </div>

    <p v-else class="text-body-secondary">
        <i>No description.</i>
    </p>
</template>
