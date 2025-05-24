<template>
    <div class="time-range-container">
        <div class="time-range-left">
            <div class="icon-container">
                <i class="time-icon fa-regular fa-clock"></i>
            </div>

            <div class="time-range-input-container">
                <label class="time-label" @mousedown="onMouseDownStart">Start</label>
                <input class="time-input" v-model="startTime" />
            </div>
        </div>

        <div class="time-range-center">
            <div class="time-range-separator"></div>
        </div>

        <div class="time-range-right">
            <div class="time-range-input-container">
                <label class="time-label" @mousedown="onMouseDownEnd">End</label>
                <input class="time-input" v-model="endTime" />
            </div>

            <div class="icon-container">
                <i class="time-icon fa-regular fa-clock"></i>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue'

    const props = defineProps({
        start: {
            type: Number,
            required: true
        },
        end: {
            type: Number,
            required: true
        }
    })

    const emit = defineEmits(['update:start', 'update:end'])

    const dragging = ref(null)
    const precision = 2
    const step = 0.05 // quanto aumenta por pixel de movimento

    const startTime = computed({
        get: () => props.start.toFixed(precision),
        set: (val) => emit('update:start', parseFloat(val))
    })

    const endTime = computed({
        get: () => props.end.toFixed(precision),
        set: (val) => emit('update:end', parseFloat(val))
    })

    function onMouseDownStart() {
        dragging.value = 'start'
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }
    
    function onMouseDownEnd() {
        dragging.value = 'end'
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }
    
    function onMouseMove(e) {
        if (!dragging.value) return

        const delta = e.movementX * step

        if (dragging.value === 'start') {
            const newStart = Math.max(0, props.start + delta)
            emit('update:start', newStart)
        } else if (dragging.value === 'end') {
            const newEnd = Math.max(0, props.end + delta)
            emit('update:end', newEnd)
        }
    }

    function onMouseUp() {
        dragging.value = null
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
    }

</script>

<style scoped>
    .time-range-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 48px;
        padding: 0.4rem 1rem;
        border: 0.5px solid rgb(246, 245, 245);
        box-shadow: rgba(0, 0, 0, 0.1) 0px 1px 2px;
        border-radius: 0.5rem;
    }

    .time-range-left,
    .time-range-center,
    .time-range-right {
        display: flex;
        align-items: center;
        height: 100%;
        gap: 8px;
    }

    .time-range-left {
        width: 40%;
    }

    .time-range-center {
        width: 1px;
    }

    .time-range-right {
        width: 40%;
    }

    .time-input {
        all: unset;
        width: 50px;
        text-align: right;
    }

    .time-range-input-container {
        display: flex;
        align-items: center;
        width: 100%;
    }

    .icon-container {
        height: 100%;
        display: flex;
        align-items: center;
    }

    .time-range-separator {
        width: 1px;
        height: 1rem;
        background-color: rgb(210, 206, 207);
    }

    .time-label {
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 400;
        color: rgb(119, 119, 126);
        cursor: ew-resize;
        flex-grow: 1;
    }

    .time-input {
        border: none;
        outline: none;
        border-radius: 5px;
        text-align: right;
        background: rgb(255, 255, 255);
        color: rgb(39, 37, 37);
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 400;
    }

    .time-icon {
        color: rgb(81, 76, 77);
        font-size: 14px;
    }
</style>