<template>
    <div class="container">
        <StickyHeader :show-icon="true" @icon-click="videoEditor.selectedElement = null">
            Edit Media <span class="file-name">{{ mediaElement?.file.name }}</span>
        </StickyHeader>

        <div class="content">
            <div class="content-group local-sidebar-div sidebar-div">
                <div class="content-row-3">
                    <SimpleButtonCard :label="'Animations'" :icon="'fa-brands fa-fly'" @on-click="" />

                    <SimpleButtonCard :label="'Adjust'" :icon="'fas fa-sliders'" @on-click="adjustVideo" />
                </div>

                <TimeRangeCard v-model:start="startTime" v-model:end="endTime" />

                <SpeedControls v-model="currentSpeed" />

                <div class="content-row-3">
                    <SingleToggleCard class="volume-toggle-container" v-model="volume" :iconOn="'fas fa-volume-high'"
                        :iconOff="'fas fa-volume-xmark'" :stateValue="'0%'" :state="false" />

                    <SimpleInputCard class="volume-range-container" v-model="volume" :showRange="true" />
                </div>
            </div>

            <hr class="content-group-divider" />

            <div class="content-group">
                <MagicTools />
            </div>

            <hr class="content-group-divider visible" />

            <div class="content-group local-sidebar-div sidebar-div">
                <SimpleInputCard class="opacity-container" v-model="opacity" :showRange="true" :label="'Opacity'"
                    :icon="'fas fa-droplet'" />

                <div class="content-row-3">
                    <SimpleInputCard class="round-container" v-model="roundedCorner" :label="'Round Corners'"
                        :icon="'fa-solid fa-border-top-left'" />

                    <button class="fit-button" @click="fitElement">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16"
                            style="stroke-width: 1.5px;">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M5.333 2h-2A1.333 1.333 0 0 0 2 3.333v2m12 0v-2A1.334 1.334 0 0 0 12.667 2h-2m0 12h2A1.334 1.334 0 0 0 14 12.667v-2m-12 0v2A1.333 1.333 0 0 0 3.333 14h2">
                            </path>
                        </svg>
                    </button>
                </div>

                <div class="content-row-3">
                    <SimpleInputCard class="rotation-container" v-model="rotation" :label="'Rotation'"
                        :icon="'fas fa-rotate'" />

                    <ToggleCard class="flip-container" v-model="flip">
                        <template #default>
                            <div data-value="true"><i class="fa-solid fa-arrows-up-down" /></div>
                        </template>
                    </ToggleCard>
                </div>
            </div>
        </div>

        <StickyFooter>
            <AddNewElementButton :label="'Add Another Video'" />
        </StickyFooter>
    </div>
</template>

<script setup>
    import { ref, computed, watch } from 'vue'
    import { useVideoEditor } from '@/stores/videoEditor'
    import { useTimelineStore } from '@/stores/timeline'
    import TimeRangeCard from '@/components/Sidebar/TimeRangeCard.vue'
    import SpeedControls from '@/components/Sidebar/SpeedControls.vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import StickyFooter from '@/components/Sidebar/StickyFooter.vue'
    import SimpleInputCard from '@/components/Sidebar/SimpleInputCard.vue'
    import AddNewElementButton from '@/components/Sidebar/AddNewElementButton.vue'
    import ToggleCard from '@/components/Sidebar/ToggleCard.vue'
    import MagicTools from './MagicTools.vue'
    import SimpleButtonCard from '@/components/Sidebar/SimpleButtonCard.vue'
    import SingleToggleCard from '@/components/Sidebar/SingleToggleCard.vue'

    const videoEditor = useVideoEditor()
    const timelineStore = useTimelineStore()

    const mediaElement = computed({
        get: () => videoEditor.selectedElement,
        set: (val) => {
            videoEditor.selectedElement = val
        }
    })

    const startTime = computed({
        get: () => mediaElement.value.start,
        set: (val) => timelineStore.setElementStart(mediaElement.value, val)
    })

    const endTime = computed({
        get: () => mediaElement.value.end / mediaElement.value.speed,
        set: (val) => timelineStore.setElementEnd(mediaElement.value, val * mediaElement.value.speed)
    })

    const currentSpeed = computed({
        get: () => mediaElement.value.speed,
        set: (val) => timelineStore.setVideoSpeed(mediaElement.value, val)
    })

    const rotation = computed({
        get: () => {
            const boxElement = videoEditor.getBoxOfElement(mediaElement.value)
            if (!boxElement) return 0
            return parseFloat(Number(boxElement.box.rotation).toFixed(2)) + '°'
        },
        set: (fval) => {
            const val = parseFloat(fval)
            const boxElement = videoEditor.getBoxOfElement(mediaElement.value)
            if (!boxElement) return
            boxElement.box.rotation = val
        }
    })

    const flip = computed({
        get: () => {
            const boxElement = videoEditor.getBoxOfElement(mediaElement.value)
            if (!boxElement) return false
            return boxElement.box.isFlipped
        },
        set: (val) => {
            const boxElement = videoEditor.getBoxOfElement(mediaElement.value)
            if (!boxElement) return
            boxElement.flip()
        }
    })

    const opacity = computed({
        get: () => {
            const boxElement = videoEditor.getBoxOfElement(mediaElement.value)
            if (!boxElement) return 0
            return Math.round(boxElement.box.opacity * 100) + '%'
        },
        set: (fval) => {
            const val = parseFloat(fval) / 100
            const boxElement = videoEditor.getBoxOfElement(mediaElement.value)
            if (!boxElement) return
            boxElement.box.opacity = val
        }
    })

    const roundedCorner = computed({
        get: () => {
            const boxElement = videoEditor.getBoxOfElement(mediaElement.value)
            if (!boxElement) return 0
            return boxElement.box.roundedCorner === 50
        },
        set: (val) => {
            const boxElement = videoEditor.getBoxOfElement(mediaElement.value)
            if (!boxElement) return
            boxElement.box.roundedCorner = val ? 50 : 0
        }
    })

    const volume = computed({
        get: () => {
            return Math.round(mediaElement.value.volume * 100) + '%'
        },
        set: (val) => {
            mediaElement.value.volume = parseFloat(val) / 100
        }
    })

    async function adjustVideo() {
        videoEditor.effectHandler.setVideoToApplyEffect(mediaElement.value)
        videoEditor.maskHandler.setMaskToEdit(await videoEditor.maskHandler.getBackgroundMask([], ...videoEditor.maskHandler.getCanvasSize(), -3));
        videoEditor.changeTool('colorEffect')
    }

    function fitElement() {
        const boxElement = videoEditor.getBoxOfElement(mediaElement.value)
        if (!boxElement) return

        const size = videoEditor.getVideoPlayerSize()
        const width = size.width
        const height = size.height

        boxElement.box.setPosition(0, 0)
        boxElement.box.setSize(width, height)
        boxElement.box.rotation = 0
        if (boxElement.box.isFlipped) boxElement.box.flip()
    }
</script>

<style scoped>
    .container {
        width: 100%;
    }

    .content {
        height: 100%;
    }

    .content-group {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
    }

    .content-row-3 {
        display: flex;
        gap: 10px;
        width: 100%;
    }

    .flip-container {
        width: 48px;
        height: 48px;
        transform: rotate(90deg);
    }

    .rotation-container {
        width: 100%;
        height: 100%;
    }

    .opacity-container {
        width: 100%;
        height: 100%;
    }

    .round-container {
        width: 100%;
        height: 100%;
    }

    .volume-range-container {
        width: calc(80% - 10px);
        height: 100%;
    }

    .volume-toggle-container {
        width: 20%;
        height: 48px;
        color: rgb(119, 119, 126);
    }

    .file-name {
        max-width: 100px;
        display: inline-block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.75rem;
        vertical-align: middle;
        color: rgb(90, 90, 96);
    }

    .content-group-divider {
        margin-top: 0px;
        margin-bottom: 20px;
        margin-left: 20px;
        margin-right: 20px;
        opacity: 1;
        border: 0px solid rgb(231, 230, 230);
    }

    .content-group-divider.visible {
        border: 1px solid rgb(231, 230, 230);
        margin-top: 10px;
        margin-bottom: 30px;
    }

    .fit-button {
        all: unset;
        display: flex;
        justify-content: space-around;
        align-items: center;
        border: 1px solid #ddd;
        border-radius: 0.5rem;
        min-width: 47px;
        min-height: 47px;
        width: 47px;
        height: 47px;
        max-height: 47px;
        max-width: 47px;
        cursor: pointer;
    }
</style>