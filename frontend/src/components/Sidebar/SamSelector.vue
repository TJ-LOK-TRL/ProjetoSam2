<template>
    <ConfigSam v-if="state === 'ConfigSam'" />
    <SamEffects v-else-if="state === 'SamEffects'" />
    <div v-else-if="state === 'noVideoSelected'">
        <StickyHeader :show-icon="true">
            SAM
        </StickyHeader>
        <div class="sidebar-div">
            <p>Select a video first...</p>
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue'
    import ConfigSam from './ConfigSam.vue'
    import SamEffects from './Effects/SamEffects.vue'
    import { useVideoEditor } from '@/stores/videoEditor'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'

    const videoEditor = useVideoEditor()

    const state = computed({
        get: () => {
            if (videoEditor.selectedElement?.type !== 'video') return 'noVideoSelected'
            const video = videoEditor.effectHandler.getOriginalVideo(videoEditor.selectedElement)
            
            if (video.samState === null) video.samState = 'ConfigSam'
            videoEditor.effectHandler.setVideoToApplyEffect(video, true)
            const callbackId = 'originalVideoCallback'
            videoEditor.removeOnEditorElementSelected(callbackId)
            videoEditor.onEditorElementSelected(callbackId, (selectedElement) => {
                if (selectedElement?.id === video?.id) {
                    videoEditor.effectHandler.setVideoToApplyEffect(video)
                }
            })
            
            if (video.samState === 'SamEffects') {
                // ONLY TO TRIGGER THE WATCH() IN BOX VIDEO'S TO HANDLE VISIBLE MASKS STATE
                videoEditor.changeTool('samEffects', 'sam') 
            }

            return video.samState
        }
    })
</script>