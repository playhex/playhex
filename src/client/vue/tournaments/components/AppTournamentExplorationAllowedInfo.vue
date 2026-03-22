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
    <p>{{ $t('allow_exploration') }}
        <strong v-if="tournament.explorationAllowed">{{ $t('yes') }}</strong>
        <strong v-else>{{ $t('no') }}</strong>
    </p>
</template>
