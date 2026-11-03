import type { LandingContent } from './LandingContent.js';

export default {
    metaTitle: 'Hexを無料でオンライン対局',
    metaDescription: 'ボードゲーム「Hex」を無料でオンライン対局。世界中のプレイヤーやAIと対戦できます。リアルタイム対局、通信対局、トーナメント、パズル、AIによる棋譜解析。',

    nav: {
        play: '対局',
        tournaments: 'トーナメント',
        ladder: 'キング・オブ・ザ・ヒル',
        puzzles: 'パズル',
        tutorial: '学ぶ',
        language: '言語',
    },

    hero: {
        title: 'Hexをオンラインで対局',
        subtitle: 'ボードゲーム「Hex」を無料で、世界中のプレイヤーやAIと対局しましょう。',
        tagline: '覚えるのは簡単、極めるのは難しい。',
        cta: '今すぐ対局',
        ctaSecondary: 'ルールを学ぶ',
    },

    features: {
        live: {
            title: 'リアルタイム対局',
            text: '早指しでも、じっくり考える対局でも、持ち時間を自由に設定できます。先読み着手で即座に応手でき、対局中は相手とチャットもできます。',
            imageAlt: 'PlayHexでのリアルタイムのHex対局',
            linkLabel: '対戦相手を探す',
            highlights: ['先読み着手で即座に応手', '19×19以上まで、あらゆる盤サイズ'],
        },
        correspondence: {
            title: '通信対局',
            text: '1日1手など、自分のペースで対局できます。条件付き着手を使えば、ラダーや必然の手順を相手を待たずに先に打っておけます。',
            imageAlt: '通信対局での条件付き着手のツリー',
            linkLabel: '通信対局をする',
            highlights: ['条件付き着手', '手番が来たら通知'],
        },
        ai_analysis: {
            title: 'AIによる棋譜解析',
            text: '対局後、AIがすべての手を解析します。最善手、自分の悪手、そして対局の各時点でどちらが優勢だったかを確認できます。',
            imageAlt: 'AIが解析した対局の勝率グラフ',
            linkLabel: '対局する',
            highlights: ['自分のミスと、逆転できた一手を発見', '勝率グラフ'],
        },
        ranked: {
            title: 'ランク戦',
            text: 'レーティングを獲得し、同じくらいの実力の相手と対局して、レーティンググラフで上達を確認しましょう。',
            imageAlt: 'プレイヤーのレーティング推移グラフ',
            linkLabel: 'ランク戦を始める',
            highlights: ['リアルタイムでも通信対局でもレーティング戦', '相手ごとの対戦成績'],
        },
        devices: {
            title: 'スマホでもパソコンでも',
            text: 'PlayHexはスマホ、タブレット、パソコンのブラウザで動作します。インストール不要で、対局は端末間で同期されます。',
            imageAlt: 'スマホでのHex対局',
            linkLabel: 'ブラウザで対局',
            highlights: ['アプリとしてインストール可能', 'デバイス間で対局を同期'],
        },
        tournaments: {
            title: 'トーナメント',
            text: 'スイス式やノックアウト方式のトーナメントに、リアルタイムまたは通信対局で参加できます。定期開催のシリーズでは毎週同じプレイヤーと対戦できます。',
            imageAlt: 'Hexトーナメントの結果',
            linkLabel: 'トーナメントを見る',
            highlights: ['スイス式・総当たり・ノックアウト', '定期開催の大会シリーズ'],
        },
        ladder: {
            title: 'キング・オブ・ザ・ヒル',
            text: '自分より上位のプレイヤーに挑戦し、勝ってその順位を奪いましょう。頂点を目指し、その座を守り抜きましょう。',
            imageAlt: 'キング・オブ・ザ・ヒルの順位表',
            linkLabel: '頂上を目指す',
            highlights: ['リアルタイムと通信対局', '歴代の王の記録'],
        },
        puzzles: {
            title: 'パズル',
            text: 'コミュニティが作成した、初心者から上級者向けまでのパズルで戦術を鍛えましょう。パズルはコレクションにまとめられています。',
            imageAlt: 'Hexのパズル',
            linkLabel: 'パズルを解く',
            highlights: ['誰でもパズルを作成・解答できる', 'ミスがないか検証できる本格的なパズルエディター'],
        },
        bots: {
            title: 'AIと対局',
            text: '初心者向けから非常に強いものまで、さまざまな強さのボットと練習できます。オフラインでも遊べます。',
            imageAlt: 'HexのAIとの対局',
            linkLabel: 'AIと対局する',
            highlights: ['複数の強さのレベル', 'オフラインでもプレイ可能'],
        },
        tutorial: {
            title: 'インタラクティブなチュートリアル',
            text: 'Hexのルールはたった2つ。インタラクティブなチュートリアルで数分で覚えて、基本的な戦略を学びましょう。',
            imageAlt: 'Hexのインタラクティブなチュートリアル',
            linkLabel: 'チュートリアルを始める',
            highlights: ['数分でルールを習得', '基本戦略'],
        },
    },

    footer: {
        cta: 'さあ、辺と辺をつなげましょう。',
        free: 'PlayHexは無料、オープンソース、広告なしです。',
    },
} satisfies LandingContent;
