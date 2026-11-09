<script setup lang="ts">
/**
 * Previous/next buttons and current page, to use with useSearchGamesPagination.
 */
defineProps({
    /**
     * Current page, first is 0
     */
    page: {
        type: Number,
        required: true,
    },
    totalPages: {
        type: Number,
        required: true,
    },
});

defineEmits(['previous', 'next']);
</script>

<template>
    <button @click="$emit('previous')" class="btn btn-sm btn-outline-primary" :class="{ disabled: page < 1 }">{{ $t('previous') }}</button>
    <span>{{ $t('page_page_of_max', { page: page + 1, max: totalPages }) }}</span>
    <button @click="$emit('next')" class="btn btn-sm btn-outline-primary" :class="{ disabled: page + 1 >= totalPages }">{{ $t('next') }}</button>
</template>
