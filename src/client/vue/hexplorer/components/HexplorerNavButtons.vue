<script setup lang="ts">
/*
 * Navigation in tree and current player, below the board.
 */
import { inject } from 'vue';
import { hexplorerKey } from '../composables/useHexplorer.js';
import { IconArrowDownUp, IconChevronLeft, IconChevronRight, IconCircleFill, IconTrash } from '../../icons.js';

const {
    state,
    goToParent,
    goToFirstChild,
    pass,
    canDeleteCurrentNode,
    deleteCurrentNode,
    updateAnalysis,
} = inject(hexplorerKey)!;

const changeCurrentPlayer = (): void => {
    state.value.currentPlayer = state.value.currentPlayer === 0 ? 1 : 0;
    void updateAnalysis();
};
</script>

<template>
    <div class="btn-group" v-if="!state.setupMode">
        <button
            @click="goToParent()"
            class="btn btn-outline-primary"
            :title="$t('hexplorer.go_back')"
        ><IconChevronLeft /></button>

        <button
            @click="goToFirstChild()"
            class="btn btn-outline-primary"
            :title="$t('hexplorer.go_forward')"
        ><IconChevronRight /></button>

        <button
            @click="deleteCurrentNode()"
            class="btn btn-outline-danger"
            :disabled="!canDeleteCurrentNode"
            :title="$t('hexplorer.delete_branch')"
        ><IconTrash /></button>

        <button
            @click="pass()"
            class="btn btn-outline-warning d-flex align-items-center gap-1"
            :title="$t('hexplorer.pass_turn')"
        ><IconArrowDownUp /> {{ $t('pass') }}</button>
    </div>

    <button
        @click="changeCurrentPlayer()"
        class="btn d-flex align-items-center gap-2"
        :class="state.currentPlayer === 0 ? 'btn-danger' : 'btn-primary'"
        :title="$t('hexplorer.change_current_player')"
    >
        <IconCircleFill />
        {{ state.currentPlayer === 0 ? $t('game.red') : $t('game.blue') }}
    </button>
</template>
