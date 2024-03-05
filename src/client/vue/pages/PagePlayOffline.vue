<script setup lang="ts">
/* eslint-env browser */
import GameView from '@client/pixi-board/GameView';
import AppBoard from '../components/AppBoard.vue';
import { Game, IllegalMove, PlayerIndex, calcRandomMove } from '@shared/game-engine';
import { GameOptionsData, defaultGameOptions } from '@shared/app/GameOptions';
import { Ref, onMounted, ref } from 'vue';
import { PlayerData } from '@shared/app/Types';
import useAuthStore from '../../stores/authStore';
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    title: 'Play offline',
    robots: 'noindex',
});

const offlineBoardContainer = ref<HTMLElement>();
const gameView = ref<GameView>();
const selectedGameOptions: Partial<GameOptionsData> = JSON.parse(history.state.gameOptionsJson ?? '{}');
const gameOptions: GameOptionsData = { ...defaultGameOptions, ...selectedGameOptions };
const players: Ref<PlayerData[]> = ref([]);

const makeAIMoveIfApplicable = async (game: Game, players: PlayerData[]): Promise<void> => {
    const player = players[game.getCurrentPlayerIndex()];

    if (!player.isBot || game.isEnded()) {
        return;
    }

    const move = await calcRandomMove(game);

    game.move(move, game.getCurrentPlayerIndex());
};

const initGame = (gameContainer: HTMLElement) => {
    const player: PlayerData = useAuthStore().loggedInPlayer ?? {
        publicId: '',
        isBot: false,
        pseudo: 'Player',
        isGuest: false,
        createdAt: new Date(),
        slug: '',
    };

    players.value = [
        player,
        {
            isBot: true,
            isGuest: false,
            pseudo: 'Random bot',
            slug: '',
            publicId: '',
            createdAt: new Date(),
        },
    ];

    if (1 === gameOptions.firstPlayer) {
        players.value.reverse();
    } else if (null === gameOptions.firstPlayer) {
        if (Math.random() < 0.5) {
            players.value.reverse();
        }
    }

    const playerIndex = players.value.indexOf(player);

    if (0 !== playerIndex && 1 !== playerIndex) {
        throw new Error('Unexpected player index');
    }

    const game = new Game(gameOptions.boardsize);

    gameView.value = new GameView(game, gameContainer);

    gameView.value.on('hexClicked', move => {
        try {
            game.move(move, playerIndex as PlayerIndex);
        } catch (e) {
            if (!(e instanceof IllegalMove)) {
                throw e;
            }
        }
    });

    makeAIMoveIfApplicable(game, players.value);
    game.on('played', () => makeAIMoveIfApplicable(game, players.value));
};

onMounted(() => {
    if (!offlineBoardContainer.value) {
        throw new Error('Missing element with ref="offlineBoardContainer"');
    }

    initGame(offlineBoardContainer.value);
});

/*
 * Rematch
 */
const reload = ref(0);

const rematch = () => {
    if (!offlineBoardContainer.value) {
        throw new Error('Missing element with ref="offlineBoardContainer"');
    }

    initGame(offlineBoardContainer.value);
    ++reload.value;
};
</script>

<template>
    <div class="offline-board-container" ref="offlineBoardContainer">
        <app-board
            :key="reload"
            v-if="gameView"
            :game-view="gameView"
            :players="players"
            :rematch="rematch"
        ></app-board>
    </div>
</template>

<style lang="stylus" scoped>
.offline-board-container
    position relative
    width 100vw
    height calc(100vh - 3rem)
    overflow hidden
</style>
