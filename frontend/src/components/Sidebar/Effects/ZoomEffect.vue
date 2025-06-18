<template>
    <div class="zoom-effect-container">
        <StickyHeader :show-icon="true">
            Color Effect Settings
        </StickyHeader>

        <div class="content">
            <div class="add-zoom-container">
                <div class="local-sidebar-div sidebar-div">
                    <SimpleInputCard class="zoom-level-container" v-model="destZoom" :showRange="true" :label="'Zoom'"
                        :icon="'fas fa-magnifying-glass'" :min="0" :max="10" :step="0.1" />
                    <SimpleInputCard class="zoom-level-container" v-model="start" :label="'Start'" :respectLimitsAsNumber="true"
                        :icon="'fa-regular fa-clock'" :min="minStart" :max="maxStart" />
                    <SimpleInputCard class="zoom-level-container" v-model="duration" :label="'Duration'" :respectLimitsAsNumber="true"
                        :icon="'fas fa-hourglass-end'" :min="minDuration" :max="maxDuration" />

                    <button @click="addZoom">Add Zoom</button>
                    <button @click="resetAllZooms">Reset All</button>
                </div>
            </div>
            <div class="list-zoom-container">
                <div class="local-sidebar-div sidebar-div">
                    <template v-for="zoomInfo in zoomData">
                        <p style="max-width: 300px;">{{ zoomInfo }}</p>
                    </template>
                </div>
            </div>
        </div>
    </div>

</template>

<script setup>
    import { ref, computed, watch, onMounted } from 'vue'
    import { useVideoEditor } from '@/stores/videoEditor'
    import { useTimelineStore } from '@/stores/timeline'
    import EffectHandler from '@/assets/js/effectHandler.js';
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import SimpleInputCard from '@/components/Sidebar/SimpleInputCard.vue'

    const videoEditor = useVideoEditor();
    const timelineStore = useTimelineStore();

    const video = computed(() => videoEditor.selectedElement)
    const maskToEdit = computed(() => videoEditor.maskHandler.maskToEdit)

    const zoomData = ref([])
    const destZoom = ref(2)
    
    const minStart = computed(() => video.value?.maskRefTime || 0)
    const maxStart = computed(() => video.value?.duration || 0)
    const minDuration = computed(() => 0.1)
    const maxDuration = computed(() => Math.max(0, (video.value?.duration || 0) - start.value))

    const start = ref(minStart.value)
    const duration = ref(maxDuration.value)

    function updateZoomData() {
        const blocks = videoEditor.register.getAllBlocksBetweenResets(video.value.id, maskToEdit.value.objId, EffectHandler.ZOOM_EFFECT_NAME);
        const lastZoomData = blocks?.[blocks.length - 1] || [];
        zoomData.value = lastZoomData
    }

    async function addZoom() {
        const settings = {
            destZoom: destZoom.value,
            start: start.value,
            end: start.value + duration.value
        }

        await videoEditor.effectHandler.zoomObjectByMask(video.value, maskToEdit.value, settings, [0, 0, 0, 0], 255, true)
        updateZoomData()
    }

    function resetAllZooms() {
        videoEditor.effectHandler.resetZoomObject(video.value, maskToEdit.value)
        videoEditor.register.registerResetForEffect(video.value.id, maskToEdit.value.objId, EffectHandler.ZOOM_EFFECT_NAME)
        updateZoomData()
    }

    onMounted(() => {
        updateZoomData()
    })

</script>

<style scoped>

</style>