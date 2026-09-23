<script setup lang="ts">
import { PropType } from 'vue';
import { formatDistanceToNowStrict } from 'date-fns';
import { LadderReign } from '../../../../shared/app/models/index.js';
import AppPseudo from '../../components/AppPseudo.vue';
import { IconCrown } from '../../icons.js';

defineProps({
    currentReign: {
        type: Object as PropType<null | LadderReign>,
        default: null,
    },
});
</script>

<template>
    <div class="card border-warning mb-3">
        <div class="card-body d-flex align-items-center gap-3">
            <IconCrown class="text-warning fs-1" />

            <div v-if="currentReign">
                <small class="text-secondary">{{ $t('ladder.king') }}</small>
                <h3 class="m-0"><AppPseudo :player="currentReign.player" flag /></h3>
                <p class="m-0">
                    {{ $t('ladder.king_for', { duration: formatDistanceToNowStrict(currentReign.startedAt) }) }}
                    <span v-if="currentReign.defenses > 0" class="ms-2 text-secondary">· {{ $t('ladder.hall.defenses', { count: currentReign.defenses }) }}</span>
                </p>
            </div>

            <p v-else class="m-0 lead">{{ $t('ladder.no_king') }}</p>
        </div>
    </div>
</template>
