<template>
    <div class="overlay-effect-container">
        <StickyHeader :show-icon="true">
            Overlay Settings
        </StickyHeader>

        <UploadBox :accept="'video/*,image/*'" @on-file-upload="onFileUpload" />
        <StockVideos :videos="videos" @add-video="addVideo" />
        <div class="local-sidebar-div sidebar-div">
            <p class="section-title">Overlay settings</p>
            <ConfigRadio :settings="overlaySettings" :selected-radio="currentOverlaySetting"
                :radio-name="'overlay-radio'" @change="onOverlayTypeChange" class="aside-box" />
        </div>
        <ChromaKey :title="'Chroma Key'" :tolerance="parseFloat(chromaKeyDetectionData.tolerance)"
            @update="onChromeKeyUpdate" />
    </div>
</template>

<script setup>
    import { ref } from 'vue'
    import UploadBox from '@/components/Sidebar/Media/UploadBox.vue'
    import StockVideos from '@/components/Sidebar/Media/StockVideos.vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import ConfigRadio from '@/components/Sidebar/Effects/ConfigRadio.vue'
    import ChromaKey from '@/components/Sidebar/Effects/ChromaKey.vue'
    import { useVideoEditor } from '@/stores/videoEditor';
    import { useTimelineStore } from '@/stores/timeline'

    const videoEditor = useVideoEditor();
    const timelineStore = useTimelineStore();
    const EFFECT_OVERLAY_ID = 4
    const EFFECT_OVERLAY_FOLLOW = 5

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

    async function onOverlayTypeChange(setting) {
        currentOverlaySetting.value = setting.name
        await updateOverlayType()
    }

    async function updateOverlayType() {
        if (videoEditor.selectedElement?.type !== 'video') return

        const overlayVideo = videoEditor.selectedElement // PROBLEM HERE
        const boxOverlayVideo = videoEditor.getBoxOfElement(overlayVideo)
        boxOverlayVideo.removeOnDrawVideoCallback(EFFECT_OVERLAY_ID)

        const type = currentOverlaySetting.value
        if (type === 'Front') {
            await boxOverlayVideo.drawVideo()
            return
        }

        const video = videoEditor.maskHandler.video
        const videoRect = videoEditor.getRectBoxOfVideo(video)
        const overlayVideoRect = videoEditor.getRectBoxOfVideo(overlayVideo)
        
        const objId = videoEditor.maskHandler.maskToEdit.objId

        const mask = video.trackMasks?.[video.frameIdx]?.[objId]
        if (!mask) return

        const outputCanvas = boxOverlayVideo.getCanvasToApplyVideo()
        const getBoxVideoSize = boxOverlayVideo.getBoxVideoSize

        await videoEditor.effectHandler.overlapVideo(overlayVideo, video.id, mask, videoRect, overlayVideoRect, outputCanvas, getBoxVideoSize)

        boxOverlayVideo.addOnDrawVideoCallback(EFFECT_OVERLAY_ID, async (img) => {
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
                videoEditor.getRectBoxOfVideo(video),
                videoEditor.getRectBoxOfVideo(overlayVideo),
                outputCanvas,
                getBoxVideoSize
            )
            return outputCanvas
        })

        video.onVideoDeleted(() => {
            boxOverlayVideo.removeOnDrawVideoCallback(EFFECT_OVERLAY_ID)
        })
    }

    async function handleVideoFollowMask(video) {
        const mask = videoEditor.maskHandler.maskToEdit;
        const objId = mask.objId;
        const videoOfMask = videoEditor.getVideos().find(v => v.id === mask.videoId);
        const trackMasks = videoOfMask.trackMasks;

        const boxOfMask = videoEditor.getBoxOfElement(videoOfMask);
        const boxOfVideo = videoEditor.getBoxOfElement(video);

        let lastMaskPosition = null;

        const getMaskPosition = async (boxOfMask, objId) => {
            const rectMask = boxOfMask.getRect();
            const currentFrame = Math.floor(timelineStore.currentTime * boxOfMask.video.fps);
            const currentMask = trackMasks?.[currentFrame]?.[objId];
            if (!currentMask) {
                return null;
            }

            const position = await videoEditor.maskHandler.getCenterPositionOfBinaryMask(currentMask, rectMask.width, rectMask.height);
            return position
        }

        const functionFollow = async () => {
            if (!boxOfVideo?.box) return;

            const position = await getMaskPosition(boxOfMask, objId)
            if (!position) {
                video.hide()
                return;
            };
            
            if (!video.visible) video.show()
            
            const [x, y] = position;
            const rectVideo = boxOfVideo.box.getRect();

            // Se é a primeira execução, apenas armazena a posição
            if (!lastMaskPosition) {
                const cx = x - (rectVideo.width / 2)
                const cy = y - (rectVideo.height / 2)
                boxOfVideo.box.setPosition(cx, cy);
                lastMaskPosition = { x, y };
                return;
            }

            // Calcula quanto a máscara se moveu desde a última posição
            const dx = x - lastMaskPosition.x;
            const dy = y - lastMaskPosition.y;

            // Atualiza a posição do vídeo aplicando o mesmo deslocamento
            const newX = rectVideo.x + dx;
            const newY = rectVideo.y + dy;

            boxOfVideo.box.setPosition(newX, newY);
            lastMaskPosition = { x, y };
        }

        boxOfMask.addOnDrawVideoCallback(EFFECT_OVERLAY_FOLLOW, async (img) => {
            await functionFollow()
            return img
        }, false)

        videoEditor.register.registerMaskEffect(video.id, -2, 'overlapVideo', {
            refVideoId: videoEditor.maskHandler.video.id,
            maskObjId: mask.objId,
        });

        videoEditor.onCompileVideoMetadata(async (metadata, compileVideo) => {
            if (compileVideo.id !== video.id) {
                return
            }

            const position = await getMaskPosition(boxOfMask, objId)
            if (!position || !boxOfVideo?.box) {
                return
            }

            const [x, y] = position;
            const rect = boxOfVideo.box.getRect();
            metadata.x = rect.x - x
            metadata.y = rect.y - y

            return metadata
        })

        await functionFollow()
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
                await handleVideoFollowMask(video)
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