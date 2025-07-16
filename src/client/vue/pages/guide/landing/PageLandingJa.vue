<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { useLandingPages } from '../../../composables/landingPages';

useSeoMeta({
    title: 'オンラインでヘックスをプレイ',
});

useLandingPages();
</script>

<template>
    <div class="p-3 p-md-5 text-center bg-body-tertiary rounded-3">
        <h1 class="text-body-emphasis">オンラインでヘックスをプレイ</h1>

        <p class="fs-5">
            古典的なボードゲーム「ヘックス」をオンラインで楽しもう。他のプレイヤーに挑戦したり、コンピュータと対戦したりできます。
            ヘックスは簡単に覚えられますが、奥深い戦略性を持っています。
        </p>

        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success mt-3 px-4 rounded-pill">今すぐプレイ開始</router-link>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">リアルタイム対戦</h2>

            <p class="mb-0">
                高速なリアルタイム対戦が可能です。ブリッツモードやカスタムタイム設定にも対応。
                プリムーブを使ってスピーディーなプレイが可能。対戦中にはチャット機能も利用できます。
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-reduced.png"
                alt="AI解析付きのヘックスゲーム"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">ターン制（通信対戦）ゲーム</h2>

            <p class="mb-0">
                ゆっくりとしたペースでプレイしたい方には、通信対戦がおすすめ。
                デスクトップとモバイル間で進行中のゲームを引き継ぐことができます。
                条件付きムーブを活用して、単純な手を自動化し効率よくプレイ。
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/conditional-moves/lines-reduced.png"
                alt="条件付きムーブを用いたターン制のヘックスゲーム"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">AIによる対局解析</h2>

            <p class="mb-0">
                対局後には、AIによる解析で各手番ごとの勝率が表示されます。
                最も良かった手やミス、代わりに選べた最適な手も確認できます。
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/guide/ai-analysis/example.png"
                alt="ヘックス対局のAIレビュー"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 order-md-1 d-flex flex-column justify-content-center">
            <h2 class="mt-0">ランク戦 & 成長の記録</h2>

            <p class="mb-0">
                ランク戦でレーティングを獲得し、同レベルのプレイヤーとマッチ。
                自分の実力や成長をグラフで追跡しよう。
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/glicko2-player-history-chart.png"
                alt="ヘックスプレイヤーのレーティング履歴グラフ"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="row mt-4">
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <h2 class="mt-0">モバイル・デスクトップ両対応</h2>

            <p>
                PlayHexはあらゆるデバイスで快適にプレイ可能。
                完全レスポンシブ設計で、インストール不要。ブラウザからすぐに始められます。
            </p>

            <p class="mb-0">
                ログインすれば、ゲームはデバイス間で同期されます。
                デスクトップで始めて、スマートフォンやタブレットで続きからプレイできます。
            </p>
        </div>
        <div class="col-12 col-md-6 d-flex flex-column justify-content-center">
            <img
                src="/images/screenshots/game-narrow-2.png"
                alt="モバイルでのヘックスプレイ"
                class="img-thumbnail"
            />
        </div>
    </div>

    <div class="text-center">
        <router-link :to="{ name: 'home' }" class="btn btn-lg btn-success my-3 px-4 rounded-pill">ロビーへ移動</router-link>
    </div>
</template>
