<template>
    <div>
        <ListMediaElements @onElementSelected="onElementSelected" />
    </div>
</template>

<script setup>
    import ListMediaElements from './ListMediaElements.vue'
    import { useVideoEditor } from '@/stores/videoEditor'

    const videoEditor = useVideoEditor()

    function onElementSelected({ element, type }) {
        videoEditor.selectEditorElement(element)
        if (type === 'text') {
            videoEditor.changeTool('text', 'text')
        } else if (type === 'video' || type === 'object') {
            videoEditor.changeTool('media', 'media')
        } else {
            console.log('Unknown Element Clicked:', element)
        }
    }
</script>