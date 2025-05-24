<template>
    <MediaEdit v-if='videoEditor?.selectedElement?.type === "video"' />
    <Media v-else/>
</template>

<script setup>
    import { useVideoEditor } from '@/stores/videoEditor'
    import Media from './Media.vue'
    import MediaEdit from './MediaEdit.vue'

    const videoEditor = useVideoEditor()
</script>