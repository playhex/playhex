<script setup lang="ts">
import { IconThreeDots } from '../../icons.js';

/*
 * Empty bracket item, used as placeholder,
 * for example in swiss tournaments, fill future rounds
 * to show how many rounds it will have
 */
</script>

<template>
    <div class="card border-secondary">
        <div class="card-body">
            <p class="mb-2">-</p>
            <p class="my-0">-</p>
        </div>
        <div class="card-footer">
            <span class="text-secondary">
                <IconThreeDots />
            </span>
        </div>
    </div>
</template>
