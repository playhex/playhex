<script setup lang="ts">
import { calcRandomMove, Game, Move, PlayerIndex } from '../../../shared/game-engine/index.js';
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { CustomizedGameView } from '../../services/CustomizedGameView.js';
import CellAlreadyOccupiedError from '../../../shared/game-engine/errors/CellAlreadyOccupiedError.js';
import { calcDaviesMoveFor9x9Board } from '../../../shared/app/daviesBot.js';
import { apiPostGame } from '../../apiClient.js';
import { useRouter } from 'vue-router';
import useAiConfigsStore from '../../stores/aiConfigsStore.js';
import { IconArrowRight, IconBoxArrowUpRight, IconCheck, IconInfoCircle } from '../icons.js';

// Demo 0: show full path and play random bot
const game0 = new Game(6);
game0.setAllowSwap(false);
const container0 = ref<HTMLElement>();

const movesDemo0: Move[] = 'd3 c5 e4 e2 d2 d1 e1 e5 d5 d6 c6 d4 e3'.split(' ').map(s => Move.fromString(s));

const gameView0 = new CustomizedGameView(game0);

const animation: [() => void, number][] = [];
const pause = () => {};

animation.push([pause, 500]);

for (let i = 0; i < movesDemo0.length; ++i) {
    animation.push([
        () => game0.move(movesDemo0[i], i % 2 as PlayerIndex),
        120,
    ]);
}

animation.push([() => game0.resetGame(), 2000]);

animation.push([() => {
    gameView0.on('hexClicked', async coords => {
        if (game0.getCurrentPlayerIndex() === 1 || game0.isEnded()) {
            return;
        }

        try {
            const move = game0.createMoveOrSwapMove(coords);
            game0.move(move, game0.getCurrentPlayerIndex());

            if (game0.isEnded()) {
                return;
            }

            const randomMove = await calcRandomMove(game0, 100);
            game0.move(randomMove, game0.getCurrentPlayerIndex());
        } catch (e) {
            if (e instanceof CellAlreadyOccupiedError) {
                return;
            }

            throw e;
        }
    });
}, 0]);

let animationTime = 0;

for (const [action, wait] of animation) {
    animationTime += wait;
    setTimeout(action, animationTime);
}

// Demo 1: swap and play davies 1
const gameSwap = new Game(9);
const container1 = ref<HTMLElement>();
const gameView1 = new CustomizedGameView(gameSwap);

gameSwap.move(Move.fromString('d6'), 0);

gameView1.on('hexClicked', async coords => {
    if (gameSwap.getCurrentPlayerIndex() === 0 || gameSwap.isEnded()) {
        return;
    }

    try {
        const move = gameSwap.createMoveOrSwapMove(coords);
        gameSwap.move(move, gameSwap.getCurrentPlayerIndex());

        if (gameSwap.isEnded()) {
            return;
        }

        const daviesAIMove = await calcDaviesMoveFor9x9Board(gameSwap, 1, 100);
        gameSwap.move(daviesAIMove, gameSwap.getCurrentPlayerIndex());
    } catch (e) {
        if (e instanceof CellAlreadyOccupiedError) {
            return;
        }

        throw e;
    }
});

onMounted(async () => {
    if (!container0.value) {
        throw new Error('no container0');
    }

    if (!container1.value) {
        throw new Error('no container1');
    }

    await gameView0.mount(container0.value);
    await gameView1.mount(container1.value);
});

const router = useRouter();
const { aiConfigs } = storeToRefs(useAiConfigsStore());

const playVsAI = async () => {
    const firstAiConfig = aiConfigs.value[0]; // Should be the easiest AI

    const hostedGame = await apiPostGame({
        boardsize: 11,
        opponentType: 'ai',
        opponentPublicId: firstAiConfig.player.publicId,
        timeControlType: {
            family: 'fischer',
            options: {
                initialTime: 30000,
                timeIncrement: 5000,
            },
        },
    });

    await router.push({
        name: 'online-game',
        params: {
            gameId: hostedGame.publicId,
        },
    });
};
</script>

<template>
    <div class="container my-3">
        <h1>{{ $t('how_to_play_hex') }}</h1>

        <p>Hex is a simple game but hard to master. It has <strong>only 2 rules</strong>.</p>

        <h2>Rule 1: Connect your sides</h2>

        <p>To win, you must <strong>connect your sides</strong> with a fully connected path.</p>

        <div class="card mb-3">
            <div class="card-body">
                <div ref="container0" class="board"></div>

                <p class="text-center mb-0">You are <span class="text-danger">Red</span>, you play first, try to connect <span class="text-danger">Red</span> sides.</p>
            </div>
        </div>

        <p><IconInfoCircle /> Stones are played this way:</p>

        <ul>
            <li>Each player <strong>place a stone one by one</strong></li>
            <li>once placed, <strong>a stone is never removed</strong></li>
        </ul>


        <h2>Rule 2: Swap rule</h2>

        <p>
            Because <span class="text-danger">Red</span> always plays first,
            he has a strong advantage.
        </p>

        <p>
            To ensure balanced games, we use the <strong>swap rule</strong>:
        </p>

        <p>
            On the <strong>first turn only</strong>, the second player (<span class="text-primary">Blue</span>) may choose to "steal" <span class="text-danger">Red</span>'s opening move instead of placing a stone.
        </p>

        <div class="card mb-3">
            <div class="card-body">
                <div ref="container1" class="board"></div>

                <p class="text-center mb-0">
                    You are <span class="text-primary">Blue</span> and play second.
                    <span class="text-danger">Red</span>’s opening move is too strong
                    —
                    click it to <strong>swap</strong>!
                </p>
            </div>
        </div>

        <p><IconInfoCircle /> The swap rule keeps games balanced:</p>

        <ul>
            <li><span class="text-danger">Red</span> opens with a strong move <IconArrowRight /> <span class="text-primary">Blue</span> swaps and gets the advantage.</li>
            <li><span class="text-danger">Red</span> opens with a weak move <IconArrowRight /> <span class="text-primary">Blue</span> does not swap, keeps his advantage and places a blue stone.</li>
        </ul>

        <p>So <span class="text-danger">Red</span> should open the game with a fair opening move.</p>

        <p><strong>What is a fair opening move?</strong></p>

        <p>
            A good, balanced opening move is usually near <span class="text-danger">Red</span>'s sides.
            If <span class="text-danger">Red</span> opens in the center, corners or near <span class="text-primary">Blue</span> sides, <span class="text-primary">Blue</span> should swap.
        </p>

        <p class="lead text-center congrats"><IconCheck /> Congrats! You know how to play Hex!</p>


        <h2>What to do next</h2>

        <div class="row what-next">
            <div class="col mt-3">
                <div class="card h-100">
                    <div class="card-body">
                        <p class="card-text">Play a complete game against an easy AI opponent</p>

                        <button
                            @click="playVsAI"
                            class="btn btn-lg btn-success stretched-link"
                            type="button"
                            style="margin-bottom: 0"
                            :disabled="aiConfigs.length === 0"
                        >Play vs AI</button>
                    </div>
                </div>
            </div>
            <div class="col mt-3">
                <div class="card h-100">
                    <div class="card-body">
                        <p class="card-text">
                            Learn tactical and strategic fundamentals by solving some Hex puzzles
                            <br>
                            <small class="text-body-secondary">by Matthew Seymour</small>
                        </p>

                        <a
                            class="btn btn-lg btn-success stretched-link"
                            href="http://www.mseymour.ca/hex_puzzle/"
                            target="_blank"
                        >Solve some Hex puzzles <IconBoxArrowUpRight /></a>
                    </div>
                </div>
            </div>
        </div>

        <p class="mt-4">or you can also</p>

        <ul class="list-unstyled">
            <li>
                <a
                    href="https://discord.gg/59SJ9KwvVq"
                    target="_blank"
                >Join Hex Discord <IconBoxArrowUpRight /></a>
            </li>

            <li>
                <a
                    href="https://www.hexwiki.net/index.php/Strategy_roadmap"
                    target="_blank"
                >Read the strategy roadmap on the HexWiki <IconBoxArrowUpRight /></a>
            </li>

            <li>
                <a
                    href="http://www.mseymour.ca/hex_book/hexstrat.html"
                    target="_blank"
                >Read a deeper strategy guide <IconBoxArrowUpRight /></a>
            </li>
        </ul>
    </div>
</template>

<style lang="stylus" scoped>
.what-next
    .card-body
        text-align center
        display flex
        flex-direction column
        justify-content space-between

.congrats
    margin-top 2em
    margin-bottom 3em

.container
    max-width 50em

    p
        font-size 1.2em

        &.lead
            font-size 1.5em

h2
    margin-top 1em
    margin-bottom 0.5em

.board
    width 100%
    height 60vh
</style>
