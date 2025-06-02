<template>
    <div class="effects-sidebar">
        <StickyHeader>
            <div class="header">
                <h3>Add effects</h3>
                <p class="section-description">Apply visual effects to your selected objects and the background.</p>
            </div>
        </StickyHeader>
        <div class="sidebar-content">
            <div class="section">
                <div v-if="false" class="color-picker">
                    <input type="color" v-model="selectedColor">
                    <button @click="surpriseMe" class="surprise-btn">Surprise Me</button>
                </div>
                <div class="effect-grid">
                    <hr>
                    <div class="effect-category">
                        <h4>Objects</h4>
                        <div class="effect-buttons">
                            <button v-for="effect in objectEffects" :key="effect.name" @click="applyEffect(effect)">
                                <i :class="['fas', effect.icon]"></i>
                                <span>{{ effect.name }}</span>
                            </button>
                        </div>
                    </div>
                    <hr>
                    <div class="effect-category">
                        <h4>Background</h4>
                        <div class="effect-buttons">
                            <button v-for="effect in backgroundEffects" :key="effect"
                                @click="applyBackgroundEffect(effect)">
                                <i :class="['fas', effect.icon]"></i>
                                <span>{{ effect.name }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="action-btn start-over" @click="goBack()">Go Back</button>
                <button class="action-btn next" @click="nextStep">Next</button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, watch, onMounted, onUnmounted } from 'vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue';
    import { useVideoEditor } from '@/stores/videoEditor';
    import { useTimelineStore } from '@/stores/timeline';
    import EffectHandler from '@/assets/js/effectHandler.js';
    import { calculateTimeByFrameIdx } from '@/assets/js/utils.js';

    const videoEditor = useVideoEditor();
    const timelineStore = useTimelineStore();

    const selectedColor = ref('#ff00ff');
    const activeEffect = ref(null);
    const activeBackgroundEffect = ref(null);

    const objectEffects = [
        { id: 0, name: 'Original', icon: 'fa-image' },
        { id: 1, name: 'Erase', icon: 'fa-eraser' },
        { id: 2, name: 'Blend', icon: 'fa-chart-line' },
        { id: 3, name: 'Color', icon: 'fa-palette' },
        { id: 4, name: 'Overlay', icon: 'fa-layer-group' },
        { id: 5, name: 'Cut', icon: 'fa-hand-scissors' },
        { id: 6, name: 'Split', icon: 'fa-table-columns' },
        { id: 7, name: 'Label', icon: 'fa-text-width' }
    ];

    const backgroundEffects = [
        { id: 8, name: 'Original', icon: 'fa-image' },
        { id: 9, name: 'Erase', icon: 'fa-eraser' },
        { id: 10, name: 'Blend', icon: 'fa-chart-line' },
        { id: 11, name: 'Color', icon: 'fa-palette' },
        { id: 12, name: 'Cut', icon: 'fa-hand-scissors' },
        { id: 13, name: 'Split', icon: 'fa-table-columns' },
        { id: 14, name: 'Blur', icon: 'fa-tint' },
        { id: 15, name: 'Outline', icon: 'fa-border-all' }
    ];

    async function applyEffect(effect) {
        activeEffect.value = effect;
        console.log(`Applying object effect: ${effect.name}`);

        videoEditor.maskHandler.setMaskToEdit(videoEditor.maskHandler.selectedMask)
        const mask = videoEditor.maskHandler.maskToEdit
        if (!mask) {
            console.warn('No background mask available for the selected element.');
            return;
        }
        const objId = mask.objId;
        const video = videoEditor.maskHandler.video
        const boxOfVideo = videoEditor.getBoxOfElement(video)

        let selectedVideo = null
        let boxOfSelectedVideo = null
        if (videoEditor.selectedElement?.type === 'video') {
            selectedVideo = videoEditor.selectedElement
            boxOfSelectedVideo = videoEditor.getBoxOfElement(selectedVideo)
        }

        if (['Erase', 'Cut'].includes(effect.name)) {
            console.log('Resetting effects');
            await videoEditor.effectHandler.resetEffects(boxOfVideo, video, mask,
             'object');
        }

        if (!mask) {
            console.warn('No mask available for the selected element.');
            return;
        }

        if (effect.name === 'Color') {
            videoEditor.changeTool('colorEffect')
        }

        else if (effect.name === 'Overlay') {
            videoEditor.changeTool('overlayEffect')
        }

        else if (effect.name === 'Erase') {
            const worked = await videoEditor.effectHandler.eraseWithBackgroundReplacement(video,
             mask)
            if (!worked) {
                await videoEditor.effectHandler.changeColorOfMask(video, mask, '#000000', {})
            }

            boxOfVideo.addOnDrawVideoCallback(effectId(EffectHandler.ERASE_OBJ_EFFECT_ID, mask),
             async img => {
                const [width, height] = boxOfVideo.getBoxVideoSize()
                const frame_mask = video.trackMasks?.[video.frameIdx]?.[objId]
                if (frame_mask) {
                    const outputCanvas = document.createElement('canvas')
                    outputCanvas.width = width
                    outputCanvas.height = height
                    const outputCtx = outputCanvas.getContext('2d')
                    outputCtx.drawImage(img, 0, 0, width, height)
                    const worked = await videoEditor.effectHandler.eraseWithBackgroundReplacement(
                        video, mask, outputCanvas, null, false)
                    if (!worked) {
                        await videoEditor.effectHandler.changeColorOfMask(video, mask, 
                        '#000000', {}, 255, 255, outputCanvas, null, false)
                    }
                    return outputCanvas
                }
                return img
            })
        }

        else if (effect.name === 'Original') {
            await videoEditor.effectHandler.resetEffects(boxOfVideo, video, mask)
        }

        else if (effect.name === 'Blend') {
            videoEditor.changeTool('blendEffect')
        }

        else if (effect.name === 'Cut') {
            await cutEffect(video, mask, boxOfVideo, (box, video) => 
            video.trackMasks?.[video.frameIdx]?.[objId], 
            effectId(EffectHandler.CUT_OBJ_EFFECT_ID, mask))
        }

        else if (effect.name === 'Split') {
            splitEffect(video, mask, (box, newVideo) =>
             newVideo.trackMasks?.[newVideo.frameIdx]?.[objId],
              effectId(EffectHandler.SPLIT_BKG_EFFECT_ID, mask))
        }

        else if (effect.name == 'Label') {
            videoEditor.promptElementSelection(null, async (elements) => {
                console.log(elements, elements.length)
                for (const element of elements) {
                    await videoEditor.effectHandler.handleVideoFollowMask(element, videoEditor.maskHandler.maskToEdit)
                }
            })
        }
        //
        //else if (effect.name === 'Empty') {
        //    videoEditor.changeTool('emptyEffect')
        //}
    };

    async function applyBackgroundEffect(effect) {
        activeBackgroundEffect.value = effect;
        console.log(`Applying background effect: ${effect}`);

        videoEditor.maskHandler.setMaskToEdit(videoEditor.maskHandler.video.backgroundMask)
        const mask = videoEditor.maskHandler.maskToEdit
        if (!mask) {
            console.warn('No background mask available for the selected element.', mask);
            return;
        }
        const objId = mask.objId;
        const video = videoEditor.maskHandler.video
        const boxOfVideo = videoEditor.getBoxOfElement(video)

        if (['Erase', 'Cut'].includes(effect.name)) {
            await videoEditor.effectHandler.resetEffects(boxOfVideo, video, mask, 
            'background');
        }

        if (effect.name === 'Color') {
            videoEditor.changeTool('colorEffect')
        }

        else if (effect.name === 'Erase') {
            await videoEditor.effectHandler.changeColorOfMask(video, mask, '#000000', {})

            boxOfVideo.addOnDrawVideoCallback(effectId(EffectHandler.ERASE_OBJ_EFFECT_ID, 
            mask), async img => {
                const [width, height] = boxOfVideo.getBoxVideoSize()
                const frame_mask = video.trackMasks?.[video.frameIdx]?.[objId]
                if (frame_mask) {
                    const outputCanvas = document.createElement('canvas')
                    outputCanvas.width = width
                    outputCanvas.height = height
                    const outputCtx = outputCanvas.getContext('2d')
                    outputCtx.drawImage(img, 0, 0, width, height)
                    await videoEditor.effectHandler.changeColorOfMask(video, 
                    mask, '#000000', {}, 255, 255, outputCanvas, null, false)
                    return outputCanvas
                }
                return img
            })
        }

        else if (effect.name === 'Original') {
            await videoEditor.effectHandler.resetEffects(boxOfVideo, video, mask,
             'background')
        }

        else if (effect.name === 'Blend') {
            videoEditor.changeTool('blendEffect')
        }

        else if (effect.name === 'Cut') {
            await cutEffect(video, mask, boxOfVideo, async (box, video) => {
                const obj_masks = Object.values(
                    video.trackMasks?.[video.frameIdx] || {})
                return await videoEditor.maskHandler.getBackgroundMask(
                    obj_masks, ...box.getBoxVideoSize());
            }, effectId(EffectHandler.CUT_BKG_EFFECT_ID, mask))
        }

        else if (effect.name === 'Split') {
            splitEffect(video, mask, async (box, newVideo) => {
                const obj_masks = Object.values(
                    newVideo.trackMasks?.[newVideo.frameIdx] || {})
                return await videoEditor.maskHandler.getBackgroundMask(
                    obj_masks, ...box.getBoxVideoSize());
            }, effectId(videoEditor.effectHandler.SPLIT_OBJ_EFFECT_ID, mask))
        }
    };

    function splitEffect(video, mask, getFrameMask, id) {
        video.preventNextUpdateCallbacks()

        videoEditor.cloneVideo(video, async (newVideo, box) => {
            videoEditor.effectHandler.addRelatedVideo(newVideo);

            const frameIdx = Math.min(...Object.keys(video.trackMasks).map(Number));
            const targetTime = calculateTimeByFrameIdx(frameIdx, video.fps);

            timelineStore.setVideoSpeed(newVideo, video.speed)
            //timelineStore.setStOffset(newVideo, targetTime);
            //timelineStore.setElementStart(newVideo, targetTime);

            await newVideo.waitUntilVideoIsReady()

            const getBoxVideoSize = box.getBoxVideoSize
            const outputCanvas = box.getCanvasToApplyVideo()

            await videoEditor.effectHandler.cutObject(newVideo, mask, 0, 
            outputCanvas, getBoxVideoSize, true, false)
            box.addOnDrawVideoCallback(id, async (img) => {
                const frame_mask = await getFrameMask(box, newVideo)
                const [width, height] = box.getBoxVideoSize()
                if (frame_mask) {
                    const outputCanvas = document.createElement('canvas')
                    outputCanvas.width = width
                    outputCanvas.height = height
                    const outputCtx = outputCanvas.getContext('2d')
                    outputCtx.drawImage(img, 0, 0, width, height)
                    await videoEditor.maskHandler.changeColorOfMask(
                        img, frame_mask, null, {}, 0, 0, outputCanvas, getBoxVideoSize);
                    return outputCanvas
                }
                // Criar canvas vazio e transparente
                const emptyCanvas = document.createElement('canvas');
                emptyCanvas.width = width;
                emptyCanvas.height = height;
                return emptyCanvas;
            })
        })
    }

    async function cutEffect(video, mask, box, getFrameMask, id) {
        await videoEditor.effectHandler.cutObject(video, mask, 255, null, null)
        box.addOnDrawVideoCallback(id, async img => {
            const [width, height] = box.getBoxVideoSize()
            const frame_mask = await getFrameMask(box, video)
            if (frame_mask) {
                const outputCanvas = document.createElement('canvas')
                outputCanvas.width = width
                outputCanvas.height = height
                const outputCtx = outputCanvas.getContext('2d')
                outputCtx.drawImage(img, 0, 0, width, height)
                await videoEditor.maskHandler.changeColorOfMask(img, frame_mask, null, {}, 0, 255, outputCanvas, null);
                return outputCanvas
            }
            return img
        })
    }

    function shouldCompile(video) {
        const allMasks = [...video.masks, video.backgroundMask].filter(Boolean)
        for (const mask of allMasks) {
            const settedEffects = videoEditor.effectHandler.getSettedEffects(video.id, mask.objId)

            for (const effect of settedEffects) {
                if (EffectHandler.REQUIRE_COMPILE_EFFECTS.includes(effect)) {
                    return true
                }
            }
        }

        return false
    }

    async function compileVideo(video) {
        const boxOfVideo = videoEditor.getBoxOfElement(video)
        const { width, height } = videoEditor.getRectBoxOfElement(video);
        if (shouldCompile(video)) {
            
            videoEditor.onCompileVideoMetadata(0, (metadata, compileVideo) => {
                if (compileVideo.id === video.id) {
                    metadata.x = 0
                    metadata.y = 0
                    return metadata
                }
            })

            const data = await videoEditor.compileVideos(
                [
                    video,
                    ...(videoEditor.effectHandler.bkgEffectVideos.get(video.id) || []),
                    ...(videoEditor.effectHandler.objEffectVideos.get(video.id) || [])
                ],
                false,
                width,
                height
            );

            videoEditor.removeOnCompileVideoMetadataCallback(0)

            if (!data) {
                console.error('Failed to download video data');
                return;
            }

            resetAll(video, true)

            const blob = new Blob([data], { type: 'video/mp4' });
            const file = new File([blob], 'video.mp4', { type: 'video/mp4' });
            const url = window.URL.createObjectURL(blob);

            const metadata = await videoEditor.getVideoMetadata(file)

            video.fps = metadata.fps
            video.frames = metadata.frames
            video.element.src = url
            video.element.load();
            video.element.addEventListener('loadeddata', () => {
                video.element.currentTime = timelineStore.currentTime;
            });
            video.points.length = 0
            video.file = file
        }

        video.masks.length = 0
        boxOfVideo.clearCache()
        boxOfVideo.clearActiveCanvas()
    }

    async function nextStep() {
        console.log('Proceeding to next step');

        const videosToCompile = videoEditor.effectHandler.getAllEffectVideos()
        for (const video of videosToCompile) {
            await compileVideo(video)
        }

        videoEditor.getVideos().forEach(v => {
            if (!v.shouldBeDraw)
                videoEditor.removeElement(v)
        });

        videoEditor.samState = null
        videoEditor.changeTool('media', 'media')
    };

    async function goBack() {
        console.log('Going back to previous step');
        const videosToCompile = videoEditor.effectHandler.getAllEffectVideos()
        for (const video of videosToCompile) {
            await resetAll(video, false)
        }

        videoEditor.effectHandler.deleteRelatedVideos(videoEditor.effectHandler.originalVideo)
        videoEditor.effectHandler.originalVideo.samState = 'ConfigSam'
        videoEditor.selectEditorElement(videoEditor.effectHandler.originalVideo)
        videoEditor.changeTool('sam', 'sam')
    }

    async function resetAll(video, exclude_transparency) {
        const boxOfVideo = videoEditor.getBoxOfElement(video);

        for (const mask of video.masks) {
            await videoEditor.effectHandler.resetEffects(boxOfVideo, video, mask, 'object', exclude_transparency);
            await videoEditor.effectHandler.resetEffects(boxOfVideo, video, mask, 'background', exclude_transparency);
        }

        if (video.backgroundMask) {
            await videoEditor.effectHandler.resetEffects(boxOfVideo, video, video.backgroundMask, 'object', exclude_transparency);
            await videoEditor.effectHandler.resetEffects(boxOfVideo, video, video.backgroundMask, 'background', exclude_transparency);
        }
    }

    function effectId(id, mask) {
        return EffectHandler.id(id, mask.objId)
    }

    watch(() => videoEditor.maskHandler.selectedMask, () => {
        videoEditor.maskHandler.setMaskToEdit(videoEditor.maskHandler.selectedMask)
    }, { deep: true })

    onMounted(() => {
        const video = videoEditor.effectHandler.originalVideo
        video.samState = 'SamEffects'

        videoEditor.onEditorElementSelected('SameEffects', e => {
            const allowVideos = videoEditor.effectHandler.getAllEffectVideos();
            const isAllowed = allowVideos.some(v => v?.id === e?.id);
            
            if (!isAllowed) {
                videoEditor.changeTool('sam', 'sam');
            }
        });
    })

    onUnmounted(() => {
        //videoEditor.maskHandler.video.masks.length = 0
        videoEditor.removeOnEditorElementSelected('SameEffects')
    })

</script>

<style scoped>
    .effects-sidebar {
        display: flex;
        flex-direction: column;
        /*background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);*/
        font-family: 'Segoe UI', Arial, sans-serif;
    }

    .header {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .header h3 {
        margin: 0;
    }

    .header-content {
        padding: 15px;
    }

    .header-content h2 {
        margin: 0;
        font-size: 1.3rem;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
    }

    .header-content .subtitle {
        margin: 5px 0 0;
        font-size: 0.8rem;
        color: #aaa;
    }

    .sidebar-content {
        flex: 1;
        padding: 0 20px;
        overflow-x: hidden;

    }

    .section h3 {
        font-size: 1.1rem;
    }

    .section-description {
        font-size: 0.85rem;
        color: #ccc;
    }

    .color-picker {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        align-items: center;
    }

    .color-picker input[type="color"] {
        width: 40px;
        height: 40px;
        border: 2px solid #444;
        border-radius: 50%;
        cursor: pointer;
        background: transparent;
    }

    .surprise-btn {
        flex: 1;
        padding: 10px;
        background: linear-gradient(45deg, #ff00ff, #00ffff);
        border: none;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
    }

    .surprise-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0, 255, 255, 0.3);
    }

    .effect-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
    }

    .effect-category {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .effect-category h4 {
        color: rgb(72, 72, 72);
        margin: 0;
        font-size: 0.95rem;
        font-family: Inter, sans-serif;
        font-weight: bold;
    }

    .effect-buttons {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0px;
    }

    .effect-buttons button {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 15px;
        border: none;
        background-color: white;
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.1);
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.8rem;
        text-align: center;
    }

    .effect-buttons button:focus {
        outline: none;
    }

    .effect-buttons button i {
        font-size: 1.5rem;
        margin-bottom: 5px;
        color: rgb(151, 151, 151);
        color: var(--main-color);
    }

    .effect-buttons button span {
        font-size: 0.8rem;
        color: rgb(45, 45, 45);
        font-weight: 600;
        font-family: Inter, sans-serif;
    }

    .effect-buttons button:hover {
        background: linear-gradient(45deg, #ff00ff, #00ffff);
        border-color: transparent;
        color: white;
        font-weight: bold;
    }

    .effect-buttons button:hover i,
    .effect-buttons button:hover span {
        color: white;
    }

    .action-buttons {
        display: flex;
        gap: 10px;
        margin-top: 20px;
        margin-bottom: 20px;
    }

    .action-btn {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 5px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s;
    }

    .start-over {
        color: rgb(41, 41, 41);
    }

    .start-over:hover {
        background: rgba(121, 121, 121, 0.75);
    }

    .next {
        background: linear-gradient(45deg, #ff00ff, #00ffff);
        color: white;
    }

    .next:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0, 255, 255, 0.3);
    }

    hr {
        position: relative;
        left: -100%;
        width: 1000%;
        overflow-x: hidden;
    }
</style>