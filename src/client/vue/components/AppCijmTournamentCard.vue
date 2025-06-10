<script setup lang="ts">
import { BIconChevronRight, BIconTrophy } from 'bootstrap-icons-vue';
import { formatDistanceStrict } from 'date-fns';

const saturday = new Date('2025-06-14T14:00:00+0200');
const saturdayEnd = new Date('2025-06-14T18:00:00+0200');
const sunday = new Date('2025-06-15T14:00:00+0200');
const sundayEnd = new Date('2025-06-15T18:00:00+0200');

const now = new Date();
</script>

<template>
    <div v-if="now < sundayEnd" class="card card-bg-icon border-salon-math mb-4">
        <BIconTrophy style="top: 0.5rem; right: -1rem; font-size: 5rem" class="text-salon-math" />
        <div class="card-body">
            <p class="m-0 lead">{{ $t('hex_tournament_paris.title') }}</p>

            <p class="m-0">
                <small>
                    <template v-if="now < saturday">
                        {{ formatDistanceStrict(saturday, now, {
                            addSuffix: true,
                        }) }}
                    </template>
                    <span v-else-if="now < saturdayEnd" class="text-warning">
                        {{ $t('now!') }}
                    </span>
                    <template v-else-if="now < sunday">
                        {{ formatDistanceStrict(sunday, now, {
                            addSuffix: true,
                        }) }}
                    </template>
                    <span v-else class="text-warning">
                        {{ $t('now!') }}
                    </span>
                    <BIconChevronRight class="ms-2" style="font-size: 0.6em" />
                    <router-link :to="{ name: 'cijm' }" class="stretched-link">
                        {{ $t('hex_tournament_paris.read_more') }}
                    </router-link>
                </small>
            </p>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.border-salon-math
    border-color #7b4896

.text-salon-math
    color #7b4896
</style>
