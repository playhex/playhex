<script setup lang="ts">
import { Tournament } from '../../../../shared/app/models';
import AppBracketDefault from './brackets/AppBracketDefault.vue';
import AppBracketDoubleElimination from './brackets/AppBracketDoubleElimination.vue';
import AppBracketSingleElimination from './brackets/AppBracketSingleElimination.vue';
import { onBeforeUnmount, onMounted } from 'vue';

defineProps({
    tournament: {
        type: Tournament,
        required: true,
    },
});

const destroyCallbacks: (() => void)[] = [];

onMounted(() => {
    document.body.classList.add('overflow-x-hidden');
    destroyCallbacks.push(() => document.body.classList.remove('overflow-x-hidden'));

    const container: null | HTMLElement = document.querySelector('.arrows-container');
    const brackets: null | HTMLElement = document.querySelector('.tournament-brackets');
    const draggable: null | HTMLElement = document.querySelector('.tournament-brackets > .container-fluid');

    if (!container) {
        throw new Error('No container element');
    }

    if (!brackets) {
        throw new Error('No brackets element');
    }

    if (!draggable) {
        throw new Error('No draggable element');
    }

    const bracketsScroll = () => {
        container.style.left = draggable.getBoundingClientRect().x + 'px';
    };

    brackets.addEventListener('scroll', bracketsScroll);
    destroyCallbacks.push(() => brackets.removeEventListener('scroll', bracketsScroll));

    let mouseDown = false;
    let startX: number;
    let startY: number;
    let scrollLeft: number;
    let scrollTop: number;

    const startDragging = (e: MouseEvent) => {
        mouseDown = true;
        startX = e.clientX - brackets.offsetLeft;
        startY = e.clientY;
        scrollLeft = brackets.scrollLeft;
        scrollTop = window.scrollY;
        brackets.classList.add('grabbing');
    };

    const stopDragging = () => {
        mouseDown = false;
        brackets.classList.remove('grabbing');
    };

    const move = (e: MouseEvent) => {
        e.preventDefault();

        if(!mouseDown) {
            return;
        }

        const x = e.clientX - brackets.offsetLeft;
        const y = e.clientY;

        const deltaX = x - startX;
        const deltaY = y - startY;

        brackets.scrollLeft = scrollLeft - deltaX;
        window.scroll({ top: scrollTop - deltaY, behavior: 'instant' });
    };

    // Add the event listeners
    brackets.addEventListener('mousemove', move);
    brackets.addEventListener('mousedown', startDragging);
    brackets.addEventListener('mouseup', stopDragging);
    brackets.addEventListener('mouseleave', stopDragging);

    destroyCallbacks.push(() => brackets.removeEventListener('mousemove', move));
    destroyCallbacks.push(() => brackets.removeEventListener('mousedown', startDragging));
    destroyCallbacks.push(() => brackets.removeEventListener('mouseup', stopDragging));
    destroyCallbacks.push(() => brackets.removeEventListener('mouseleave', stopDragging));
});

onBeforeUnmount(() => destroyCallbacks.forEach(callback => callback()));
</script>

<template>
    <!--
        This container will contains arrows and follow brackets x position
        to efficiently keep all arrows sync with brackets
    -->
    <div class="arrows-container"></div>

    <div class="tournament-brackets">
        <div class="container-fluid">
            <AppBracketSingleElimination
                v-if="'single-elimination' === tournament.stage1Format"
                :tournament
            />
            <AppBracketDoubleElimination
                v-else-if="'double-elimination' === tournament.stage1Format"
                :tournament
            />
            <AppBracketDefault
                v-else
                :tournament
            />
        </div>
    </div>
</template>

<style lang="stylus">
// Not scoped to apply css on all brackets components within the .tournament-brackets class
.arrows-container
    position absolute
    top 0

.tournament-brackets
    width 100vw
    overflow-x auto
    cursor grab

    > .container-fluid
        margin-bottom 1em

    &.grabbing
        cursor grabbing

    // contains all rounds, and titles "Round N"
    .brackets-rounds
        display flex
        gap 2em

        // add more space between two round for arrows
        &.has-arrows
            gap 4em

    .brackets-round
        display flex
        flex-direction column

    // contains only .brackets-match items (no title)
    .brackets-matches
        display flex
        justify-content space-around
        flex-direction column
        gap 1em
        width 16em
        height 100%

    // contains a .card for the match
    .brackets-match
        width 100%
</style>
