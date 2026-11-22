<script setup lang="ts">
import { ref } from 'vue';
import { useSeoMeta } from '@unhead/vue';
import { katahexModels } from '../../../shared/app/katahexModels.js';
import { apiGetMirroredKatahexModels } from '../../apiClient.js';
import { IconDownload, IconGithub } from '../icons.js';

useSeoMeta({
    title: 'KataHex',
    description: 'KataHex, the Hex AI created by HZY. Download KataHex neural network models.',
});

const mainModels = katahexModels.filter(model => !model.special);
const specialModels = katahexModels.filter(model => model.special);

const mirrored = ref<string[]>([]);

void apiGetMirroredKatahexModels().then(filenames => mirrored.value = filenames);
</script>

<template>
    <div class="container my-5 katahex-page">
        <div class="text-center mb-4">
            <h1 class="display-5 fw-bold mb-2">KataHex</h1>

            <p class="lead text-body-secondary">
                The strongest Hex AI, built on <a href="https://github.com/lightvector/KataGo" target="_blank">KataGo</a>.
                It powers game analysis, Hexplorer and puzzles on PlayHex.
            </p>
        </div>

        <div class="card shadow-sm mb-5">
            <div class="card-body d-flex flex-column flex-sm-row align-items-center gap-4 text-center text-sm-start">
                <a href="https://github.com/hzyhhzy" target="_blank" class="flex-shrink-0">
                    <img
                        src="https://github.com/hzyhhzy.png?size=240"
                        alt="HZY GitHub avatar"
                        width="120"
                        height="120"
                        class="rounded-circle shadow"
                    >
                </a>

                <div>
                    <p class="text-body-secondary text-uppercase small fw-semibold mb-1">Created by</p>
                    <h2 class="h3 fw-bold mb-1">HZY</h2>
                    <p class="mb-3">
                        <a href="https://github.com/hzyhhzy" target="_blank">@hzyhhzy</a> on GitHub.
                        Thank you for making KataHex!
                    </p>

                    <a href="https://github.com/hzyhhzy/KataGomo" target="_blank" class="btn btn-outline-secondary btn-sm">
                        <IconGithub /> hzyhhzy/KataGomo
                    </a>
                </div>
            </div>
        </div>

        <h2 class="h4 mb-3">Models</h2>

        <div class="d-flex flex-column gap-3">
            <div
                v-for="model in mainModels"
                :key="model.filename"
                class="card shadow-sm"
                :class="{ 'border-success': model.recommended }"
            >
                <div class="card-body d-flex flex-column flex-md-row gap-3">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-baseline gap-2 flex-wrap">
                            <span class="badge text-bg-primary">{{ model.version }}</span>
                            <code class="fs-6">{{ model.filename }}</code>
                            <span class="text-body-secondary small">{{ model.size }} · {{ model.network }}</span>
                            <span v-if="model.recommended" class="badge text-bg-success">Recommended</span>
                        </div>
                        <p v-if="model.elo" class="mb-0 mt-1 fw-semibold text-success-emphasis">{{ model.elo }}</p>
                        <p class="mb-0 mt-1 text-body-secondary">{{ model.description }}</p>
                    </div>
                    <div class="d-flex flex-column justify-content-between align-items-md-end gap-2 flex-shrink-0">
                        <div class="d-flex gap-2">
                            <a :href="model.originUrl" target="_blank" class="btn btn-primary">
                                <IconDownload /> Origin
                            </a>
                            <a
                                v-if="mirrored.includes(model.filename)"
                                :href="`/katahex-models/${model.filename}`"
                                download
                                class="btn btn-outline-primary"
                            >
                                <IconDownload /> PlayHex mirror
                            </a>
                        </div>
                        <a v-if="model.releaseUrl" :href="model.releaseUrl" target="_blank" class="small">Release notes</a>
                    </div>
                </div>
            </div>
        </div>

        <h3 class="h6 mt-5 mb-2 text-body-secondary">Special case</h3>

        <ul class="list-unstyled small text-body-secondary">
            <li v-for="model in specialModels" :key="model.filename" class="mb-2">
                <span class="badge text-bg-secondary me-1">{{ model.version }}</span>
                <code>{{ model.filename }}</code>
                <span class="ms-1">{{ model.size }}</span>
                &mdash; {{ model.description }}
                <a :href="model.originUrl" target="_blank" class="ms-1">Origin</a>
                <template v-if="mirrored.includes(model.filename)">
                    · <a :href="`/katahex-models/${model.filename}`" download>PlayHex mirror</a>
                </template>
                <template v-if="model.releaseUrl">
                    · <a :href="model.releaseUrl" target="_blank">Release notes</a>
                </template>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.katahex-page {
    max-width: 50rem;
}
</style>
