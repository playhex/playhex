<script setup lang="ts">
import { Player } from 'glicko2';
import { computed, reactive } from 'vue';
import { useSeoMeta } from '@unhead/vue';
import { createRanking } from '../../../../shared/app/ratingUtils';
import AppNumberDiff from '../../components/AppNumberDiff.vue';

useSeoMeta({
    title: 'Rating simulator',
});

const ranking = reactive(createRanking());

const playerA = reactive(ranking.makePlayer(0));
const playerB = reactive(ranking.makePlayer(0));

const winrateA = computed(() => playerA.predict(playerB));

const afterWin = computed(() => {
    const cloneRanking = createRanking();

    const cloneA = cloneRanking.makePlayer(playerA.getRating(), playerA.getRd(), playerA.getVol());
    const cloneB = cloneRanking.makePlayer(playerB.getRating(), playerB.getRd(), playerB.getVol());

    cloneRanking.updateRatings([
        [cloneA, cloneB, 1],
    ]);

    return {
        playerA: cloneA,
        playerB: cloneB,
    };
});

const afterLose = computed(() => {
    const cloneRanking = createRanking();

    const cloneA = cloneRanking.makePlayer(playerA.getRating(), playerA.getRd(), playerA.getVol());
    const cloneB = cloneRanking.makePlayer(playerB.getRating(), playerB.getRd(), playerB.getVol());

    cloneRanking.updateRatings([
        [cloneA, cloneB, 0],
    ]);

    return {
        playerA: cloneA,
        playerB: cloneB,
    };
});

const round = (n: number, precision = 8): number => Math.round(n * (10 ** precision)) / (10 ** precision);
const roundPlayer = (player: Player): void => {
    player.setRating(round(player.getRating(), 2));
    player.setRd(round(player.getRd(), 4));
    player.setVol(round(player.getVol(), 8));
};

const reset = () => {
    playerA.setRating(1500);
    playerA.setRd(150);
    playerA.setVol(0.06);

    playerB.setRating(1500);
    playerB.setRd(150);
    playerB.setVol(0.06);
};

reset();

const calculate = () => {
    ranking.updateRatings([
        [playerA, playerB, 1],
    ]);

    roundPlayer(playerA);
    roundPlayer(playerB);
};
</script>

<template>
    <h1>Rating simulator</h1>

    <p>Player A</p>

    <div class="row g-2">
        <div class="col-sm">
            <div class="form-floating mb-3">
                <input
                    type="number"
                    :value="round(playerA.getRating())"
                    @input="event => playerA.setRating((event.target as any).value)"
                    class="form-control"
                    id="playerARating"
                />
                <label for="playerARating">Rating</label>
            </div>
        </div>
        <div class="col-sm">
            <div class="form-floating mb-3">
                <input
                    type="number"
                    :value="round(playerA.getRd())"
                    @input="event => playerA.setRd((event.target as any).value)"
                    class="form-control"
                    id="playerARd"
                />
                <label for="playerARd">Deviation</label>
            </div>
        </div>
        <div class="col-sm">
            <div class="form-floating mb-3">
                <input
                    type="number"
                    :value="round(playerA.getVol())"
                    @input="event => playerA.setVol((event.target as any).value)"
                    class="form-control"
                    id="playerAVolatility"
                />
                <label for="playerAVolatility">Volatility</label>
            </div>
        </div>
    </div>

    <p>Player B</p>

    <div class="row g-2">
        <div class="col-sm">
            <div class="form-floating mb-3">
                <input
                    type="number"
                    :value="round(playerB.getRating())"
                    @input="event => playerB.setRating((event.target as any).value)"
                    class="form-control"
                    id="playerBRating"
                />
                <label for="playerBRating">Rating</label>
            </div>
        </div>
        <div class="col-sm">
            <div class="form-floating mb-3">
                <input
                    type="number"
                    :value="round(playerB.getRd())"
                    @input="event => playerB.setRd((event.target as any).value)"
                    class="form-control"
                    id="playerBRd"
                />
                <label for="playerBRd">Deviation</label>
            </div>
        </div>
        <div class="col-sm">
            <div class="form-floating mb-3">
                <input
                    type="number"
                    :value="round(playerB.getVol())"
                    @input="event => playerB.setVol((event.target as any).value)"
                    class="form-control"
                    id="playerBVolatility"
                />
                <label for="playerBVolatility">Volatility</label>
            </div>
        </div>
    </div>

    <p class="m-0">Player A Winrate: {{ round(winrateA * 100, 1) }}%</p>
    <div class="row">
        <div class="col-6 col-md-5 col-xl-4">
            <div class="progress-stacked mb-3">
                <div class="progress" role="progressbar" aria-label="Player A winrate" :aria-valuenow="winrateA * 100" aria-valuemin="0" aria-valuemax="100" :style="{ width: (winrateA * 100) + '%' }">
                    <div class="progress-bar bg-success">A</div>
                </div>
                <div class="progress" role="progressbar" aria-label="Player B winrate" :aria-valuenow="(1 - winrateA) * 100" aria-valuemin="0" aria-valuemax="100" :style="{ width: ((1 - winrateA) * 100) + '%' }">
                    <div class="progress-bar bg-danger">B</div>
                </div>
            </div>
        </div>
    </div>


    <div class="row">
        <div class="col">
            <div class="card">
                <div class="card-body">
                    <p class="lead">If player A wins</p>
                    <table class="table table-borderless">
                        <tbody>
                            <tr class="lead">
                                <td>Rating</td>
                                <td>Player A <AppNumberDiff :n="afterWin.playerA.getRating() - playerA.getRating()" /></td>
                                <td>Player B <AppNumberDiff :n="afterWin.playerB.getRating() - playerB.getRating()" /></td>
                            </tr>
                            <tr>
                                <td>Deviation</td>
                                <td><AppNumberDiff :n="afterWin.playerA.getRd() - playerA.getRd()" :precision="2" :colors="false" /></td>
                                <td><AppNumberDiff :n="afterWin.playerB.getRd() - playerB.getRd()" :precision="2" :colors="false" /></td>
                            </tr>
                            <tr>
                                <td>Volatility</td>
                                <td><AppNumberDiff :n="afterWin.playerA.getVol() - playerA.getVol()" :precision="8" :colors="false" /></td>
                                <td><AppNumberDiff :n="afterWin.playerB.getVol() - playerB.getVol()" :precision="8" :colors="false" /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="col">
            <div class="card">
                <div class="card-body">
                    <p class="lead">If playerA loses</p>
                    <table class="table table-borderless">
                        <tbody>
                            <tr class="lead">
                                <td>Rating</td>
                                <td>Player A <AppNumberDiff :n="afterLose.playerA.getRating() - playerA.getRating()" /></td>
                                <td>Player B <AppNumberDiff :n="afterLose.playerB.getRating() - playerB.getRating()" /></td>
                            </tr>
                            <tr>
                                <td>Deviation</td>
                                <td><AppNumberDiff :n="afterLose.playerA.getRd() - playerA.getRd()" :precision="2" :colors="false" /></td>
                                <td><AppNumberDiff :n="afterLose.playerB.getRd() - playerB.getRd()" :precision="2" :colors="false" /></td>
                            </tr>
                            <tr>
                                <td>Volatility</td>
                                <td><AppNumberDiff :n="afterLose.playerA.getVol() - playerA.getVol()" :precision="8" :colors="false" /></td>
                                <td><AppNumberDiff :n="afterLose.playerB.getVol() - playerB.getVol()" :precision="8" :colors="false" /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <button @click="reset" class="btn btn-warning mt-3 me-3">Reset</button>
    <button @click="calculate" class="btn btn-success mt-3 me-3">Player A wins</button>
</template>
