<script setup lang="ts">
/*
 * Players, evaluation and tree of the analysis, with what edits current node.
 * AI settings are in AI tab.
 */
import { inject } from 'vue';
import { hexplorerKey } from '../composables/useHexplorer.js';
import { HEXPLORER_COMMENT_MAX_LENGTH } from '../../../../shared/app/hexplorerStudy.js';
import EvaluationGraph from './EvaluationGraph.vue';
import MoveTree from './MoveTree.vue';
import HexplorerSetupTools from './HexplorerSetupTools.vue';
import HexplorerPlayerNameInput from './HexplorerPlayerNameInput.vue';
import {
    IconChatRightText,
    IconDiagram2,
    IconGraphUp,
} from '../../icons.js';

const {
    tree,
    currentNodeId,
    aiEnabled,
    evalHistory,
    evalCursorIndex,
    goToEvalIndex,
    userGoToNode,
    currentComment,
} = inject(hexplorerKey)!;
</script>

<template>
    <div>
        <div class="d-flex gap-3 border rounded bg-body px-2 py-1 mb-3">
            <HexplorerPlayerNameInput :player="0" class="flex-grow-1" />
            <HexplorerPlayerNameInput :player="1" class="flex-grow-1" />
        </div>

        <template v-if="aiEnabled">
            <h6 class="d-flex align-items-center gap-2 mb-2">
                <IconGraphUp /> {{ $t('hexplorer.evaluation') }}
            </h6>
            <EvaluationGraph
                :evalHistory
                :cursorIndex="evalCursorIndex"
                class="mb-3 bg-body"
                @select="goToEvalIndex"
            />
        </template>

        <h6 class="d-flex align-items-center gap-2 mb-2">
            <IconDiagram2 /> {{ $t('hexplorer.move_history') }}
        </h6>
        <div class="move-tree-wrapper bg-body mb-2">
            <MoveTree
                :tree
                :nodeId="0"
                :currentNodeId
                @select="userGoToNode"
            />
        </div>

        <HexplorerSetupTools />

        <h6 class="d-flex align-items-center gap-2 mt-3 mb-2">
            <IconChatRightText /> {{ $t('hexplorer.comment') }}
        </h6>
        <textarea
            v-model="currentComment"
            class="form-control form-control-sm mb-3"
            rows="3"
            :maxlength="HEXPLORER_COMMENT_MAX_LENGTH"
            :placeholder="$t('hexplorer.comment_placeholder')"
            :aria-label="$t('hexplorer.comment')"
        ></textarea>
    </div>
</template>

<style lang="stylus" scoped>
.move-tree-wrapper
    max-height 50vh
    min-height 5rem
    overflow auto
    border 1px solid var(--bs-border-color)
    border-radius var(--bs-border-radius)
    padding 0.5rem
</style>
