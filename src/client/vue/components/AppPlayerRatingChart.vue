<script setup lang="ts">
import { PropType, ref, watchEffect } from 'vue';
import { Chart, Title, Tooltip, Legend, CategoryScale, LinearScale, Colors, ChartOptions, ChartData, TimeScale, PointElement, LineElement, BarElement } from 'chart.js';
import { Line } from 'vue-chartjs';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Player } from '../../../shared/app/models';
import { apiGetPlayerRatingHistory } from '../../apiClient';
import { RatingCategory } from '../../../shared/app/ratingUtils';

const { player } = defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
});

Chart.register(
    CategoryScale,
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    BarElement,
    zoomPlugin,
    Title,
    Tooltip,
    Legend,
    Colors,
);

const ratingChart = ref<HTMLElement>();
const ratingChartData = ref<null | ChartData<'line', { x: Date, y: number }[]>>(null);
const currentRatingCategory = ref<RatingCategory>('overall');

const ratingCategories: { category: RatingCategory, color: string }[] = [
    { category: 'overall', color: 'primary' },
    { category: 'blitz', color: 'success' },
    { category: 'normal', color: 'success' },
    { category: 'correspondence', color: 'success' },
    { category: 'small', color: 'info' },
    { category: 'medium', color: 'info' },
    { category: 'large', color: 'info' },
];

watchEffect(async () => {
    const ratings = await apiGetPlayerRatingHistory(player.publicId, currentRatingCategory.value);

    if (null === ratings) {
        return;
    }

    ratingChartData.value = {
        datasets: [
            {
                data: ratings.map(rating => ({
                    x: rating.createdAt,
                    y: rating.rating,
                })),
            },
        ],
    };
});

const ratingChartOptions: ChartOptions<'line'> = {
    scales: {
        x: {
            type: 'time',
            suggestedMax: new Date() as unknown as string,
            time: {
                minUnit: 'day',
            },
        },
    },
    plugins: {
        legend: {
            display: false,
        },
        zoom: {
            zoom: {
                mode: 'x',
                drag: {
                    enabled: true,
                },
            },
        },
    },
    transitions: {
        zoom: {
            animation: {
                duration: 400,
            },
        },
    },
    animation: {
        duration: 200,
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resetZoom = () => (ratingChart.value as any)?.chart.resetZoom('zoom');
</script>

<template>
    <div v-if="ratingChart">
        <button
            v-for="{ category, color } in ratingCategories"
            :key="category"
            @click="currentRatingCategory = category; resetZoom()"
            class="btn btn-sm me-2"
            :class="(category === currentRatingCategory ? 'btn-' : 'btn-outline-') + color"
        >{{ category }}</button>

        <button
            @click="resetZoom"
            class="btn btn-outline-secondary btn-sm"
        >Reset zoom</button>
    </div>
    <Line
        v-if="null !== ratingChartData"
        ref="ratingChart"
        :data="(ratingChartData as unknown as ChartData<'line'>)"
        :options="ratingChartOptions"
        height="100"
        aria-label="Chart of rating history."
    />
</template>
