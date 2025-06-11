<template>
    <div class="container">
        <StickyHeader :show-icon="false">
            <div class="header">
                <p>Select objects</p>
                <!--<p class="description">Adjust the selection of your object, 
                    or add additional objects. Press "Track
                    objects" to track your objects throughout the video</p>-->
            </div>
        </StickyHeader>

        <div class="body-container">
            <div v-if="false" class="add-remove-container">
                <div class="button-container" @click="onAddClick">
                    <div class="button-icon plus-icon"><i class="fas fa-plus"></i></div>
                    <div class="button-label">Add</div>
                </div>
                <div class="button-container" @click="onRemoveClick">
                    <div class="button-icon minus-icon"><i class="fas fa-minus"></i></div>
                    <div class="button-label">Remove</div>
                </div>
            </div>

            <div class="track-objects-container">
                <div v-for="(obj, index) in video.maskObjects" :key="obj.id" class="object-container"
                    :class="{ 'not-selected': obj.id != videoEditor.maskHandler.selectedMaskObjectId }">
                    <div class="object-left">
                        <img v-if="obj.src" class="object-image" :src="obj.src" alt="">
                        <div v-else class="object-image placeholder-gradient"></div>
                    </div>
                    <div class="object-right">
                        <div class="object-body">
                            <div class="object-title">{{ obj.name }}</div>
                            <div v-if="obj.id == videoEditor.maskHandler.selectedMaskObjectId"
                                class="object-description">Select
                                <span class="description-icon plus-icon">
                                    <i class="fas fa-plus"></i></span> to add areas
                                to the object and
                                <span class="description-icon minus-icon">
                                    <i class="fas fa-minus"></i></span> to remove
                                areas from the object in the video. Click
                                on an existing point to delete it.
                            </div>
                            <div v-else class="edit-delete-container">
                                <div class="object-edit" @click="videoEditor.maskHandler.selectedMaskObjectId = obj.id">
                                    <i class="fa-solid fa-pen-to-square"></i> Edit Selection
                                </div>
                                <div class="object-delete" @click="onClearClick(obj.id)"><i
                                        class="fa-solid fa-trash"></i> Clear</div>
                            </div>
                        </div>
                        <div v-if="obj.id == videoEditor.maskHandler.selectedMaskObjectId"
                            class="object-button-container">
                            <div class="object-button plus" @click="onAddClick" :class="
                                { active: videoEditor.maskHandler.selectMaskType === 'add' }">
                                <div class="object-button-icon plus-icon">
                                    <i class="fas fa-plus"></i>
                                </div>
                                <div class="object-button-label">Add</div>
                            </div>
                            <div class="object-button minus" @click="onRemoveClick" :class="
                                { active: videoEditor.maskHandler.selectMaskType === 'remove' }">
                                <div class="object-button-icon minus-icon">
                                    <i class="fas fa-minus"></i>
                                </div>
                                <!--fa-eye-slash-->
                                <div class="object-button-label">Remove</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="object-add-container" @click="addNewObject">
                    <div class="object-add-button">
                        <i class="fa-solid fa-plus"></i>
                    </div>

                    <p>Add new object</p>
                </div>
            </div>
        </div>

        <StickyFooter>
            <div class="track-reset-container">
                <div class="reset-container" @click="reset">
                    <div class="reset-icon"><i class="fa-solid fa-rotate-right"></i></div>
                    <div class="reset-text">Start over</div>
                </div>

                <div class="track-container" @click="track">
                    <div class="reset-text">Track objects</div>
                    <div class="reset-icon"><i class="fas fa-chevron-right"></i></div>
                </div>
            </div>
        </StickyFooter>
    </div>
</template>

<script setup>
    import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import StickyFooter from '@/components/Sidebar/StickyFooter.vue'
    import { useVideoEditor } from '@/stores/videoEditor'
    import { useTimelineStore } from '@/stores/timeline'
    import { loadImageFromCache, getStageNameOfVideo, calculateTimeByFrameIdx, joinTrackedMasks } from '@/assets/js/utils'

    const videoEditor = useVideoEditor()
    const timelineStore = useTimelineStore()
    const originalPoints = ref([]);

    const video = computed(() => videoEditor.effectHandler.originalVideo);

    function addNewObject() {
        const newObject = {
            id: ++video.value.currentId,
            name: `Object ${video.value.currentId}`,
            src: null,
        }
        video.value.maskObjects.push(newObject)
    }

    function onAddClick() {
        if (videoEditor.maskHandler.selectMaskType == 'add') {
            videoEditor.maskHandler.selectMaskType = null
            return
        }

        videoEditor.maskHandler.selectMaskType = 'add'
    }

    function onRemoveClick() {
        if (videoEditor.maskHandler.selectMaskType == 'remove') {
            videoEditor.maskHandler.selectMaskType = null
            return
        }
        videoEditor.maskHandler.selectMaskType = 'remove'
    }

    function onClearClick(objId) {
        video.value.maskObjects = video.value.maskObjects.filter(obj => obj.id !== objId);
        video.value.points = video.value.points.filter(point => point.objId !== objId);

        const frame = video.value.getCurrentFrame();

        if (video.value.trackMasks?.[frame]) {
            delete video.value.trackMasks[frame][objId];
        }
    }

    function reset() {
        videoEditor.maskHandler.selectMaskType = null
        video.value.points.length = 0
        video.value.trackMasks = {}
        video.value.previewTrackMasks = {}
        video.value.maskObjects.length = 0
        video.value.currentId = 0
        video.value.masks.length = 0
    }

    function hasChanged() {
        if (video.value.points.length !== originalPoints.value.length) {
            return true;
        }

        for (let i = 0; i < video.value.points.length; i++) {
            const point = video.value.points[i];
            const originalPoint = originalPoints.value[i];
            if (point.id !== originalPoint.id) {
                return true;
            }
        }
        return false;
    }

    async function track() {
        try {
            console.log('getting masks...')

            //const currentTime = (timelineStore.currentTime - video.value.stOffset)
            const currentTime = video.value.maskRefTime ?? (timelineStore.currentTime - video.value.stOffset)
            const currentFrameNumber = Math.floor(video.value.fps * currentTime)

            if (!hasChanged() && video.value.cacheTrackVideos !== null) {
                video.value.trackMasks = joinTrackedMasks({}, video.value.cacheTrackVideos);
            } else {
                videoEditor.isLoading = true
                const [track_id, masks] = await videoEditor.generateMasksForVideo(video.value, {
                    start_frame: Math.floor(video.value.start * video.value.fps),
                    end_frame: Math.floor(video.value.end * video.value.fps),
                    stage_name: getStageNameOfVideo(video.value, '_track_masks'),
                });

                videoEditor.isLoading = false

                if (masks === null) {
                    console.error("Máscaras não encontradas para o vídeo:", video.value.id, masks);
                    return;
                }

                video.value.track_id = track_id
                video.value.trackMasks = joinTrackedMasks(video.value.trackMasks, masks);
                video.value.cacheTrackVideos = JSON.parse(JSON.stringify(video.value.trackMasks))
                videoEditor.maskHandler.selectMaskType = null
                videoEditor.maskHandler.selectedMask = null
            }

            const masks = video.value.trackMasks
            if (!masks[currentFrameNumber]) {
                console.error("Máscaras não encontradas para o frame atual:", currentFrameNumber, masks, video.value.fps);
                return;
            }
            
            const newMasks = Object.keys(masks[currentFrameNumber]).map((objId, index) => ({
                id: masks[currentFrameNumber][objId].id,
                url: masks[currentFrameNumber][objId].url,
                videoId: video.value.id,
                objId: objId,
                frameIdx: currentFrameNumber,
                indexColor: videoEditor.maskHandler.getIndexedColor(index),
            }));
            video.value.masks = newMasks;

            videoEditor.changeTool('samEffects')

            return;
        } catch (error) {
            console.error('Erro ao gerar máscaras:', error);
        } finally {
            videoEditor.isLoading = false;
        }
    }

    // Callback to allow the generation of mask in the current mask
    async function onEditorElementSelected(editorElement) {
        if (editorElement.type === 'video' && editorElement == video.value) {
            if (!videoEditor.maskHandler.selectMaskType) return

            try {
                const selectedMaskObjectId = videoEditor.maskHandler.selectedMaskObjectId
                const pointsToTrack = video.value.points.filter(point => point.objId === selectedMaskObjectId)
                if (pointsToTrack.length === 0) {
                    const boxOfElement = videoEditor.getBoxOfElement(video.value)
                    boxOfElement.clearActiveCanvas()
                    video.value.maskRefTime = null
                    return
                }
                console.log('getting 1 mask...')
                const currentFrame = video.value.getCurrentFrame()
                videoEditor.isLoading = true

                // Generate masks for the selected object for the current frame only
                const [track_id, masks] =
                    await videoEditor.generateMasksForVideo(video.value, {
                        start_frame: currentFrame,
                        end_frame: currentFrame + 1,
                        ann_obj_id: selectedMaskObjectId,
                        stage_name: getStageNameOfVideo(video.value, '_one_mask'),
                    }, pointsToTrack);

                if (masks === null) {
                    console.error("Máscaras não encontradas para o frame atual:", currentFrame, masks);
                    return;
                }

                video.value.track_id = track_id
                video.value.trackMasks = joinTrackedMasks(video.value.trackMasks, masks);
                video.value.previewTrackMasks = joinTrackedMasks(video.value.previewTrackMasks, masks);

                const frameIdx = Math.min(...Object.keys(masks).map(Number));
                const targetTime = calculateTimeByFrameIdx(frameIdx, video.value.fps);

                await timelineStore.setCurrentTime(targetTime);

                video.value.maskRefTime ??= timelineStore.currentTime

                const maskFrame = masks[frameIdx];
                const maskData = maskFrame?.[selectedMaskObjectId] || null;

                if (!maskData || !maskData.url) {
                    console.error("Máscara não encontrada ou URL inválida", masks, maskData, maskData?.url, selectedMaskObjectId);
                    return;
                }

                const objImgUrl = await extractObjectFromImage(video.value, maskData);
                const centeredUrl = await centerObjectInImage(objImgUrl, video.value.width, video.value.height);
                const currentObj = video.value.maskObjects.find(obj => obj.id === videoEditor.maskHandler.selectedMaskObjectId);
                if (currentObj) {
                    currentObj.src = centeredUrl;
                }

                return;
            } catch (error) {
                console.error('Erro ao gerar máscaras:', error);
            } finally {
                videoEditor.isLoading = false;
            }
        } else {
            console.warn('Elemento selecionado não é um vídeo ou não é o vídeo correto:', editorElement, video.value);
            videoEditor.changeTool('sam', 'sam');
        }
    }

    async function extractObjectFromImage(video, mask) {
        await video.waitUntilVideoIsReady();
        const imageBlob = await video.captureCurrentFrame();
        const imageBitmap = await createImageBitmap(imageBlob);
        const maskImage = await loadImageFromCache(mask.url);

        // Criar canvas principal e máscara
        const canvas = document.createElement('canvas');
        canvas.width = video.width;
        canvas.height = video.height;
        const ctx = canvas.getContext('2d');

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = video.width;
        maskCanvas.height = video.height;
        const maskCtx = maskCanvas.getContext('2d');

        // Desenhar máscara no canvas de máscara
        maskCtx.drawImage(maskImage, 0, 0, video.width, video.height);
        const maskData = maskCtx.getImageData(0, 0, video.width, video.height).data;

        // Desenhar frame original em um ImageData
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.width;
        tempCanvas.height = video.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(imageBitmap, 0, 0, video.width, video.height);
        const frameData = tempCtx.getImageData(0, 0, video.width, video.height);

        // Criar novo ImageData com transparência fora da máscara
        const outputData = ctx.createImageData(video.width, video.height);

        for (let i = 0; i < maskData.length; i += 4) {
            const r = maskData[i]; // verifica o canal R (se branco, R=255)
            if (r > 128) { // ou outro threshold
                outputData.data[i] = frameData.data[i];     // R
                outputData.data[i + 1] = frameData.data[i + 1]; // G
                outputData.data[i + 2] = frameData.data[i + 2]; // B
                outputData.data[i + 3] = 255; // Alpha = visível
            } else {
                outputData.data[i + 3] = 0; // Alpha = transparente
            }
        }

        ctx.putImageData(outputData, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                resolve(url);
            }, 'image/png');
        });
    }

    async function centerObjectInImage(imageUrl, targetWidth, targetHeight) {
        const img = new Image();
        await new Promise((resolve) => {
            img.onload = resolve;
            img.src = imageUrl;
        });

        const analysisCanvas = document.createElement('canvas');
        analysisCanvas.width = img.width;
        analysisCanvas.height = img.height;
        const analysisCtx = analysisCanvas.getContext('2d');
        analysisCtx.drawImage(img, 0, 0);
        const imageData = analysisCtx.getImageData(0, 0, img.width, img.height).data;

        let minX = img.width, minY = img.height, maxX = 0, maxY = 0;

        for (let y = 0; y < img.height; y++) {
            for (let x = 0; x < img.width; x++) {
                const i = (y * img.width + x) * 4;
                if (imageData[i + 3] > 0) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        const objWidth = maxX - minX;
        const objHeight = maxY - minY;

        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = targetWidth || img.width;
        resultCanvas.height = targetHeight || img.height;
        const resultCtx = resultCanvas.getContext('2d');

        const centerX = (resultCanvas.width - objWidth) / 2;
        const centerY = (resultCanvas.height - objHeight) / 2;

        resultCtx.drawImage(
            img,
            minX, minY, objWidth, objHeight,
            centerX, centerY, objWidth, objHeight
        );

        return new Promise((resolve) => {
            resultCanvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                resolve(url);
            }, 'image/png');
        });
    }

    onMounted(() => {
        if (video.value.points.length !== 0 && video.value.maskRefTime) {
            timelineStore.setCurrentTime(video.value.maskRefTime)
        }

        video.value.masks.length = 0;
        video.value.samState = 'ConfigSam'
        originalPoints.value = JSON.parse(JSON.stringify(video.value.points))
        video.value.trackMasks = {}
        video.value.trackMasks = JSON.parse(JSON.stringify(video.value.previewTrackMasks))

        // Register callback for preview mode
        videoEditor.onEditorElementSelected('ConfigSam', onEditorElementSelected)
    })

    onUnmounted(() => {
        videoEditor.removeOnEditorElementSelected('ConfigSam')
        videoEditor.maskHandler.selectMaskType = null
        videoEditor.maskHandler.selectedMaskObjectId = null

        const boxOfVideo = videoEditor.getBoxOfElement(video.value)
        boxOfVideo?.clearActiveCanvas()
    })

</script>

<style scoped>
    .container {
        display: flex;
        flex-direction: column;
        position: relative;
        height: 100%;
    }

    .header {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
    }

    .description {
        width: 100%;
        font-size: .8125rem;
        line-height: 1rem;
        font-weight: 100;
        font-family: sans-serif;
        color: oklch(44.7% .012 273.2);
    }

    .body-container {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
        padding: 20px;
        gap: 50px;
    }

    .add-remove-container {
        position: relative;
        display: flex;
        width: 100%;
        gap: 8px;
    }

    .button-container {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-grow: 1;
        height: 4rem;
        min-height: 4rem;
        font-size: 0.9rem;
        font-weight: 400;
        border: 3px solid white;
        border-radius: 0.625rem;
        box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);
        background-color: rgb(58, 58, 58);
        color: white;
        gap: 0.625rem;
        cursor: pointer;
    }

    .button-container:hover {
        border: 3px solid var(--main-color);
    }

    .button-label {
        font-family: Inter, sans-serif;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 500;
    }

    .button-icon {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 1.3rem;
        height: 1.3rem;
        border-radius: 50%;
        color: white;
    }

    .plus-icon {
        background-color: var(--main-color);
    }

    .minus-icon {
        background-color: #F44336;
    }

    .track-reset-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .reset-container {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-family: 'Arial', sans-serif;
        font-weight: 500;
        color: rgb(84, 84, 84);
        transition: transform 0.3s ease, color 0.3s ease;
    }

    .reset-container:hover {
        transform: translateY(-4px);
        color: var(--main-color);
    }

    .reset-container i {
        font-size: 1.2rem;
        transition: transform 0.3s ease;
    }

    .reset-container:hover i {
        transform: translateX(4px);
    }

    .track-container {
        position: relative;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding: 0.75rem 1.5rem;
        border-radius: 1rem;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        background: linear-gradient(45deg, #6D28D9, #3B82F6, #06B6D4, #D946EF, #8B5CF6);
        background-size: 300%;
        animation: magicGradient 5s infinite;
        color: white;
        font-family: Inter, sans-serif;
        font-weight: 600;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }

    .track-container:hover {
        transform: scale(1.05);
        box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
    }

    @keyframes magicGradient {
        0% {
            background-position: 0% 50%;
        }

        50% {
            background-position: 100% 50%;
        }

        100% {
            background-position: 0% 50%;
        }
    }

    /* Brilho em torno do botão */
    .track-container::before s {
        content: '';
        position: absolute;
        top: -3px;
        left: -3px;
        right: -3px;
        bottom: -3px;
        border-radius: 1rem;
        background: linear-gradient(45deg, #F43F5E, #FB923C, #FACC15, #34D399, #3B82F6, #8B5CF6);
        background-size: 300%;
        animation: magicGradient 10s infinite;
        z-index: -1;
        filter: blur(8px);
    }

    .track-objects-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        flex-grow: 1;
    }

    .object-container {
        display: flex;
        gap: 20px;
        padding: 11px;
        border: 0.5px solid rgb(234, 234, 234);
        border-radius: 0.625rem;
        box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);
        background-color: #000000f0;
    }

    .object-container.not-selected {
        background-color: transparent;
    }

    .object-container.not-selected .object-title {
        color: rgb(72, 72, 72);
    }

    .object-left {
        display: flex;
        gap: 1rem;
        max-width: 20%;
    }

    .object-image {
        width: 4rem;
        height: 4rem;
        border-radius: 0.625rem;
        object-fit: cover;
    }

    .object-right {
        display: flex;
        gap: 8px;
        flex-direction: column;
        justify-content: space-between;
        max-width: 80%;
        width: 80%;
    }

    .object-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .object-title {
        font-size: .9rem;
        font-weight: 500;
        color: rgb(255, 255, 255);
    }

    .object-description {
        font-size: .7rem;
        color: rgb(161, 160, 160);
    }

    .description-icon {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        width: 0.7rem;
        height: 0.7rem;
        font-size: .5rem;
        border-radius: 50%;
        color: white;
    }

    .object-button-container {
        display: flex;
        width: 100%;
    }

    .object-button {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: 2px solid rgb(133, 133, 133);
        background-color: rgb(58, 58, 58);
        color: white;
        cursor: pointer;
        flex-grow: 1;
        height: 2.5rem;
    }

    .object-button+.object-button {
        margin-left: -2px;
    }

    .object-button.active {
        z-index: 1000;
        border-color: var(--main-color);
    }

    .object-button.plus {
        border-radius: 0.25rem 0 0 0.25rem;
    }

    .object-button.minus {
        border-radius: 0 0.25rem 0.25rem 0;
    }

    .object-button-label {
        font-family: Inter, sans-serif;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 500;
        font-size: 0.8rem;
    }

    .object-button-icon {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        width: 1.1rem;
        height: 1.1rem;
        font-size: .7rem;
        border-radius: 50%;
        color: white;
    }

    .object-add-container {
        display: flex;
        align-items: center;
        gap: 20px;
        cursor: pointer;
    }

    .object-add-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 4rem;
        height: 4rem;
        border-radius: .5rem;
        color: black;
        border: 1px solid rgb(161, 160, 160);
    }

    .object-add-container:hover .object-add-button {
        background-color: rgb(240, 240, 240);
    }

    .placeholder-gradient {
        background: linear-gradient(135deg, #ff4ecd, #6a9dfc, #00f0ff);
        background-size: 300% 300%;
        animation: gradientFlow 5s ease infinite;
    }

    @keyframes gradientFlow {
        0% {
            background-position: 0% 50%;
        }

        50% {
            background-position: 100% 50%;
        }

        100% {
            background-position: 0% 50%;
        }
    }

    .edit-delete-container {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
        margin-top: 10px;
    }

    .object-edit {
        cursor: pointer;
    }

    .object-delete {
        cursor: pointer;
    }
</style>