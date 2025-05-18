<template>
    <TextEdit v-if='videoEditor?.selectedElement?.type === "text"' />
    <TextList v-else/>
</template>

<script setup>
    import { useVideoEditor } from '@/stores/videoEditor'
    import TextList from './TextList.vue'
    import TextEdit from './TextEdit.vue'

    const videoEditor = useVideoEditor()
</script>