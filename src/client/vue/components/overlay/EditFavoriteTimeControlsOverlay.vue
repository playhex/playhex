<script setup lang="ts">
import { t } from 'i18next';
import { useDisclosure } from '@overlastic/vue';
import { PropType, ref } from 'vue';
import { IconList, IconTrash } from '../../icons.js';
import { timeControlToString, type TimeControlCadency } from '../../../../shared/app/timeControlUtils.js';
import type { PlayerFavoriteTimeControl } from '../../../../shared/app/models/index.js';

type EditableEntry = {
    name: null | string;
    cadency: TimeControlCadency;
    timeControlType: PlayerFavoriteTimeControl['timeControlType'];
};

const { visible, confirm, cancel } = useDisclosure();

const props = defineProps({
    favorites: {
        type: Array as PropType<PlayerFavoriteTimeControl[]>,
        required: true,
    },
});

const items = ref<EditableEntry[]>(
    props.favorites.map(f => ({
        name: f.name,
        cadency: f.cadency,
        timeControlType: f.timeControlType,
    })),
);

const dragFromIndex = ref<null | number>(null);
const draggableIndex = ref<null | number>(null);

const onHandleMousedown = (index: number): void => {
    draggableIndex.value = index;
};

const onHandleMouseup = (): void => {
    draggableIndex.value = null;
};

const onDragStart = (index: number): void => {
    dragFromIndex.value = index;
};

const onDragOver = (index: number, e: DragEvent): void => {
    e.preventDefault();
    if (dragFromIndex.value === null || dragFromIndex.value === index) return;

    const moved = items.value.splice(dragFromIndex.value, 1)[0];
    items.value.splice(index, 0, moved);
    dragFromIndex.value = index;
};

const onDragEnd = (): void => {
    dragFromIndex.value = null;
    draggableIndex.value = null;
};

const remove = (index: number): void => {
    items.value.splice(index, 1);
};

const submit = (): void => {
    confirm(items.value);
};
</script>

<template>
    <div v-if="visible">
        <div class="modal d-block" @click="cancel()">
            <div class="modal-dialog" @click="e => e.stopPropagation()">
                <form class="modal-content" @submit.prevent="submit()">
                    <div class="modal-header">
                        <h5 class="modal-title">{{ t('time_control.edit_presets_title') }}</h5>
                        <button type="button" class="btn-close" @click="cancel()"></button>
                    </div>
                    <div class="modal-body p-0">
                        <ul class="list-group list-group-flush">
                            <li
                                v-for="(item, index) in items"
                                :key="index"
                                :draggable="draggableIndex === index"
                                class="list-group-item d-flex align-items-center gap-2 py-2"
                                :class="{ 'opacity-50': dragFromIndex === index }"
                                @dragstart="onDragStart(index)"
                                @dragover="onDragOver(index, $event)"
                                @dragend="onDragEnd()"
                            >
                                <span
                                    class="drag-handle text-muted"
                                    @mousedown="onHandleMousedown(index)"
                                    @mouseup="onHandleMouseup()"
                                ><IconList /></span>

                                <input
                                    v-model="item.name"
                                    type="text"
                                    class="form-control form-control-sm preset-name-input"
                                    :placeholder="item.name ?? timeControlToString(item.timeControlType)"
                                />

                                <span class="text-muted small flex-grow-1">{{ timeControlToString(item.timeControlType) }}</span>

                                <button
                                    type="button"
                                    class="btn btn-outline-danger btn-sm"
                                    @click="remove(index)"
                                ><IconTrash /></button>
                            </li>
                            <li v-if="items.length === 0" class="list-group-item text-muted text-center">
                                {{ t('time_control.no_presets') }}
                            </li>
                        </ul>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" @click="cancel()">{{ t('cancel') }}</button>
                        <button type="submit" class="btn btn-primary">{{ t('save') }}</button>
                    </div>
                </form>
            </div>
        </div>
        <div class="modal-backdrop show d-fixed"></div>
    </div>
</template>

<style lang="stylus" scoped>
.drag-handle
    cursor grab
    font-size 1.2rem

    &:active
        cursor grabbing

.preset-name-input
    width 8rem

    @media (min-width 576px)
        width 12rem
</style>
