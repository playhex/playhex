<script setup lang="ts">
/*
 * Shown when switching puzzle editor to expert mode,
 * explains the features it adds.
 */
import { useDisclosure } from '@overlastic/vue';
import { IconAsterisk, IconMagic, IconRobot, IconShuffle, IconZoomOut } from '../../icons.js';

const { visible, confirm, cancel } = useDisclosure();

const features = [
    { icon: IconZoomOut, title: 'puzzles.editor.zoom_out', help: 'puzzles.editor.expert_zoom_help' },
    { icon: IconAsterisk, title: 'puzzles.editor.add_else', help: 'puzzles.editor.else_help' },
    { icon: IconShuffle, title: 'puzzles.editor.parallel', help: 'puzzles.editor.parallel_help' },
    { icon: IconRobot, title: 'puzzles.editor.ai_eval', help: 'puzzles.editor.ai_eval_help' },
];
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="cancel()">
            <div class="modal-dialog modal-dialog-centered" @click="e => e.stopPropagation()">
                <div class="modal-content">
                    <button type="button" class="btn-close position-absolute top-0 end-0 m-3 z-3" @click="cancel()"></button>

                    <div class="modal-body pt-4 px-4 pb-3">
                        <div class="d-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary mx-auto mb-3" style="width:4rem;height:4rem;font-size:1.75rem">
                            <IconMagic />
                        </div>

                        <h5 class="mb-1 text-center">{{ $t('puzzles.editor.expert_mode_title') }}</h5>
                        <p class="my-3">{{ $t('puzzles.editor.expert_mode_intro') }}</p>

                        <ul class="list-unstyled mb-0">
                            <li v-for="feature in features" :key="feature.title" class="d-flex gap-3 mb-3">
                                <component :is="feature.icon" class="flex-shrink-0 fs-5 text-primary mt-1" />
                                <div>
                                    <div class="fw-semibold">{{ $t(feature.title) }}</div>
                                    <div class="small text-body-secondary">{{ $t(feature.help) }}</div>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div class="modal-footer border-0 pt-0">
                        <button type="button" class="btn btn-primary w-100" @click="confirm()">{{ $t('puzzles.editor.expert_mode_ok') }}</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-backdrop show"></div>
    </div>
</template>
