<script setup lang="ts">
import { PropType, ref, watchEffect } from 'vue';
import { Chart, Tooltip, Legend, LinearScale, Colors, ChartOptions, ChartData, TimeScale, PointElement, LineElement } from 'chart.js';
import { Line } from 'vue-chartjs';
import '../../services/chartJsDateFnsAdapter.js';
import { IconZoomOut } from '../icons';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Player } from '../../../shared/app/models/index.js';
import { apiGetPlayerRatingHistory } from '../../apiClient.js';
import { RatingCategory } from '../../../shared/app/ratingUtils.js';

const { player } = defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true,
    },
});

const emit = defineEmits<{
    (e: 'timeRangeUpdated', from: null | Date, to: null | Date): void;
}>();

Chart.register(
    LinearScale,
    TimeScale,
    PointElement,
    LineElement,
    zoomPlugin,
    Tooltip,
    Legend,
    Colors,
);

const ratingChart = ref<HTMLElement>();
const ratingChartData = ref<null | ChartData<'line', { x: Date, y: number }[]>>(null);
const currentRatingCategory = ref<RatingCategory>('overall');

watchEffect(async () => {
    const ratings = await apiGetPlayerRatingHistory(player.publicId, currentRatingCategory.value);

    if (ratings === null) {
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
                onZoom: ({ chart }) => {
                    if (chart.getZoomLevel() === 1) {
                        isZoomed.value = false;
                        emit('timeRangeUpdated', null, null);
                    } else {
                        isZoomed.value = true;
                        emit('timeRangeUpdated', new Date(chart.scales.x.min), new Date(chart.scales.x.max));
                    }
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
    maintainAspectRatio: false,
};

const resetZoom = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ratingChart.value as any)?.chart.resetZoom('zoom');
    isZoomed.value = false;
    emit('timeRangeUpdated', null, null);
};

const isZoomed = ref(false);

const showRatingCategory = (category: RatingCategory): void => {
    currentRatingCategory.value = category;
    resetZoom();
};

defineExpose({
    showRatingCategory,
    currentRatingCategory,
});
</script>

<template>
    <div class="chart-container">
        <div class="chart-controls">
            <button
                v-if="isZoomed"
                @click="resetZoom"
                class="btn btn-outline-primary btn-sm"
                title="Reset zoom"
            ><IconZoomOut /></button>
        </div>
        <Line
            v-if="null !== ratingChartData"
            ref="ratingChart"
            :data="(ratingChartData as unknown as ChartData<'line'>)"
            :options="ratingChartOptions"
            aria-label="Chart of rating history."
        />
    </div>
</template>

<style lang="stylus" scoped>
.chart-container
    position relative
    height 250px
    max-height 50vw

    .chart-controls
        position absolute
        right 0
</style>
