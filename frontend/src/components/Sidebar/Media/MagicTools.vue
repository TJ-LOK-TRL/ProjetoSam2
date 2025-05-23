<template>
    <div class="sidebar-div magic-tools-container">
        <p class="sidebar-subtitle">
            <span>Magic Tools</span> <i class="magic-tools-icon fa-solid fa-wand-magic-sparkles"></i>
        </p>
        <div class="magic-tools-content">
            <div class="magic-tools-box" @click="enableMaskSelection">
                <div class="magic-tools-box-left">
                    <i class="magic-tools-box-icon fa-regular fa-hand-point-up"></i>
                    <div class="magic-tools-box-text-container">
                        <p class="magic-tools-box-title">Select Object</p>
                        <p class="magic-tools-box-desc">Select anything in the video</p>
                    </div>
                </div>
                <div class="magic-tools-box-right">
                    <i class="magic-tools-box-right-icon fa-solid fa-bolt"></i>
                </div>
            </div>

            <div class="magic-tools-box" @click="onRemoveColorClick">
                <div class="magic-tools-box-left">
                    <i class="magic-tools-box-icon fa-solid fa-eraser"></i>
                    <div class="magic-tools-box-text-container">
                        <p class="magic-tools-box-title">Remove Color</p>
                        <p class="magic-tools-box-desc">Erase a color from the video</p>
                    </div>
                </div>
                <div class="magic-tools-box-right">
                    <i class="magic-tools-box-right-icon fa-solid fa-bolt"></i>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { useVideoEditor } from '@/stores/videoEditor'

    const videoEditor = useVideoEditor()

    async function enableMaskSelection() {
        if (videoEditor.selectedElement?.type == 'video') {
            const video = videoEditor.selectedElement
            if (!videoEditor.isSelectingMask) {
                //const video = videoEditorStore.selectedElement
                //const frameBlob = await video.captureCurrentFrame()
                //console.log('Frame captured:', frameBlob)
                //videoEditorStore.isLoading = true
                try {
                    //const maskData = await videoEditorStore.generateMasksForFrame(frameBlob)
                    videoEditor.isSelectingMask = true
                    //console.log('MaskData: ', maskData)
                    //video.addMask(maskData)
                } finally {
                    //videoEditorStore.isLoading = false
                }
            }

            
            videoEditor.effectHandler.setVideoToApplyEffect(video)
            const callbackId = 'MagicTools'
            videoEditor.removeOnEditorElementSelected(callbackId)
            videoEditor.onEditorElementSelected(callbackId, (selectedElement) => {
                if (selectedElement?.id === video?.id) {
                    videoEditor.effectHandler.setVideoToApplyEffect(video)
                }
            })

            videoEditor.changeTool('configSam', 'media')
        }
    }

    function onRemoveColorClick() {
        // Implement the logic for removing color from the video
        videoEditor.changeTool('removeColor', 'media')
    }
</script>

<style scoped>
    .magic-tools-container {
        display: flex;
        flex-direction: column;
        width: 100%;
    }

    .magic-tools-icon {
        font-size: 12px;
        color: var(--main-color);
    }

    .magic-tools-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
    }

    .magic-tools-box {
        display: flex;
        width: 100%;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        cursor: pointer;
        border: 0.5px solid rgb(234, 234, 234);
        border-radius: 0.625rem;
        box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);
        min-height: 4.25rem;
        max-height: 4.25rem;
    }

    .magic-tools-box:hover {
        border: 0.5px solid rgb(161, 160, 160);
    }

    .magic-tools-box-left {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .magic-tools-box-icon {
        font-size: 15px;
        padding: 10px;
        background-color: rgb(235, 237, 255);
        border-radius: 5px;
        color: var(--main-color);
        width: 35px;
        height: 100%;
        text-align: center;
    }

    .magic-tools-box-title {
        color: rgb(24, 25, 27);
        font-size: 0.8125rem;
        font-weight: 500;
        white-space: nowrap;
    }

    .magic-tools-box-desc {
        font-size: 0.71875rem;
        color: rgb(165, 167, 173);
    }

    .magic-tools-box-right-icon {
        width: 20px;
        height: 20px;
        font-size: 10px;
        color: white;
        background-color: rgb(255, 163, 26);
        border-radius: 30%;
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>