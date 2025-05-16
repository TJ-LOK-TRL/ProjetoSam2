<template>
    <div class="remove-color-effect-container">
        <div>
            <StickyHeader :show-icon="true">
                Remove Color
            </StickyHeader>

            <ChromaKey :title="'Chroma Key'" :tolerance="parseFloat(chromaKeyDetectionData.tolerance)"
                @update="onChromeKeyUpdate" />
        </div>
        <StickyFooter>
            <div class="reset-button-container">
                <button class="reset-button" @click="reset">Reset</button>
            </div>
        </StickyFooter>
    </div>
</template>

<script setup>
    import { onMounted, ref, watch } from 'vue'
    import ChromaKey from '@/components/Sidebar/Effects/ChromaKey.vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import StickyFooter from '@/components/Sidebar/StickyFooter.vue'
    import { useVideoEditor } from '@/stores/videoEditor';

    const videoEditor = useVideoEditor();

    const chromaKeyDetectionData = ref({
        detectionType: 'Position',
        selectedColor: '#ff0000',
        position: '0,0',
        tolerance: 100,
    })

    async function onChromeKeyUpdate(data) {
        chromaKeyDetectionData.value = data;
        await applyChromaKeyOnSelectedElement()
    }

    async function applyChromaKey(video) {
        if (!video) return;

        video.chromaKeyDetectionData = {
            detectionType: chromaKeyDetectionData.value.detectionType,
            selectedColor: chromaKeyDetectionData.value.selectedColor,
            position: chromaKeyDetectionData.value.position.split(',').map(Number),
            tolerance: chromaKeyDetectionData.value.tolerance,
        }
    }

    async function applyChromaKeyOnSelectedElement() {
        const video = videoEditor.selectedElement;
        if (video && video.type === 'video') {
            await applyChromaKey(video);
        }
    }

    function reset() {
        const video = videoEditor.selectedElement;
        if (video && video.type === 'video') {
            video.chromaKeyDetectionData = null;
        }
    }
    
    watch(() => videoEditor.selectedElement, (selectedElement) => {
        console.log('here:', videoEditor.selectedElement)
        if (!selectedElement || selectedElement.type !== 'video') {
            videoEditor.changeTool('media')
        }
    })
</script>

<style>
    .remove-color-effect-container {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 100%;
        height: 100%;
    }

    .reset-button-container {
        display: flex;
        justify-content: right;
        align-items: center;
        height: 100%;
        margin-top: auto;
    }

    .reset-button {
        background-color: #ff0000;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
    }
</style>