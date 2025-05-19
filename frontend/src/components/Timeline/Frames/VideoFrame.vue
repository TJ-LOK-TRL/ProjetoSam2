<template>
    <canvas ref="timelineCanvasRef" class="timeline-canvas"></canvas>
</template>

<script setup>
    import { ref, onMounted, nextTick } from 'vue'
    import { useVideoEditor } from '@/stores/videoEditor'
    import { useTimelineStore } from '@/stores/timeline'
    import { loadImageFromCache } from '@/assets/js/utils.js';

    const props = defineProps({
        video: Object,
    })

    const video = ref(props.video)
    const timelineCanvasRef = ref(null)

    function drawFrames(width) {
        if (!video.value.shouldBeDraw) return

        const canvas = timelineCanvasRef.value
        if (!canvas || !video.value.frames) return

        const frameWidth = width / video.value.frames.length
        const frameHeight = 60
        
        canvas.width = width
        canvas.height = frameHeight
        
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        video.value.frames.forEach((frameSrc, index) => {
            loadImageFromCache(frameSrc).then(img => {
                const pattern = ctx.createPattern(img, 'repeat-x')
                ctx.fillStyle = pattern

                const frameX = index * frameWidth
                ctx.fillRect(frameX, 0, frameWidth, frameHeight)
            }).catch(err => {
                console.error('Erro ao carregar a imagem:', err)
            })
        })
    }

    function update(newWidth) {
        drawFrames(newWidth)
    }

    defineExpose({
        update,
    })

</script>

<style scoped>
    .timeline-canvas {
        display: block;
        width: 100%;
        height: 60px;
    }
</style>