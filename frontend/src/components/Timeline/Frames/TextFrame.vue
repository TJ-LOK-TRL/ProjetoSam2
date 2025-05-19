<template>
    <div>{{ text.text }}</div>
</template>

<script setup>
    import { ref, onMounted, nextTick } from 'vue'
    import { useVideoEditor } from '@/stores/videoEditor'
    import { useTimelineStore } from '@/stores/timeline'
    import Frame from '@/components/Timeline/Frames/Frame.vue'

    const props = defineProps({
        text: Object,
    })

    const text = ref(props.text)

    function update(newWidth) {

    }

    defineExpose({
        update,
    })
</script>