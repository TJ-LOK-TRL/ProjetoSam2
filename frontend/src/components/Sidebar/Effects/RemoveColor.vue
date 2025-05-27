<template>
    <div class="remove-color-effect-container">
        <div>
            <StickyHeader :show-icon="true">
                Remove Color
            </StickyHeader>

            <ChromaKey :title="'Chroma Key'" v-model="chromaKeyDetectionData" />
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

    watch(chromaKeyDetectionData, async () => {
        await applyChromaKeyOnSelectedElement()
    }, { deep: true })

    async function applyChromaKey(video) {
        if (!video) return;

        const pos = typeof chromaKeyDetectionData.value.position === 'string'
            ? chromaKeyDetectionData.value.position.split(',').map(Number)
            : chromaKeyDetectionData.value.position

        video.chromaKeyDetectionData = {
            detectionType: chromaKeyDetectionData.value.detectionType,
            selectedColor: chromaKeyDetectionData.value.selectedColor,
            position: pos,
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

        chromaKeyDetectionData.value = {
            detectionType: 'Position',
            selectedColor: '#ff0000',
            position: '0,0',
            tolerance: 0,
        }
    }

    // Quando o elemento selecionado mudar, atualiza os dados para o que já existe nele
    watch(() => videoEditor.selectedElement, (newEl) => {
        if (!newEl || newEl.type !== 'video') {
            videoEditor.changeTool('media')
            // Reset local ao padrão, caso não seja vídeo
            chromaKeyDetectionData.value = {
                detectionType: 'Position',
                selectedColor: '#ff0000',
                position: '0,0',
                tolerance: 100,
            }
            return
        }
        // Se o elemento tem dados, atualiza local
        if (newEl.chromaKeyDetectionData) {
            const d = newEl.chromaKeyDetectionData
            chromaKeyDetectionData.value = {
                detectionType: d.detectionType || 'Position',
                selectedColor: d.selectedColor || '#ff0000',
                // Converter array para string se necessário
                position: Array.isArray(d.position) ? d.position.join(',') : (d.position || '0,0'),
                tolerance: d.tolerance || 100,
            }
        } else {
            // Se não tem dados, reset padrão
            chromaKeyDetectionData.value = {
                detectionType: 'Position',
                selectedColor: '#ff0000',
                position: '0,0',
                tolerance: 100,
            }
        }
    }, { immediate: true })
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