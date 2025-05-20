<template>
    <div class="timeline-container" :style="{ maxHeight: currentMaxHeight + '%' }">
        <div class="resizer" @mousedown="startResize"></div>

        <div class="timeline-controllers">
            <div class="">example</div>
            <div class="video-controllers">
                <div class="video-controllers-buttons">
                    <button class="control-btn back" @click="timelineStore.goBack">
                        <i class="fas fa-step-backward"></i>
                    </button>
                    <button class="control-btn togglePlay" @click="timelineStore.togglePlay">
                        <i :class="timelineStore.isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
                    </button>
                    <button class="control-btn forward" @click="timelineStore.goForward">
                        <i class="fas fa-step-forward"></i>
                    </button>
                </div>
                <p class="video-time">{{ formattedTime }}</p>
            </div>
            <div class="zoom-container">
                <div class="zoom-range-container">
                    <i class="zoom-icon fas fa-magnifying-glass-minus" @click="timelineStore.zoomOut"></i>
                    <input class="zoom-input" type="range" :min="timelineStore.minRange" :max="timelineStore.maxRange"
                        :step="0.01" v-model="timelineStore.zoomInverted" />
                    <i class="zoom-icon fas fa-magnifying-glass-plus" @click="timelineStore.zoomIn"></i>
                </div>
                <button class="zoom-fit" @click="timelineStore.zoomFit">Fit</button>
            </div>
        </div>

        <div class="timeline-interactive">
            <TimelineBar />

            <div class="timeline-frames-container" ref="timelineFramesContainerRef">
                <Frames v-for="element in videoEditor.getElements()" :key="element.id" :element="element"
                    :parent="timelineFramesContainerRef" class="timeline-video-frames" ref="framesComponents" />
            </div>

            <div class="timeline-selector" :style="timelineSelectorStyle"></div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, computed, watch } from 'vue'
    import { useVideoEditor } from '@/stores/videoEditor'
    import { useTimelineStore } from '@/stores/timeline'
    import TimelineBar from './TimelineBar.vue'
    import Frames from './Frames/Frame.vue'

    const videoEditor = useVideoEditor()
    const timelineStore = useTimelineStore()

    const props = defineProps({
        parent: Object
    })

    const emit = defineEmits(['resized'])

    const timelineFramesContainerRef = ref(null)
    const framesComponents = ref([]);
    const currentMaxHeight = ref(30)
    let isResizing = false
    let startY = 0
    let startHeight = 0

    const timelineSelectorStyle = ref({ left: '0%' })
    let animationFrameId = null

    const formattedTime = computed(() => {
        const current = timelineStore.currentTime || 0
        const dur = timelineStore.duration || 0
        return `${current.toFixed(1).padStart(4, '0')} / ${dur.toFixed(1)}`
    })

    watch(() => timelineStore.currentPercentage, () => {
        if (timelineStore.lastUpdateOrigin == 'user') {
            timelineSelectorStyle.value.left = `${timelineStore.currentPercentage}%`
        }
    })

    function updateSelectorSmoothly() {
        const currentTime = timelineStore.currentTime
        const min = timelineStore.minDuration
        const max = timelineStore.maxDuration

        const range = max - min
        if (range <= 0) return

        const percentage = ((currentTime - min) / range) * 100

        //console.log(`${percentage}%`)
        timelineSelectorStyle.value.left = `${percentage}%`

        animationFrameId = requestAnimationFrame(updateSelectorSmoothly)
    }

    function startResize(e) {
        isResizing = true
        startY = e.clientY
        startHeight = currentMaxHeight.value // <- altura inicial em %

        document.addEventListener('mousemove', resize)
        document.addEventListener('mouseup', stopResize)
    }

    function resize(e) {
        if (!isResizing) return

        const deltaY = e.clientY - startY
        const container = props.parent
        if (!container) return

        const rect = container.getBoundingClientRect()
        const deltaPercent = (deltaY / rect.height) * 100

        const newHeight = startHeight + deltaPercent * -1 // inverso porque subir no mouse = aumentar altura

        if (newHeight > 25 && newHeight < 65) {
            //console.log('NewHeight:', newHeight)
            currentMaxHeight.value = newHeight
            emit('resized', currentMaxHeight.value)
        }
    }

    function stopResize() {
        isResizing = false
        document.removeEventListener('mousemove', resize)
        document.removeEventListener('mouseup', stopResize)
    }

    onMounted(() => {
        timelineStore.init()
        timelineStore.onPlayed(() => updateSelectorSmoothly())
        timelineStore.onPaused(() => cancelAnimationFrame(animationFrameId))
    })
</script>

<style scoped>
    .timeline-container {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        max-height: 40%;
        padding: 10px;
        background-color: white;
        gap: 25px;
        overflow-x: hidden;
    }

    .timeline-interactive {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
    }

    .timeline-selector {
        position: absolute;
        width: 2px;
        height: calc(100%);
        background-color: var(--main-color);
        transform: translateX(-50%) translateZ(0);
        pointer-events: none;
    }


    .timeline-selector::before {
        content: '';
        position: absolute;
        left: 50%;
        transform: translateX(-50%) rotate(180deg);
        width: 22px;
        height: 11px;
        background-color: var(--main-color);
        border-radius: 4px;
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
    }

    .timeline-controllers {
        display: flex;
        justify-content: space-between;
    }

    .video-controllers {
        display: flex;
        align-items: center;
        gap: 30px;
    }

    .video-controllers-buttons {
        display: flex;
        gap: 10px;
    }

    .control-btn {
        width: 35px;
        height: 35px;
        background-color: #eee;
        border: none;
        font-size: 18px;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        transition: background-color 0.2s;
        text-align: center;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .control-btn:hover {
        background-color: #ddd;
    }

    .video-time {
        font-size: 14px;
        color: #333;
    }

    .resizer {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 5px;
        cursor: row-resize;
        z-index: 10;
    }

    .resizer::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 1px;
        background: rgb(228, 229, 231);
        pointer-events: none;
    }

    .zoom-container {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .zoom-range-container {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .zoom-input {
        width: 100%;
        height: 2px;
        background: #ddd;
        border-radius: 5px;
        outline: none;
        color: var(--main-color);
    }

    .zoom-icon {
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 14px;
        color: #505050;
        cursor: pointer;
        transition: background-color 0.2s;
        width: 40px;
        height: 40px;
        padding: 10px 10px;
        border-radius: 5px;
        cursor: pointer;
    }

    .zoom-icon:hover {
        background-color: rgb(237, 237, 237);
    }

    .zoom-fit {
        background-color: transparent;
        border: none;
        padding: 10px 10px;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.2s;
        width: 40px;
        height: 40px;
        font-size: 17px;
    }

    .zoom-fit:hover {
        background-color: rgb(237, 237, 237);
    }

    .timeline-frames-container {
        position: relative;
        display: flex;
        flex-direction: column-reverse;
        gap: 5px;
        width: 100%;
        height: 100%;
    }

    .timeline-video-frames {
        cursor: pointer;
    }
</style>