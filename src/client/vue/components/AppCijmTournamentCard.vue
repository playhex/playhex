<script setup lang="ts">
import { BIconChevronRight, BIconTrophy } from 'bootstrap-icons-vue';
import { formatDistanceToNowStrict } from 'date-fns';

</script>

<template>
    <div class="card card-bg-icon border-salon-math mb-4">
        <BIconTrophy style="top: 0.5rem; right: -1rem; font-size: 5rem" class="text-salon-math" />
        <div class="card-body">
            <p class="m-0 lead">{{ $t('hex_tournament_paris.title') }}</p>

            <p class="m-0">
                <small>
                    {{ formatDistanceToNowStrict(new Date('2025-06-15'), {
                        addSuffix: true,
                        unit: 'day',
                    }) }}
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
