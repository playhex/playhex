<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';
import { apiGetContributors } from '../../../apiClient';
import type { PlayHexContributors } from '../../../../shared/app/Types';
import { ref } from 'vue';

useSeoMeta({
    title: 'Contributors',
});

const contributors = ref<null | PlayHexContributors>(null);

apiGetContributors().then(result => contributors.value = result);
</script>

<template>
    <h1>PlayHex Contributors</h1>

    <p>Who is behind PlayHex, or has helped make it grow?</p>

    <p>
        <strong><a href="https://github.com/ursi" target="_blank" class="text-decoration-none">Mason</a></strong>
        for hosting his Hex Monthly tournament at PlayHex since the very beginning.
        It has provided valuable feedback, helping illuminate which features are missing.
        <br>
        And for giving the <code>playhex.org</code> domain name to this project. And, with
        <br>
        <strong><a href="https://github.com/eilvelia" target="_blank" class="text-decoration-none">comonoid</a></strong>,
        for their early contributions.
    </p>

    <p>
        <strong><a href="https://github.com/hzyhhzy" target="_blank" class="text-decoration-none">hzyhhzy</a></strong>
        for the KataHex neural network. It allows running game analysis very efficiently, which is one of PlayHex's key features.
        <br>
        <strong><a href="https://github.com/selinger" target="_blank" class="text-decoration-none">Quasar</a></strong>
        for the KataHex adaptation from KataGo (coordinate system, documentation).
    </p>

    <p>
        The Hex community at the <a href="https://discord.gg/59SJ9KwvVq" target="_blank">Hex Discord</a>,
        which is still testing PlayHex and giving feedback.
    </p>

    <h2>Code contributors</h2>

    <ul v-if="contributors?.github && contributors.github.length > 0" class="list-inline">
        <li v-for="contributor in contributors.github" :key="contributor.username" class="list-inline-item me-3 mb-3">
            <a :href="contributor.link" class="text-decoration-none" target="_blank">
                <img :src="contributor.avatarUrl" class="rounded" width="24" :alt="`${contributor.username}'s avatar'`" />
                {{ contributor.username }}
            </a>
        </li>
    </ul>

    <p>See <a href="https://github.com/alcalyn/hex" target="_blank">PlayHex on Github</a>.</p>

    <h2>Translators</h2>

    <ul v-if="contributors?.weblate && Object.keys(contributors.weblate).length > 0" class="list-unstyled">
        <li v-for="weblateContributors, lang in contributors.weblate" :key="lang" class="mb-3">
            <strong>{{ lang }}</strong>
            <ul class="list-inline">
                <li v-for="contributor in weblateContributors" :key="contributor.fullName" class="list-inline-item me-3">
                    <a v-if="contributor.link" :href="contributor.link" target="_blank">{{ contributor.fullName }}</a>
                    <template v-else>{{ contributor.fullName }}</template>
                </li>
            </ul>
        </li>
    </ul>

    <p><small>Let me know if you want to change your name or your link.</small></p>

    <p>Want to help translating? <a href="https://hosted.weblate.org/engage/playhex/" target="_blank">Translate PlayHex here</a>.</p>
</template>
