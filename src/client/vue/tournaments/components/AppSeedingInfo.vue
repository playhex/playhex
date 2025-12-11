<script setup lang="ts">
import { Tournament } from '../../../../shared/app/models/index.js';

defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});
</script>

<template>
    {{ $t('tournament_seeding_methods.title') }} <strong>{{ $t('tournament_seeding_methods.' + tournament.seedingMethod) }}</strong>
    <br>
    <small class="text-body-secondary">{{ $t('tournament_seeding_methods.' + tournament.seedingMethod + '_help') }}</small>
</template>
