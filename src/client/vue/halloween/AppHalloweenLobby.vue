<script setup lang="ts">
/*
 * Halloween decorations displayed on lobby only:
 * a cobweb with a hanging spider, bats flying by, and glowing eyes in the dark.
 *
 * Everything is pointer-events: none and stays below the header,
 * so it never blocks clicks.
 * Cobweb and spider are in background, behind lobby cards:
 * parent must be a stacking context (i.e isolation: isolate).
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * Cobweb in a corner, radial threads from (0, 0), and sagging spiral threads.
 */
const cobwebPath = ((): string => {
    const angles = [0, 15, 30, 45, 60, 75, 90].map(a => a * Math.PI / 180);
    const point = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;

    let d = angles.map(a => `M0 0 L${point(100, a)}`).join(' ');

    for (const r of [18, 34, 52, 72, 94]) {
        d += ` M${point(r, angles[0])}`;

        for (let i = 1; i < angles.length; ++i) {
            const middle = (angles[i - 1] + angles[i]) / 2;
            d += ` Q${point(r * 0.86, middle)} ${point(r, angles[i])}`;
        }
    }

    return d;
})();

const spiderLegsPath = 'M-3 -2 Q-9 -9 -13 -4 M-3 0 Q-10 -4 -14 1 M-3 1 Q-10 3 -13 8 M-2 2 Q-7 8 -9 12'
    + ' M3 -2 Q9 -9 13 -4 M3 0 Q10 -4 14 1 M3 1 Q10 3 13 8 M2 2 Q7 8 9 12';

/*
 * Bats and eyes randomly appearing
 */
type Bat = { id: number, top: number, duration: number, scale: number, reverse: boolean };
type Eyes = { id: number, top: number, left: number };

const bats = ref<Bat[]>([]);
const eyes = ref<Eyes[]>([]);

let nextId = 0;
const timeouts: ReturnType<typeof setTimeout>[] = [];
const random = (min: number, max: number) => min + Math.random() * (max - min);

const schedule = (callback: () => void, minSeconds: number, maxSeconds: number): void => {
    timeouts.push(setTimeout(() => {
        callback();
        schedule(callback, minSeconds, maxSeconds);
    }, random(minSeconds, maxSeconds) * 1000));
};

const spawnBats = (): void => {
    const count = Math.random() < 0.3 ? 3 : 1;
    const top = random(10, 60);
    const reverse = Math.random() < 0.5;

    for (let i = 0; i < count; ++i) {
        bats.value.push({
            id: nextId++,
            top: top + random(-6, 6),
            duration: random(7, 11),
            scale: random(0.6, 1.1),
            reverse,
        });
    }
};

const spawnEyes = (): void => {
    const left = Math.random() < 0.5 ? random(1, 8) : random(88, 95);

    eyes.value.push({
        id: nextId++,
        top: random(30, 85),
        left,
    });
};

const removeBat = (id: number) => bats.value = bats.value.filter(bat => bat.id !== id);
const removeEyes = (id: number) => eyes.value = eyes.value.filter(e => e.id !== id);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

onMounted(() => {
    if (prefersReducedMotion) {
        return;
    }

    timeouts.push(setTimeout(spawnBats, 3000));
    schedule(spawnBats, 20, 45);
    schedule(spawnEyes, 15, 35);
});

onBeforeUnmount(() => timeouts.forEach(clearTimeout));
</script>

<template>
    <div class="halloween-lobby halloween-background" aria-hidden="true">
        <svg class="cobweb" viewBox="0 0 100 100">
            <path :d="cobwebPath" />
        </svg>

        <div class="spider-anchor">
            <div class="spider">
                <div class="spider-thread"></div>
                <svg class="spider-body" viewBox="-15 -13 30 26">
                    <!-- Same shapes, larger, drawn behind spider to outline it in dark mode -->
                    <g class="spider-outline">
                        <path :d="spiderLegsPath" />
                        <ellipse cx="0" cy="3" rx="4.5" ry="5.5" />
                        <circle cx="0" cy="-3.5" r="3" />
                    </g>
                    <path :d="spiderLegsPath" />
                    <ellipse cx="0" cy="3" rx="4.5" ry="5.5" />
                    <circle cx="0" cy="-3.5" r="3" />
                    <circle class="spider-eye" cx="-1.1" cy="-3.8" r="0.7" />
                    <circle class="spider-eye" cx="1.1" cy="-3.8" r="0.7" />
                </svg>
            </div>
        </div>
    </div>

    <div class="halloween-lobby halloween-foreground" aria-hidden="true">
        <div
            v-for="bat in bats"
            :key="bat.id"
            class="bat"
            :class="{ reverse: bat.reverse }"
            :style="{ top: bat.top + '%', animationDuration: bat.duration + 's', '--bat-scale': bat.scale }"
            @animationend="removeBat(bat.id)"
        >
            <svg viewBox="0 0 48 20">
                <path d="M24 7 C22 5 21 5 20.5 7 C17 3 9 1 0 6 C5 7 8 10 9 14 C11 11 14 11 16 13 C17 11 19 11 21 13 L24 16 L27 13 C29 11 31 11 32 13 C34 11 37 11 39 14 C40 10 43 7 48 6 C39 1 31 3 27.5 7 C27 5 26 5 24 7 Z" />
            </svg>
        </div>

        <div
            v-for="e in eyes"
            :key="e.id"
            class="eyes"
            :style="{ top: e.top + '%', left: e.left + '%' }"
            @animationend="removeEyes(e.id)"
        >
            <span></span><span></span>
        </div>
    </div>
</template>

<style lang="stylus" scoped>
.halloween-lobby
    position fixed
    inset 0
    pointer-events none
    overflow hidden
    --halloween-ink rgba(232, 220, 198, 0.3)

.halloween-background
    z-index -1

.halloween-foreground
    z-index 1019 // just below sticky header

[data-bs-theme=light] .halloween-lobby
    --halloween-ink rgba(43, 29, 46, 0.25)

.cobweb
    position absolute
    top 2.9rem // header is 3rem, slightly under it to never leave a gap
    right 0
    width 15rem
    height 15rem
    transform scaleX(-1)

    @media (max-width: 576px)
        width 9rem
        height 9rem

    path
        fill none
        stroke var(--halloween-ink)
        stroke-width 0.45

/*
 * Spider hanging from cobweb, going down and up slowly
 */
.spider-anchor
    position absolute
    top 2.9rem // header is 3rem, slightly under it to never leave a gap
    right 5.5rem

    @media (max-width: 576px)
        right 3.3rem

.spider
    animation spider-drop 22s ease-in-out infinite
    transform-origin top center

.spider-thread
    width 1px
    height 6rem
    margin auto
    background var(--halloween-ink)

.spider-body
    display block
    width 1.6rem
    margin -0.3rem auto 0
    animation spider-sway 4s ease-in-out infinite
    transform-origin top center

    ellipse, circle
        fill #1a1220

    path
        fill none
        stroke #1a1220
        stroke-width 1.2
        stroke-linecap round

    .spider-eye
        fill #ff3b1f

    .spider-outline
        display none

[data-bs-theme=dark] .spider-body
    ellipse, circle
        fill #050307

    path
        stroke #050307

    .spider-outline
        display inline

        ellipse, circle, path
            fill none
            stroke #b8b8b8
            stroke-width 1.2

        path
            stroke-width 2.4

@css {
    @keyframes spider-drop {
        0%, 100% { transform: translateY(-5.5rem); }
        30%      { transform: translateY(-5.5rem); }
        45%      { transform: translateY(0); }
        58%      { transform: translateY(-0.6rem); }
        64%      { transform: translateY(0); }
        80%      { transform: translateY(0); }
    }

    @keyframes spider-sway {
        0%, 100% { transform: rotate(-4deg); }
        50%      { transform: rotate(4deg); }
    }
}

/*
 * Bats flying across the screen
 */
.bat
    position absolute
    left 0
    width 2.6rem
    animation bat-fly linear forwards

    svg
        display block
        width 100%
        fill #120b18
        animation bat-flap 0.18s ease-in-out infinite alternate

    &.reverse
        animation-name bat-fly-reverse

[data-bs-theme=dark] .bat svg
    fill #000

@css {
    @keyframes bat-flap {
        from { transform: scaleY(1); }
        to   { transform: scaleY(0.35); }
    }

    @keyframes bat-fly {
        0%   { transform: translate(-10vw, 0)    scale(var(--bat-scale)); }
        25%  { transform: translate(20vw, -4vh)  scale(var(--bat-scale)); }
        50%  { transform: translate(50vw, 3vh)   scale(var(--bat-scale)); }
        75%  { transform: translate(80vw, -5vh)  scale(var(--bat-scale)); }
        100% { transform: translate(110vw, -2vh) scale(var(--bat-scale)); }
    }

    @keyframes bat-fly-reverse {
        0%   { transform: translate(110vw, 0)   scale(var(--bat-scale)); }
        25%  { transform: translate(80vw, 4vh)  scale(var(--bat-scale)); }
        50%  { transform: translate(50vw, -3vh) scale(var(--bat-scale)); }
        75%  { transform: translate(20vw, 5vh)  scale(var(--bat-scale)); }
        100% { transform: translate(-10vw, 2vh) scale(var(--bat-scale)); }
    }
}

/*
 * Glowing eyes appearing on screen sides, blinking, then vanishing
 */
.eyes
    position absolute
    display flex
    gap 0.45rem
    opacity 0
    animation eyes-appear 6s ease-in-out forwards

    span
        width 0.55rem
        height 0.3rem
        border-radius 50%
        background #ffd23f
        box-shadow 0 0 6px 2px rgba(255, 90, 0, 0.8)
        animation eyes-blink 6s step-end forwards

[data-bs-theme=light] .eyes span
    background #d40000
    box-shadow 0 0 5px 1px rgba(160, 0, 0, 0.6)

@css {
    @keyframes eyes-appear {
        0%   { opacity: 0; }
        20%  { opacity: 0.9; }
        80%  { opacity: 0.9; }
        100% { opacity: 0; }
    }

    @keyframes eyes-blink {
        0%   { transform: scaleY(1); }
        40%  { transform: scaleY(0.1); }
        43%  { transform: scaleY(1); }
        60%  { transform: scaleY(0.1); }
        62%  { transform: scaleY(1); }
    }
}

@media (prefers-reduced-motion: reduce)
    .spider, .spider-body
        animation none
</style>
