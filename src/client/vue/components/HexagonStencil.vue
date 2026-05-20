<script lang="ts">
import { defineComponent } from 'vue';
import { BoundingBox, DraggableArea, StencilPreview, SimpleHandler, SimpleLine } from 'vue-advanced-cropper';

// Flat-top regular hexagon, centered in a square bounding box.
// top/bottom edges are inset ~6.7% = (1 - √3/2) / 2 * 100
const HEX_CLIP = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';

export default defineComponent({
    name: 'HexagonStencil',

    components: { StencilPreview, BoundingBox, DraggableArea },

    props: {
        image: { type: Object },
        coordinates: { type: Object },
        stencilCoordinates: { type: Object },
        handlers: { type: Object },
        handlersComponent: { default: () => SimpleHandler },
        lines: { type: Object },
        linesComponent: { default: () => SimpleLine },
        aspectRatio: { type: [Number, String] },
        minAspectRatio: { type: [Number, String] },
        maxAspectRatio: { type: [Number, String] },
        movable: { type: Boolean, default: true },
        resizable: { type: Boolean, default: true },
        transitions: { type: Object },
    },

    data() {
        return {
            moving: false,
            resizing: false,
            hexClip: HEX_CLIP,
        };
    },

    computed: {
        style(): Record<string, string> {
            const { height, width, left, top } = this.stencilCoordinates as Record<string, number>;
            const style: Record<string, string> = {
                width: `${width}px`,
                height: `${height}px`,
                transform: `translate(${left}px, ${top}px)`,
            };
            const t = this.transitions as { enabled: boolean, time: number, timingFunction: string } | undefined;
            if (t?.enabled) {
                style.transition = `${t.time}ms ${t.timingFunction}`;
            }
            return style;
        },
    },

    methods: {
        onMove(e: unknown) { this.$emit('move', e); this.moving = true; },
        onMoveEnd() { this.$emit('move-end'); this.moving = false; },
        onResize(e: unknown) { this.$emit('resize', e); this.resizing = true; },
        onResizeEnd() { this.$emit('resize-end'); this.resizing = false; },
        aspectRatios() {
            return {
                minimum: this.aspectRatio || this.minAspectRatio,
                maximum: this.aspectRatio || this.maxAspectRatio,
            };
        },
    },
});
</script>

<template>
    <div class="hexagon-stencil" :style="style">
        <BoundingBox
            :width="(stencilCoordinates as any).width"
            :height="(stencilCoordinates as any).height"
            :transitions="transitions"
            :handlers="handlers"
            :handlersComponent
            :lines="lines"
            :linesComponent
            :resizable="resizable"
            @resize="onResize"
            @resizeEnd="onResizeEnd"
        >
            <DraggableArea :movable="movable" @move="onMove" @moveEnd="onMoveEnd">
                <StencilPreview
                    class="hexagon-stencil__preview"
                    :image="image"
                    :coordinates="coordinates"
                    :width="(stencilCoordinates as any).width"
                    :height="(stencilCoordinates as any).height"
                    :transitions="transitions"
                />
            </DraggableArea>
        </BoundingBox>

    </div>
</template>

<style scoped lang="stylus">
.hexagon-stencil
    position absolute
    cursor move

    &__preview
        position absolute
        width 100%
        height 100%
        clip-path v-bind(hexClip)

</style>
