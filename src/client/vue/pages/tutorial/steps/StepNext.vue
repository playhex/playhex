<script setup lang="ts">
import { onMounted } from 'vue';
import { useTutorialControls } from '../../../composables/tutorialControls.js';
import { useTutorialGameCreation } from '../tutorialUtils.js';
import { IconBoxArrowUpRight, IconDiscord, IconPeople, IconPuzzle, IconRobot } from '../../../icons.js';

const { markCompleted } = useTutorialControls();
const { aiConfigs, playVsAI, playVsPlayer } = useTutorialGameCreation();

onMounted(() => void markCompleted('next', { silent: true }));
</script>

<template>
    <h1>{{ $t('tutorial.steps.next') }}</h1>

    <p class="lead">{{ $t('tutorial.onboarding_finished') }}</p>

    <div class="row what-next g-3">
        <div class="col-sm-6">
            <div class="card h-100">
                <div class="card-body">
                    <p class="card-text">
                        <IconRobot class="display-4" />
                        <br>
                        {{ $t('tutorial.play_vs_mohex_desc') }}
                    </p>

                    <button
                        @click="playVsAI('mohex')"
                        class="btn btn-lg btn-success"
                        type="button"
                        :disabled="aiConfigs.length === 0"
                    >{{ $t('tutorial.play_vs_ai_button') }}</button>
                </div>
            </div>
        </div>
        <div class="col-sm-6">
            <div class="card h-100">
                <div class="card-body">
                    <p class="card-text">
                        <IconPeople class="display-4" />
                        <br>
                        {{ $t('tutorial.play_1v1_desc') }}
                    </p>

                    <button
                        @click="playVsPlayer"
                        class="btn btn-lg btn-success"
                        type="button"
                    >{{ $t('tutorial.play_1v1') }}</button>
                </div>
            </div>
        </div>
    </div>

    <p class="mt-4">{{ $t('tutorial.you_can_also') }}</p>

    <div class="what-next-also">
        <router-link
            :to="{ name: 'puzzles' }"
            class="btn btn-outline-primary"
        ><IconPuzzle class="fs-3" /><br>{{ $t('tutorial.do_some_puzzle_button') }}</router-link>

        <a
            href="https://discord.gg/59SJ9KwvVq"
            target="_blank"
            class="btn btn-outline-primary"
        ><IconDiscord class="fs-3" /><br>{{ $t('tutorial.join_hex_discord') }}</a>

        <a
            href="https://www.hexwiki.net/index.php/Strategy_roadmap"
            target="_blank"
            class="btn btn-outline-primary"
        >{{ $t('tutorial.what_should_i_learn_now') }} <IconBoxArrowUpRight /></a>

        <a
            href="http://www.mseymour.ca/hex_book/hexstrat.html"
            target="_blank"
            class="btn btn-outline-primary"
        >{{ $t('tutorial.read_strategy_guide') }} <IconBoxArrowUpRight /></a>

        <a
            href="http://www.mseymour.ca/hex_puzzle/"
            target="_blank"
            class="btn btn-outline-primary"
        >{{ $t('tutorial.do_some_puzzle_desc') }} <small>({{ $t('tutorial.do_some_puzzle_credits') }})</small> <IconBoxArrowUpRight /></a>
    </div>
</template>

<style lang="stylus" scoped>
.what-next
    .card-body
        text-align center
        display flex
        flex-direction column
        justify-content space-between

.what-next-also
    display flex
    justify-content space-between
    gap 1em
    flex-direction row
    flex-wrap wrap
    margin-bottom 2em

    > *
        min-height 6em
        flex 1 0 40%
        display flex
        flex-direction column
        text-align center
        justify-content center
        align-items center
</style>
