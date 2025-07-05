<script setup lang="ts">
import { toRefs } from 'vue';
import { BIconRecordFill, BIconTrophy } from 'bootstrap-icons-vue';
import { Tournament } from '../../../../shared/app/models';

const props = defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const { tournament } = toRefs(props);

const started = (): boolean => {
    return 'running' === tournament.value.state;
};
</script>

<template>
    <div class="card card-bg-icon border-warning mb-4">
        <BIconTrophy class="bg-trophy text-warning" />
        <div class="card-body">
            <h6 class="card-subtitle text-body-secondary">{{ $t('tournament') }}</h6>
            <h4 class="card-title">{{ tournament.title }}</h4>

            <router-link
                :to="{ name: 'tournament', params: { slug: tournament.slug } }"
                class="stretched-link"
            >
                <template v-if="!started()">
                    Upcoming
                </template>
                <template v-else>
                    <BIconRecordFill class="text-danger me-1" />
                    <span class="lead">{{ $t('now!') }}</span>
                </template>
            </router-link>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.bg-trophy
    top 1rem
    right 0.5rem
    font-size 8rem
</style>
