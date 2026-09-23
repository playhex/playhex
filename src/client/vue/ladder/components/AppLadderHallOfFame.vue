<script setup lang="ts">
import { ref } from 'vue';
import { formatDistanceStrict } from 'date-fns';
import { LadderHallOfFameDto, LadderHallOfFamePlayerDto, LadderHallOfFameReignDto } from '../../../../shared/app/models/LadderDto.js';
import { apiGetLadderHallOfFame } from '../../../apiClient.js';
import AppPseudo from '../../components/AppPseudo.vue';
import { IconCrown, IconShieldFill, IconStairsUp, IconSword } from '../../icons.js';

const props = defineProps({
    slug: {
        type: String,
        required: true,
    },
});

const hallOfFame = ref<null | LadderHallOfFameDto>(null);

void (async () => {
    hallOfFame.value = await apiGetLadderHallOfFame(props.slug);
})();

const formatDuration = (reign: LadderHallOfFameReignDto): string => formatDistanceStrict(0, reign.durationMs);

const playerLists = (dto: LadderHallOfFameDto): { key: string, items: LadderHallOfFamePlayerDto[] }[] => [
    { key: 'best_defense_streaks', items: dto.bestDefenseStreaks },
    { key: 'giant_slayers', items: dto.giantSlayers },
    { key: 'climbers', items: dto.climbers },
];
</script>

<template>
    <div v-if="hallOfFame" class="row">
        <div class="col-md-6 mb-3">
            <h5><IconCrown class="text-warning" /> {{ $t('ladder.hall.longest_reigns') }}</h5>
            <p v-if="hallOfFame.longestReigns.length === 0" class="text-secondary">{{ $t('ladder.hall.empty') }}</p>
            <ol v-else>
                <li v-for="(reign, index) in hallOfFame.longestReigns" :key="index">
                    <AppPseudo :player="reign.player" />
                    <span class="text-secondary ms-2">{{ formatDuration(reign) }}</span>
                    <span v-if="reign.endedAt === null" class="badge text-bg-warning ms-1">{{ $t('ladder.hall.current_reign') }}</span>
                </li>
            </ol>
        </div>

        <div class="col-md-6 mb-3">
            <h5><IconShieldFill class="text-primary" /> {{ $t('ladder.hall.most_defended_reigns') }}</h5>
            <p v-if="hallOfFame.mostDefendedReigns.length === 0" class="text-secondary">{{ $t('ladder.hall.empty') }}</p>
            <ol v-else>
                <li v-for="(reign, index) in hallOfFame.mostDefendedReigns" :key="index">
                    <AppPseudo :player="reign.player" />
                    <span class="text-secondary ms-2">{{ $t('ladder.hall.defenses', { count: reign.defenses }) }}</span>
                    <span v-if="reign.endedAt === null" class="badge text-bg-warning ms-1">{{ $t('ladder.hall.current_reign') }}</span>
                </li>
            </ol>
        </div>

        <div v-for="list in playerLists(hallOfFame)" :key="list.key" class="col-md-4 mb-3">
            <h5>
                <IconShieldFill v-if="list.key === 'best_defense_streaks'" class="text-primary" />
                <IconSword v-if="list.key === 'giant_slayers'" class="text-danger" />
                <IconStairsUp v-if="list.key === 'climbers'" class="text-success" />
                {{ $t(`ladder.hall.${list.key}`) }}
            </h5>
            <p v-if="list.items.length === 0" class="text-secondary">{{ $t('ladder.hall.empty') }}</p>
            <ol v-else>
                <li v-for="item in list.items" :key="item.player.publicId">
                    <AppPseudo :player="item.player" /> <span class="text-secondary ms-2">{{ item.value }}</span>
                </li>
            </ol>
        </div>
    </div>
</template>
