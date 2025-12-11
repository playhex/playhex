<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { useLandingPages } from '../../../composables/landingPages.js';

useSeoMeta({
    title: '在线玩 Hex 游戏',
});

useLandingPages();
</script>

<template>
    <div class="p-3 p-md-5 text-center bg-body-tertiary rounded-3">
        <h1 class="text-body-emphasis">在线玩 Hex 游戏</h1>

        <p class="fs-5">
            在线畅玩经典的 Hex 棋盘游戏 —— 向其他玩家发起挑战，或与电脑对手对战。
            Hex 游戏规则简单，但精通不易。
        </p>

        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success mt-3 px-4 rounded-pill">立即开始游戏</router-link>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">实时对局</h2>

            <p class="mb-0">
                参与节奏紧凑的实时对局，包括闪电战游戏，可自定义时间控制。
                启用预移动以提升下棋速度。游戏中可与对手实时聊天。
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-reduced.png"
                alt="带有 AI 分析的 Hex 游戏"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">回合制（通信）游戏</h2>

            <p class="mb-0">
                喜欢节奏较慢的游戏？随心所欲地进行回合制对局。
                登录账户即可在桌面与移动设备之间无缝继续游戏。
                使用条件走子自动完成显而易见的操作，加快下梯子的速度。
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/conditional-moves/lines-reduced.png"
                alt="带有条件走子的回合制 Hex 游戏"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">AI 驱动的对局分析</h2>

            <p class="mb-0">
                每局比赛结束后，可获得由 AI 提供的回顾分析，显示每一步谁处于领先。
                发现你的最佳操作、失误以及更优的替代走法。
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/ai-analysis/example.png"
                alt="Hex 比赛的 AI 分析"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">天梯对局与进度追踪</h2>

            <p class="mb-0">
                参与排名赛，获得评分并匹配实力相近的对手。
                持续追踪你的 Hex 水平成长和进步。
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/glicko2-player-history-chart.png"
                alt="Hex 玩家评分历史图表"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">支持移动设备和桌面端</h2>

            <p>
                在任意设备上畅玩 PlayHex。
                平台完全响应式，针对桌面和移动端均已优化。
                无需安装，打开浏览器即可开始游戏。
            </p>

            <p class="mb-0">
                登录后你的游戏会在各设备间自动同步，
                你可以在桌面上开始一局游戏，稍后在手机或平板上继续。
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-narrow-2.png"
                alt="在手机上玩 Hex 游戏"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="text-center">
        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success my-3 px-4 rounded-pill">前往大厅</router-link>
    </div>
</template>
