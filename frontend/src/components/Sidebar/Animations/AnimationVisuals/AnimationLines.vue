<template>
    <div class="animation-lines-container">
        <svg ref="svgRef" class="animation-overlay">
            <!-- Renderiza segmentos entre pontos -->
            <template v-for="line in visibleLines" :key="line.id">
                <template v-for="(point, i) in line.points.slice(0, -1)" :key="`${line.id}-${i}`">
                    <line :x1="point.x" :y1="point.y" :x2="line.points[i + 1].x" :y2="line.points[i + 1].y" stroke="red"
                        stroke-width="4" class="line-segment" @mousedown.prevent="onLineClick($event, line, i)" />
                </template>

                <!-- Se permitido, desenha os pontos interativos -->
                <template v-if="line.allowModification">
                    <circle v-for="(point, i) in line.points" :key="`circle-${line.id}-${i}`" :cx="point.x"
                        :cy="point.y" r="6" fill="blue" class="drag-point"
                        @mousedown.prevent="startDragging(line, point)" />
                </template>
            </template>
        </svg>
    </div>
</template>

<script setup>
    import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
    import { useVideoEditor } from '@/stores/videoEditor'
    import { useTimelineStore } from '@/stores/timeline.js'
    import { getRectWithZoom } from '@/assets/js/utils.js'

    const videoEditor = useVideoEditor()
    const timelineStore = useTimelineStore()

    const lines = computed(() => videoEditor.lines)
    const visibleLines = computed(() =>
        Array.from(lines.value.values()).filter(line => line.visible)
    )

    const dragging = ref(null)
    const svgRef = ref(null)

    function startDragging(line, point) {
        dragging.value = { line, point }
    }

    function onMouseMove(e) {
        if (!dragging.value) return

        const zoom = videoEditor.zoomLevel;
        const bounds = getRectWithZoom(svgRef.value, zoom)
        if (!bounds) return

        const x = (e.clientX / zoom - bounds.left)
        const y = (e.clientY / zoom - bounds.top)

        dragging.value.point.x = x
        dragging.value.point.y = y
    }

    function stopDragging() {
        dragging.value = null
    }

    function onLineClick(e, line, i) {
        if (!line.allowModification) return

        const zoom = videoEditor.zoomLevel;
        const rect = getRectWithZoom(svgRef.value, zoom)
        if (!rect) return

        const x = (e.clientX / zoom - rect.left)
        const y = (e.clientY / zoom - rect.top)

        const p0 = line.points[i]
        const p1 = line.points[i + 1]

        // calcula alpha (proporção do clique no segmento)
        const dx = p1.x - p0.x
        const dy = p1.y - p0.y
        const lengthSquared = dx * dx + dy * dy

        const alpha = lengthSquared === 0
            ? 0
            : ((x - p0.x) * dx + (y - p0.y) * dy) / lengthSquared

        const clampedAlpha = Math.max(0, Math.min(1, alpha))
        const time = p0.time + clampedAlpha * (p1.time - p0.time)

        const newPoint = { x, y, time }
        line.points.push(newPoint)
        line.points.sort((a, b) => a.time - b.time)

        dragging.value = { point: newPoint, line }
    }

    onMounted(() => {
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', stopDragging)
    })
    onBeforeUnmount(() => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', stopDragging)
    })

</script>

<style scoped>
    .animation-lines-container {
        position: relative;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .animation-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: visible;
    }

    .drag-point {
        cursor: grab;
        pointer-events: auto;
    }

    .line-segment {
        /* cursor: pointer; */
        pointer-events: auto;
    }
</style>