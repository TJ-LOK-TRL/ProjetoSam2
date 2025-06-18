<template>
    <div class="movement-config">
        <i class="movement-config-icon fas fa-worm"></i>
        <div class="movement-config-button-container">
            <button @click="resetPositions" class="btn">Reset</button>
            <button @click="saveCurrentPosition" class="btn primary">Save</button>
        </div>
    </div>
</template>

<script setup>
    import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
    import { useVideoEditor } from '@/stores/videoEditor'
    import { useTimelineStore } from '@/stores/timeline'
    import { AnimationTypes, AnimationNames } from '@/assets/js/animationHandler.js'

    const videoEditor = useVideoEditor()
    const timelineStore = useTimelineStore()
    const editorElement = ref(videoEditor.selectedElement)
    const line = ref(videoEditor.lines.get(editorElement.value.id))

    function resetPositions() {
        line.value.points.length = 0
    }

    function saveCurrentPosition() {
        const time = timelineStore.currentTime
        const boxElement = videoEditor.getBoxOfElement(editorElement.value)
        const { x, y } = boxElement.box.getRect()

        const point = { time, x, y }

        const lineId = editorElement.value.id
        line.value = videoEditor.lines.get(lineId)

        if (line.value) {
            // Adiciona o novo ponto à linha existente
            line.value.points.push(point)
            line.value.points.sort((a, b) => a.time - b.time)
        } else {
            // Cria nova linha com este ponto
            videoEditor.addAnimationLine(lineId, [point], true)
        }

        const callbackId = lineId + 'movAnim'
        timelineStore.onUpdate(callbackId, updatePosition)

        console.log('Saved point:', point)
    }

    function getPosition(time) {
        if (!line.value || line.value.points.length === 0) {
            return { x: 0, y: 0 } // valor padrão
        }

        // Se só tem um ponto, retorna ele direto
        if (line.value.points.length === 1) {
            return { x: line.value.points[0].x, y: line.value.points[0].y }
        }

        // Procura os dois pontos mais próximos antes e depois do tempo
        const points = line.value.points

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i]
            const p1 = points[i + 1]

            if (time >= p0.time && time <= p1.time) {
                const alpha = (time - p0.time) / (p1.time - p0.time)
                const x = p0.x + alpha * (p1.x - p0.x)
                const y = p0.y + alpha * (p1.y - p0.y)
                return { x, y }
            }
        }

        // Se o tempo está antes do primeiro ponto
        if (time < points[0].time) {
            return { x: points[0].x, y: points[0].y }
        }

        // Se o tempo está depois do último ponto
        const last = points[points.length - 1]
        return { x: last.x, y: last.y }
    }

    function updatePosition(time) {
        const boxElement = videoEditor.getBoxOfElement(editorElement.value)
        if (boxElement) {
            const { x, y } = getPosition(time)
            boxElement.box.setPosition(x, y)
        }
    }

    watch(() => videoEditor.lines, () => { 
        videoEditor.animationHandler.updateAnimationSettings(editorElement.value, AnimationNames.MOVEMENT, AnimationTypes.MOVEMENT, { points: line?.value?.points || [] })
        updatePosition(timelineStore.currentTime) 
    }, { deep: true })

    onMounted(() => {
        if (line.value) line.value.visible = true
    })

    onBeforeUnmount(() => {
        if (line.value) line.value.visible = false
    })


</script>

<style scoped>
    .movement-config {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .movement-config-icon {
        color: rgb(78, 78, 78);
    }

    .movement-config-button-container {
        display: flex;
        gap: 0.5rem;
    }

    .btn {
        padding: 0.5rem 1rem;
        background: #ccc;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .btn.primary {
        background: var(--main-color);
        color: white;
    }
</style>