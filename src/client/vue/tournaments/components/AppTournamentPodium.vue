<script setup lang="ts">
import { computed } from 'vue';
import { t } from 'i18next';

export type PodiumPlayer = {
    pseudo: string;
    rank: number;
};

const props = defineProps<{
    players: PodiumPlayer[];

    /**
     * Show a more compact podium, to display it as a side information.
     */
    small?: boolean;
}>();

const ordinal = (rank: number): string => rank < 1 || rank > 3
    ? String(rank)
    : t('tournament_ordinal.' + rank)
;

const colClasses = computed<string[]>(() => props.small
    ? [
        'col-12 col-sm-4 order-sm-2',
        'col-6 col-sm-4 order-sm-1',
        'col-6 col-sm-4 order-sm-3',
    ]
    : [
        'col-12 col-lg-6 order-lg-2',
        'col-12 col-sm-6 col-lg-3 order-lg-1',
        'col-12 col-sm-6 col-lg-3 order-lg-3',
    ],
);
</script>

<template>
    <div class="row">
        <div
            v-for="player, i of players"
            :key="i"
            :class="colClasses[i]"
            class="mb-3"
        >
            <div class="card h-100" :class="{ 'border-warning shadow-sm': player.rank === 1 }">
                <div class="card-body text-center">
                    <p class="mb-0" :class="{ 'text-warning': player.rank === 1 }"><small v-if="small">{{ ordinal(player.rank) }}</small><template v-else>{{ ordinal(player.rank) }}</template></p>
                    <p :class="small ? 'h5 mb-0' : 'display-6'">{{ player.pseudo }}</p>
                </div>
            </div>
        </div>
    </div>
</template>
