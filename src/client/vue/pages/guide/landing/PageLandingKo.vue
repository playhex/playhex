<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { useLandingPages } from '../../../composables/landingPages.js';

useSeoMeta({
    title: '헥스 온라인 플레이',
});

useLandingPages();
</script>

<template>
    <div class="p-3 p-md-5 text-center bg-body-tertiary rounded-3">
        <h1 class="text-body-emphasis">헥스 온라인 플레이</h1>

        <p class="fs-5">
            클래식 보드 게임 헥스를 온라인으로 즐겨보세요 — 다른 플레이어와 대전하거나 컴퓨터와 대결할 수 있습니다.
            헥스는 배우기 쉬우나 마스터하기는 어렵습니다.
        </p>

        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success mt-3 px-4 rounded-pill">지금 시작하기</router-link>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">실시간 라이브 매치</h2>

            <p class="mb-0">
                빠른 속도의 실시간 경기, 블리츠 게임 포함, 원하는 시간 설정으로 플레이하세요.
                선수의 사전 수를 허용해 더 빠른 플레이가 가능합니다. 게임 중 상대와 채팅도 가능합니다.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-reduced.png"
                alt="AI 분석이 포함된 헥스 게임"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">턴제 (서신형) 게임</h2>

            <p class="mb-0">
                느긋한 속도를 선호하시나요? 원하는 템포로 서신형 게임을 즐기세요.
                로그인하여 데스크탑과 모바일에서 게임을 이어갈 수 있습니다.
                조건부 수를 통해 명백한 수는 자동으로 진행해 사다리 수를 빠르게 플레이하세요.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/conditional-moves/lines-reduced.png"
                alt="조건부 수가 포함된 턴제 헥스 게임"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">AI 기반 경기 분석</h2>

            <p class="mb-0">
                매 경기 후 AI가 각 수에서의 승리 가능성을 분석해 보여줍니다.
                최고의 수, 실수, 그리고 더 나은 대안 수를 확인하세요.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/ai-analysis/example.png"
                alt="헥스 경기의 AI 리뷰"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">랭크 경기 & 성장 추적</h2>

            <p class="mb-0">
                랭크 경기를 통해 레이팅을 얻고 비슷한 실력의 플레이어와 매칭되세요.
                시간이 지남에 따라 실력 향상과 성장을 추적할 수 있습니다.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/glicko2-player-history-chart.png"
                alt="헥스 플레이어 레이팅 히스토리 차트"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">모바일 및 데스크탑에서 플레이</h2>

            <p>
                PlayHex를 모든 기기에서 즐기세요.
                이 플랫폼은 완전히 반응형이며 데스크탑과 모바일 모두에 최적화되어 있습니다.
                설치 없이 브라우저만 열면 바로 플레이할 수 있습니다.
            </p>

            <p class="mb-0">
                로그인하면 기기 간 게임이 동기화되어,
                데스크탑에서 시작한 경기를 나중에 휴대폰이나 태블릿에서 이어서 플레이할 수 있습니다.
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-narrow-2.png"
                alt="모바일에서 헥스 플레이"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="text-center">
        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success my-3 px-4 rounded-pill">로비로 가기</router-link>
    </div>
</template>
