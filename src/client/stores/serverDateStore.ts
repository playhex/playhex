import { defineStore } from 'pinia';
import useSocketStore from './socketStore.js';
import { ref } from 'vue';

/**
 *
 */
const useServerDateStore = defineStore('serverDateStore', () => {

    const { socket } = useSocketStore();

    /**
     * Last measured shifts to get a median value.
     */
    const lastShifts: number[] = [];
    const MAX_MEASURES = 5;

    const pingTime = ref<null | number>(null);
    const medianShift = ref<number>(0);

    /**
     * Get current shift in milliseconds, between client and server date.
     */
    const getMedianShift = (): number => {
        if (0 === lastShifts.length) {
            return 0;
        }

        const sorted = [...lastShifts].sort();

        return sorted[Math.floor(lastShifts.length / 2)];
    };

    const measureCurrentShift = () => {
        const t0 = new Date();

        socket.emit('getServerStatus', ({ serverDate }) => {
            pingTime.value = new Date().getTime() - t0.getTime();

            const shift = new Date().getTime() - serverDate.getTime();

            lastShifts.push(shift);

            while (lastShifts.length > MAX_MEASURES) {
                lastShifts.shift();
            }

            medianShift.value = getMedianShift();
        });
    };

    measureCurrentShift();
    setInterval(() => measureCurrentShift(), 5000);

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
