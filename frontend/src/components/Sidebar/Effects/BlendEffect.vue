<template>
    <div class="overlay-effect-container">
        <StickyHeader :show-icon="true">
            Blend Settings
        </StickyHeader>

        <UploadBox :accept="'video/*,image/*'" @on-file-upload="onFileUpload" />
        <StockVideos :videos="videos" @add-video="addVideo" />


    </div>
</template>

<script setup>
    import { ref } from 'vue'
    import UploadBox from '@/components/Sidebar/Media/UploadBox.vue'
    import StockVideos from '@/components/Sidebar/Media/StockVideos.vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import ConfigRange from '@/components/Sidebar/Effects/ConfigRange.vue'
    import EffectHandler from '@/assets/js/effectHandler.js';
    import { useVideoEditor } from '@/stores/videoEditor';
    import { useTimelineStore } from '@/stores/timeline'

    const videoEditor = useVideoEditor();
    const timelineStore = useTimelineStore()

    const videos = ref([
        { src: "/textures/arte.mp4" },
        { src: "/textures/catos.mp4" },
        { src: "/textures/coracoes.mp4" },
        { src: "/textures/flores.mp4" },
        { src: "/textures/riscas_ondas.mp4" }
    ])

    async function onFileUpload(file) {
        const mime = file.type;

        if (mime.startsWith('video/')) {
            console.log('É um vídeo');
            await addEffectFile(file)
        } else if (mime.startsWith('image/')) {
            console.log('É uma imagem');
        } else {
            console.warn('Tipo de arquivo não suportado:', mime);
        }
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

            await addEffectFile(file)
        } catch (error) {
            console.error('Erro ao adicionar vídeo stock:', error);
        } finally {
            videoEditor.isLoading = false
        }
    }

    async function addEffectFile(file) {
        const boxOfMainVideo = videoEditor.getBoxOfElement(videoEditor.maskHandler.video)
        await videoEditor.effectHandler.resetEffects(boxOfMainVideo, videoEditor.maskHandler.video, videoEditor.maskHandler.maskToEdit, videoEditor.maskHandler.maskToEdit.objId === -1 ? 'background' : 'object');
        const video = await videoEditor.addVideo(file)
        await addEffect(video);
    }

    async function addEffect(video) {
        if (video === null) {
            console.warn('video is invalid in blend addEffect:', video)
            return
        }

        const boxOfMainVideo = videoEditor.getBoxOfElement(videoEditor.maskHandler.video)

        videoEditor.selectedElement = video; // Define o vídeo como o elemento selecionado
        video.shouldBeDraw = false;
        video.track_id = videoEditor.maskHandler.video.track_id
        
        const mainVideo = videoEditor.maskHandler.video;
        const mask = videoEditor.maskHandler.maskToEdit;
        (mask.objId === -1 ? videoEditor.effectHandler.bkgEffectVideos : videoEditor.effectHandler.objEffectVideos).add(video);

        videoEditor.register.registerMaskEffect(mainVideo.id, mask.objId, 'blendEffect', {
            blendVideoId: video.id,
        });

        await video.waitUntilVideoIsReady()
        await videoEditor.effectHandler.changeColorOfMask(video, mask, null, {}, 255, 255)

        const effect_id = EffectHandler.id(mask.objId === -1 ? EffectHandler.BLEND_BKG_EFFECT_ID : EffectHandler.BLEND_OBJ_EFFECT_ID, mask.objId)
        boxOfMainVideo.addOnDrawVideoCallback(effect_id, async img => {
            let frame_mask;
            if (mask.objId === -1) {
                const obj_masks = Object.values(mainVideo.trackMasks?.[mainVideo.frameIdx] || {})
                frame_mask = await videoEditor.maskHandler.getBackgroundMask(obj_masks, ...boxOfMainVideo.getBoxVideoSize());
            } else {
                frame_mask = mainVideo.trackMasks?.[mainVideo.frameIdx]?.[mask.objId]
            }

            if (frame_mask && true) {
                const [width, height] = boxOfMainVideo.getBoxVideoSize()
                const outputCanvas = document.createElement('canvas')
                outputCanvas.width = width
                outputCanvas.height = height
                const outputCtx = outputCanvas.getContext('2d')
                outputCtx.drawImage(img, 0, 0, width, height)
                await video.waitUntilVideoIsReady()
                await videoEditor.maskHandler.changeColorOfMask(video.captureCurrentCanvasFrame(), frame_mask, null, {}, 255, 255, outputCanvas, null);
                return outputCanvas
            }
            return img
        })
    }
</script>

<style scoped>

</style>