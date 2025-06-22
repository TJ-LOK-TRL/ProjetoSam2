<template>
    <div class="overlay-effect-container">
        <StickyHeader :show-icon="true">
            Overlay Settings
        </StickyHeader>

        <UploadBox :accept="'video/*,image/*'" @on-file-upload="onFileUpload" />
        <StockVideos :videos="videos" @add-video="addVideo" />
        <div class="local-sidebar-div sidebar-div">
            <p class="section-title">Overlay settings</p>
            <ConfigRadio :settings="overlaySettings" v-model:selectedRadio="currentOverlaySetting"
                :radio-name="'overlay-radio'" @change="onOverlayTypeChange" class="aside-box" />
        </div>
        <ChromaKey :title="'Chroma Key'" v-model="chromaKeyDetectionData" />
    </div>
</template>

<script setup>
    import { ref, watch, computed } from 'vue'
    import UploadBox from '@/components/Sidebar/Media/UploadBox.vue'
    import StockVideos from '@/components/Sidebar/Media/StockVideos.vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import ConfigRadio from '@/components/Sidebar/Effects/ConfigRadio.vue'
    import ChromaKey from '@/components/Sidebar/Effects/ChromaKey.vue'
    import EffectHandler from '@/assets/js/effectHandler.js';
    import { useVideoEditor } from '@/stores/videoEditor';
    import { useTimelineStore } from '@/stores/timeline'

    const videoEditor = useVideoEditor();
    const timelineStore = useTimelineStore();

    const overlaySettings = ref([
        { name: 'Back' },
        { name: 'Front' },
    ])

    const currentOverlaySetting = ref('Front')

    const videos = ref([
        { src: "/animations/circle.mp4" },
        { src: "/animations/coracoes.mp4" },
        { src: "/animations/portas_abrindo.mp4" },
        { src: "/animations/subscribe.mp4" },
        { src: "/animations/vortex.mp4" }
    ])

    const baseColorSettings = ref([
        { name: 'Color' },
        { name: 'Position' },
    ])

    const chromaKeyDetectionData = ref({
        detectionType: 'Position',
        selectedColor: '#ff0000',
        position: '0,0',
        tolerance: 100,
    })

    async function onFileUpload(file) {
        const mime = file.type;

        if (mime.startsWith('video/')) {
            console.log('É um vídeo');
            await addVideo(file);
        } else if (mime.startsWith('image/')) {
            console.log('É uma imagem');
        } else {
            console.warn('Tipo de arquivo não suportado:', mime);
        }
    }

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

    async function onOverlayTypeChange(setting) {
        currentOverlaySetting.value = setting.name
        await updateOverlayType()
    }

    async function updateOverlayType() {
        if (videoEditor.selectedElement?.type !== 'video') return

        const overlayVideo = videoEditor.selectedElement // PROBLEM HERE, MUST BE FIXED
        const boxOverlayVideo = videoEditor.getBoxOfElement(overlayVideo)
        boxOverlayVideo.removeOnDrawVideoCallback(EffectHandler.OVERLAY_TYPE_EFFECT_ID)

        const type = currentOverlaySetting.value

        const video = videoEditor.maskHandler.video
        const videoRect = videoEditor.getRectBoxOfElement(video)
        const overlayVideoRect = videoEditor.getRectBoxOfElement(overlayVideo)

        const objId = videoEditor.maskHandler.maskToEdit.objId

        const mask = video.trackMasks?.[video.frameIdx]?.[objId]
        if (!mask) return

        const outputCanvas = boxOverlayVideo.getCanvasToApplyVideo()
        const getBoxVideoSize = boxOverlayVideo.getBoxVideoSize

        await videoEditor.effectHandler.overlapVideo(overlayVideo, video.id, mask, videoRect, overlayVideoRect, type, outputCanvas, getBoxVideoSize)

        if (type === 'Front') {
            await boxOverlayVideo.drawVideo()
            return
        }

        boxOverlayVideo.addOnDrawVideoCallback(EffectHandler.OVERLAY_TYPE_EFFECT_ID, async (img) => {
            const frame_mask = video.trackMasks?.[video.frameIdx]?.[objId]
            if (!frame_mask) return
            const outputCanvas = document.createElement('canvas')
            const [width, height] = getBoxVideoSize()
            outputCanvas.width = width
            outputCanvas.height = height
            const outputCtx = outputCanvas.getContext('2d')
            outputCtx.drawImage(img, 0, 0, width, height)
            await videoEditor.maskHandler.overlapVideo(
                frame_mask,
                videoEditor.getRectBoxOfElement(video),
                videoEditor.getRectBoxOfElement(overlayVideo),
                outputCanvas,
                getBoxVideoSize
            )
            return outputCanvas
        })

        video.onVideoDeleted(() => {
            boxOverlayVideo.removeOnDrawVideoCallback(EffectHandler.OVERLAY_TYPE_EFFECT_ID)
        })
    }

    async function addVideo(videoData) {
        try {
            videoEditor.isLoading = true
            const response = await fetch(videoData.src);
            const blob = await response.blob();

            const fileName = videoData.src.split('/').pop(); // Extrai "bouncing_ball.mp4" do path
            const file = new File([blob], fileName, {
                type: blob.type,
                lastModified: Date.now()
            });

            const video = await videoEditor.addVideo(file);

            videoEditor.selectedElement = video; // Define o vídeo como o elemento selecionado
            videoEditor.onAddMapBoxVideo(async (newVideo, box) => {
                if (newVideo.id !== video.id) return
                
                videoEditor.effectHandler.addRelatedVideo(newVideo);

                await videoEditor.effectHandler.handleVideoFollowMask(video, videoEditor.maskHandler.maskToEdit)
                await updateOverlayType()

                const refVideo = videoEditor.maskHandler.video
                timelineStore.setElementStart(video, refVideo.start)
                timelineStore.setElementEnd(video, refVideo.end)
                timelineStore.setStOffset(video, refVideo.stOffset)
                timelineStore.setElementMaxEnd(video, refVideo.end)
            })
            await applyChromaKey(videoEditor.selectedElement);

        } catch (error) {
            console.error('Erro ao adicionar vídeo stock:', error);
        } finally {
            videoEditor.isLoading = false
        }
    }
</script>

<style scoped>

</style>