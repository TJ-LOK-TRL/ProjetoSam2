<template>
    <div ref="timeline" class="timeline" @wheel.prevent="onScroll">
        <div class="timeline-numeration-container" @click="setVideoTime">
            <label v-for="(mark, index) in numerationMarks" :key="index" class="timeline-numeration-item"
                :style="{ flexGrow: mark.grow }">
                <span v-if="mark.type === 'label'" class="timeline-numeration-seconds">{{ mark.value }}</span>
                <i v-else-if="mark.type === 'icon'" class="timeline-numeration-dot fa-solid fa-circle"></i>
                <div v-else-if="mark.type === 'blank'" class="timeline-numeration-blank">*</div>
            </label>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, computed, watch } from 'vue'
    import { useTimelineStore } from '@/stores/timeline'

    const timelineStore = useTimelineStore()

    const timeline = ref(null)
    const numerationMarks = ref([])

    const amplitudeConfiguration = ref({
        1: { interval: 0.25, steps: 2 },
        5: { interval: 0.5, steps: 4 },
        10: { interval: 1, steps: 4 },
        20: { interval: 2, steps: 3 },
        30: { interval: 5, steps: 4 },
        60: { interval: 10, steps: 4 },
        180: { interval: 30, steps: 4 },
        360: { interval: 60, steps: 4 },
    })

    function getIntervalToFit(durationToFit) {
        const keys = Object.keys(amplitudeConfiguration.value)
            .map(Number)
            .sort((a, b) => a - b)

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i]
            if (durationToFit <= key) {
                return amplitudeConfiguration.value[key]
            }
        }

        const lastKey = keys[keys.length - 1]
        return amplitudeConfiguration.value[lastKey]
    }

    async function setVideoTime(event) {
        const timelineEl = event.currentTarget
        const rect = timelineEl.getBoundingClientRect()
        const clickX = event.clientX - rect.left

        await timelineStore.setPercentage((clickX / rect.width) * 100)
    }

    function addTimelineNumeration() {
        numerationMarks.value = []

        const minDuration = timelineStore.minDuration
        const maxDuration = timelineStore.maxDuration

        const intervalConfiguration = getIntervalToFit(maxDuration - minDuration)
        const secondsPerStep = intervalConfiguration.interval / (intervalConfiguration.steps + 1)

        for (let t = minDuration; t <= maxDuration; t += intervalConfiguration.interval) {
            numerationMarks.value.push({ type: 'label', value: `${intervalConfiguration.interval < 1 ? t.toFixed(1) : t.toFixed(1)}s`, grow: 1 })
            //numerationMarks.value.push({ type: 'label', value: `${t}s`, grow: 1 })

            let nextT = t + intervalConfiguration.interval
            if (nextT <= maxDuration) {
                for (let n = 0; n < intervalConfiguration.steps; n++) {
                    numerationMarks.value.push({ type: 'icon', grow: 1 })
                }
            } else {
                const remainingSeconds = maxDuration - t // ex. 28.4 - 25 = 3.4
                const fullSteps = Math.floor(remainingSeconds / secondsPerStep) // ex. floor(3.4 / 1) = 3
                const leftover = remainingSeconds - (fullSteps * secondsPerStep) // ex. 3.4 - (3 * 1) = 0.4

                for (let n = 0; n < fullSteps; n++) {
                    numerationMarks.value.push({ type: 'icon', grow: 1 })
                }

                const leftoverRatio = leftover / secondsPerStep // ex. 0.4 / 1 = 0.4
                if (leftoverRatio > 0) {
                    numerationMarks.value[numerationMarks.value.length - 1].grow = 0
                    numerationMarks.value.push({ type: 'blank', grow: leftoverRatio })
                }
            }
        }

        if (numerationMarks.value.length > 0) {
            if (numerationMarks.value[numerationMarks.value.length - 1].type != 'blank') {
                numerationMarks.value[numerationMarks.value.length - 1].grow = 0
            } else if (numerationMarks.value.length > 1) {
                numerationMarks.value[numerationMarks.value.length - 2].grow = 0
            }
        }

    }

    function onScroll(event) {
        if (!timelineStore.duration || !timelineStore.maxDuration) return

        if (event.deltaY < 0) {
            timelineStore.zoomIn()
        } else {
            timelineStore.zoomOut()
        }
    }

    watch(() => ({
        zoom: timelineStore.zoom,
        max: timelineStore.maxDuration,
        min: timelineStore.minDuration
    }), () => {
        addTimelineNumeration()
    })

    onMounted(() => {
        addTimelineNumeration()
    })

</script>

<style scoped>
    .timeline {
        display: flex;
        flex-direction: column;
        background-color: white;
        border-bottom: 1px solid rgb(228, 229, 231);
    }

    .timeline-numeration-container {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        width: 100%;
        height: 25px;
    }

    .timeline-numeration-item {
        flex-basis: 0;
        flex-shrink: 1;
        min-width: 0;
    }

    .timeline-numeration-seconds {
        display: inline-block;
        transform: translateX(-50%);
        font-size: 10px;
        color: initial;
    }

    .timeline-numeration-dot {
        display: inline-block;
        transform: translateX(-50%);
        font-size: 3px;
        color: gray;
    }

    .timeline-numeration-blank {
        height: 100%;
        visibility: hidden;
    }
</style>