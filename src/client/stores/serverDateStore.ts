import { defineStore } from 'pinia';
import useSocketStore from './socketStore.js';
import { ref } from 'vue';
import { getMedianShift, getNextMeasureDelay, MAX_MEASURES, UNSTABLE_MEASURE_INTERVAL } from '../../shared/app/serverDateShift.js';

/**
 *
 */
const useServerDateStore = defineStore('serverDateStore', () => {

    const socketStore = useSocketStore();
    const { socket } = socketStore;

    /**
     * Last measured shifts to get a median value.
     */
    const lastShifts: number[] = [];

    const pingTime = ref<null | number>(null);
    const medianShift = ref<number>(0);

    let nextMeasureTimeout: null | ReturnType<typeof setTimeout> = null;

    const scheduleNextMeasure = (delay: number) => {
        if (nextMeasureTimeout !== null) {
            clearTimeout(nextMeasureTimeout);
        }

        nextMeasureTimeout = setTimeout(() => measureCurrentShift(), delay);
    };

    const measureCurrentShift = () => {
        // Retry later if server does not answer, answer may be lost on disconnection
        scheduleNextMeasure(UNSTABLE_MEASURE_INTERVAL);

        // Do not emit while disconnected: socket.io would buffer and send them all on reconnection
        if (!socketStore.connected) {
            return;
        }

        const t0 = new Date();

        socket.emit('getServerStatus', ({ serverDate }) => {
            pingTime.value = new Date().getTime() - t0.getTime();

            const shift = new Date().getTime() - serverDate.getTime();

            lastShifts.push(shift);

            while (lastShifts.length > MAX_MEASURES) {
                lastShifts.shift();
            }

            medianShift.value = getMedianShift(lastShifts);

            scheduleNextMeasure(getNextMeasureDelay(lastShifts));
        });
    };

    socket.on('connect', () => measureCurrentShift());
    measureCurrentShift();

    /**
     * Create a date synchronized with playhex server.
     * new Date() may be shifted by seconds, which cause a shifted chrono
     * (i.e elapses at 0:02 instead of 0:00).
     * So use this newDate() instead which create a date with shift compensation.
     */
    const newDate = (): Date => {
        return new Date(new Date().getTime() - medianShift.value);
    };

    return {
        newDate,
        pingTime,
        medianShift,
    };
});

export default useServerDateStore;
