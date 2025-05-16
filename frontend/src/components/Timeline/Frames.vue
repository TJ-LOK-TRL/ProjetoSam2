<template>
    <div ref="framesContainerRef" class="frames-container" :data-id="video?.id" v-show="video?.shouldBeDraw">
        <canvas ref="timelineCanvasRef" class="timeline-canvas"></canvas>
        <div ref="resizableContainer" class="resizable-container">
            <div class="left-cut lateral-cut" ref="ctrl_ml"></div>
            <div class="right-cut lateral-cut" ref="ctrl_mr"></div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, watch, nextTick } from 'vue'
    import { useVideoEditor } from '@/stores/videoEditor'
    import { useTimelineStore } from '@/stores/timeline'
    import { loadImageFromCache } from '@/assets/js/utils.js';
    import Grab from '@/assets/js/grab.js';
    import Resize from '@/assets/js/box_resize.js';

    const videoEditor = useVideoEditor()
    const timelineStore = useTimelineStore()

    const props = defineProps({
        video: Object,
        parent: Object,
    })

    const timelineCanvasRef = ref(null)
    const framesContainerRef = ref(null)
    const video = ref(null)
    const parent = ref(null)
    const grabInstance = ref(null)
    const resizableContainer = ref(null)
    const resizeInstance = ref(null)
    const leftCutContainer = ref(null)
    const rightCutContainer = ref(null)
    const ctrl_ml = ref(null)
    const ctrl_mr = ref(null)

    function sizeToDuration(size) {
        const totalWidth = framesContainerRef.value.parentElement.getBoundingClientRect().width
        const duration = timelineStore.zoom
        return (duration * size) / totalWidth
    }

    function drawFrames() {
        if (!video.value.shouldBeDraw) return

        const canvas = timelineCanvasRef.value
        if (!canvas || !video.value.frames) return

        const ctx = canvas.getContext('2d')
        const totalWidth = framesContainerRef.value.parentElement.getBoundingClientRect().width
        const duration = video.value.duration / video.value.speed
        const width = totalWidth * (duration / timelineStore.zoom)

        const frameWidth = width / video.value.frames.length
        const frameHeight = 60

        framesContainerRef.value.style.width = width + 'px'
        canvas.width = width
        canvas.height = frameHeight

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

    function handleReorder() {
        const allFrames = Array.from(parent.value.querySelectorAll('.timeline-video-frames'));
        const currentFrame = framesContainerRef.value;
        const currentRect = currentFrame.getBoundingClientRect();

        // Encontra o frame sobre o qual o elemento foi solto
        const targetFrame = allFrames.find(frame => {
            if (frame === currentFrame) return false;

            const frameRect = frame.getBoundingClientRect();

            // Verifica sobreposição vertical (pelo menos 50% de altura)
            const verticalOverlap =
                currentRect.bottom > frameRect.top + frameRect.height * 0.5 &&
                currentRect.top < frameRect.bottom - frameRect.height * 0.5;

            return verticalOverlap;
        });

        if (targetFrame) {
            console.log('Reorder:', currentFrame.dataset.id, targetFrame.dataset.id);
            videoEditor.reorderElements(currentFrame.dataset.id, targetFrame.dataset.id);
        }

        currentFrame.style.removeProperty('top');
    }

    function handleStOffset() {
        if (timelineStore.minDuration != 0) {
            framesContainerRef.value.style.removeProperty('left');
            return
        }

        const left = parseFloat(framesContainerRef.value.style.left) || 0;
        const offsetSeconds = sizeToDuration(left)
        timelineStore.setStOffset(video.value, offsetSeconds)
    }

    function handleZoomChange() {
        const stOffset = video.value.stOffset
        const totalWidth = framesContainerRef.value.parentElement.getBoundingClientRect().width
        const newLeft = totalWidth * ((stOffset - timelineStore.minDuration) / timelineStore.zoom)
        framesContainerRef.value.style.left = newLeft + 'px'
    }

    watch(
        () => [video?.value?.start, video?.value?.end, video?.value?.speed],
        () => {
            drawFrames();
        },
        { deep: true }
    );

    watch(() => timelineStore.zoom, () => {
        if (!grabInstance.value || !grabInstance.value.isMoving) {
            drawFrames()
            handleZoomChange()
        }
    })

    onMounted(() => {
        parent.value = props.parent
        props.video.onMetadataLoaded(async () => {
            video.value = props.video
            drawFrames()

            await nextTick()
            
            grabInstance.value = new Grab(framesContainerRef.value, framesContainerRef.value);
            grabInstance.value.useRelativeOffsets = true

            grabInstance.value.onIniGrabEvent = (eg, em, dx, dy) => {
                em.style.zIndex = '9999'
                em.style.transition = ''

                videoEditor.preventUnselectElementOnOutside = true
                videoEditor.selectEditorElement(video.value)
            }

            grabInstance.value.onMoveGrabEvent = (eg, em, dx, dy) => {
                if (timelineStore.minDuration > 0) {
                    timelineStore.zoomFit()
                }

                const currentLeft = parseFloat(em.style.left) || 0;
                const currentTop = parseFloat(em.style.top) || 0;
                const parent = em.parentElement;

                handleStOffset()

                // Obtém retângulos absolutos
                const parentRect = parent.getBoundingClientRect();
                const elementRect = em.getBoundingClientRect();

                // Restrição horizontal (mantém igual)
                if (currentLeft + dx < 0) {
                    dx = -currentLeft;
                }

                // Calcula novas posições absolutas
                const newTop = elementRect.top - parentRect.top + dy;
                const newBottom = newTop + elementRect.height;

                // Limites do container
                const containerTop = 0;
                const containerBottom = parentRect.height;

                // Verifica se está tentando sair pelo topo (visual)
                if (newTop < containerTop) {
                    dy = containerTop - (elementRect.top - parentRect.top);
                }

                // Verifica se está tentando sair pelo fundo (visual)
                if (newBottom > containerBottom) {
                    dy = containerBottom - (elementRect.bottom - parentRect.top);
                }

                return [dx, dy];
            };

            grabInstance.value.onEndGrabEvent = (eg, em, x, y) => {
                em.style.zIndex = '';
                em.style.transition = '0.1s';

                handleReorder()
                handleStOffset()
                handleZoomChange()
                drawFrames()
            };
            
            resizeInstance.value = new Resize(
                resizableContainer.value,
                null, null, null,
                ctrl_ml.value, ctrl_mr.value,
                null, null, null
            );

            resizeInstance.value.onInitResizeEvent = () => { 
                grabInstance.value.canExecute = false
            }

            resizeInstance.value.onEndResizeEvent = (ctrl_type) => { 
                grabInstance.value.canExecute = true
                if (ctrl_type == Resize.MIDDLE_LEFT) {
                    const offetLeft = resizableContainer.value.offsetLeft
                    framesContainerRef.value.style.left = Math.max(parseFloat(framesContainerRef.value.offsetLeft) + offetLeft + 'px', 0) 

                    const offsetSeconds = sizeToDuration(offetLeft)
                    //console.log('INFO:', offetLeft, offsetSeconds, offsetSeconds * video.value.speed, video.value.start + offsetSeconds * video.value.speed)
                    timelineStore.setVideoStart(video.value, video.value.start + offsetSeconds)
                    timelineStore.setStOffset(video.value, video.value.stOffset + offsetSeconds)
                } 
                
                else if (ctrl_type == Resize.MIDDLE_RIGHT) {
                    const newWidth = resizableContainer.value.getBoundingClientRect().width
                    framesContainerRef.value.style.width = newWidth + 'px'
                    const newEndTime = sizeToDuration(newWidth) * video.value.speed
                    //console.log('INFO:', newWidth, newEndTime, video.value.stOffset + newEndTime)
                    timelineStore.setVideoEnd(video.value, video.value.start + newEndTime)
                }
                
                resizableContainer.value.style.left = '0px'
                resizableContainer.value.style.width = null
                drawFrames()
            }
        })
    })
</script>

<style scoped>
    .frames-container {
        position: relative;
        top: 0;
        left: 0;
        width: 100%;
        overflow-x: hidden;
        margin: 0;
        padding: 0;
        transform: translateZ(0);
        display: flex;
        overflow-x: visible;
    }

    .resizable-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 4px solid transparent;
        border-radius: .25rem;
        display: flex;
    }

    .resizable-container:hover {
        border: 4px solid orange;
        border-radius: .25rem;
    }

    .timeline-canvas {
        display: block;
        width: 100%;
        height: 60px;
    }

    .lateral-cut {
        position: absolute;
        top: 0;
        width: 15px;
        height: 100%;
        background: transparent;
        cursor: ew-resize;
        z-index: 2;
        transition: background 0.2s;
    }

    .left-cut {
        left: 0;
    }

    .right-cut {
        right: 0;
    }
</style>