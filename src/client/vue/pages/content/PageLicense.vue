<script setup lang="ts">
import { useSeoMeta } from '@unhead/vue';

useSeoMeta({
    titleTemplate : title => `License - ${title}`,
});
</script>

<template>
    <h1>License</h1>

    <p>
        This project, Hex server and client, is under a free software / open source license.
    </p>

    <p>
        The license is the GNU AFFERO GENERAL PUBLIC LICENSE.
    </p>

    <p>
        See
        <a href="https://github.com/alcalyn/hex/blob/master/LICENSE" target="_blank">the full license here</a>.
    </p>
</template>
