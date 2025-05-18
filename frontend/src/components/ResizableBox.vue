<template>
    <div ref="boxRef" class="box" @mousedown="handleBoxClick" :style="{ transform: `rotate(${rotation}deg)` }">
        <div class="flip-div" :style="{ transform: `scaleX(${isFlipped ? -1 : 1})` }">
            <slot></slot>

            <!-- BOTÃO DE ROTAÇÃO -->
            <div class="rotate-button" v-show="showResizeControls" @mousedown.stop.prevent="startRotate">
                <i class="fas fa-rotate-right"></i> <!-- ou fa-rotate-left -->
            </div>


        </div>
        <div ref="resizeControlsRef" class="resize-controls" v-show="showResizeControls">
            <!-- TOP -->
            <div class="resize-controls-line resize-controls-line-first">
                <div ref="ctrl_tl" class="resize-controls-item resize-controls-item-circle top-left"></div>
                <div ref="ctrl_tm" class="resize-controls-item resize-controls-item-rect top-center"></div>
                <div ref="ctrl_tr" class="resize-controls-item resize-controls-item-circle top-right"></div>
            </div>

            <!-- MIDDLE -->
            <div class="resize-controls-line resize-controls-line-middle">
                <div ref="ctrl_ml" class="resize-controls-item resize-controls-item-rect middle-left"></div>
                <div ref="ctrl_mr" class="resize-controls-item resize-controls-item-rect middle-right"></div>
            </div>

            <!-- BOTTOM -->
            <div class="resize-controls-line resize-controls-line-last">
                <div ref="ctrl_bl" class="resize-controls-item resize-controls-item-circle bottom-left"></div>
                <div ref="ctrl_bm" class="resize-controls-item resize-controls-item-rect bottom-center"></div>
                <div ref="ctrl_br" class="resize-controls-item resize-controls-item-circle bottom-right"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue';
    import Resize from '@/assets/js/box_resize.js';
    import Grab from '@/assets/js/grab.js';
    import SnapLine from '@/assets/js/snap_line.js';
    import { useVideoEditor } from '@/stores/videoEditor';

    const videoEditor = useVideoEditor()

    const props = defineProps({
        enableResize: Boolean,
    });

    const boxRef = ref(null);
    const resizeControlsRef = ref(null);
    const showResizeControls = ref(false);
    const wasInited = ref(false)

    const ctrl_tl = ref(null), ctrl_tm = ref(null), ctrl_tr = ref(null);
    const ctrl_ml = ref(null), ctrl_mr = ref(null);
    const ctrl_bl = ref(null), ctrl_bm = ref(null), ctrl_br = ref(null);

    const isFlipped = ref(false)
    const rotation = ref(0);
    let rotating = false;
    let initialAngle = 0;
    let angleOffset = 0;

    let resizeInstance = null;
    let grabInstance = null;
    let snapLines = null;

    async function init() {
        await nextTick();

        resizeInstance?.Destroy()
        grabInstance?.Destroy()
        snapLines?.Destroy()
        resizeInstance = new Resize(
            boxRef.value,
            ctrl_tl.value, ctrl_tm.value, ctrl_tr.value,
            ctrl_ml.value, ctrl_mr.value,
            ctrl_bl.value, ctrl_bm.value, ctrl_br.value
        );

        resizeInstance.keepProportion = false;

        grabInstance = new Grab(resizeControlsRef.value, boxRef.value);
        grabInstance.xspeed = () => videoEditor.zoomLevel
        snapLines = new SnapLine(boxRef.value?.parentElement?.parentElement?.parentElement);

        resizeInstance.onInitResizeEvent = () => {
            grabInstance.canExecute = false;
        }

        resizeInstance.onEndResizeEvent = () => {
            grabInstance.canExecute = true;
        }

        resizeInstance.onBeforeResize = (ctrl_type, x, y, dx, dy) => {
            const box = boxRef.value;
            const parent = box?.parentElement; // video-space-container
            const grandParent = parent?.parentElement?.parentElement; // video-player-container

            if (!box || !parent || !grandParent) return { dx, dy };

            const boxRect = box.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            const grandRect = grandParent.getBoundingClientRect(); // usado para ajustar a posição da linha

            const threshold = 5;
            let snappedDx = dx;
            let snappedDy = dy;
            let snapping = false;

            // CALCULAMOS A DIFERENÇA ENTRE O PARENT E O AVÔ
            const offsetLeft = parentRect.left - grandRect.left;
            const offsetTop = parentRect.top - grandRect.top;

            // --- LEFT SNAP ---
            if (
                (ctrl_type === Resize.MIDDLE_LEFT || ctrl_type === Resize.TOP_LEFT || ctrl_type === Resize.BOTTOM_LEFT) &&
                Math.abs((boxRect.left + dx) - parentRect.left) <= threshold
            ) {
                snappedDx = parentRect.left - boxRect.left;
                snapLines.showVertical(offsetLeft); // snap à esquerda do parent
                snapping = true;
            }

            // --- RIGHT SNAP ---
            if (
                (ctrl_type === Resize.MIDDLE_RIGHT || ctrl_type === Resize.TOP_RIGHT || ctrl_type === Resize.BOTTOM_RIGHT) &&
                Math.abs((boxRect.right + dx) - parentRect.right) <= threshold
            ) {
                snappedDx = parentRect.right - boxRect.right;
                snapLines.showVertical(parentRect.right - grandRect.left); // snap à direita
                snapping = true;
            }

            // --- TOP SNAP ---
            if (
                (ctrl_type === Resize.TOP_LEFT || ctrl_type === Resize.TOP_RIGHT || ctrl_type === Resize.TOP_MIDDLE) &&
                Math.abs((boxRect.top + dy) - parentRect.top) <= threshold
            ) {
                snappedDy = parentRect.top - boxRect.top;
                snapLines.showHorizontal(offsetTop); // topo
                snapping = true;
            }

            // --- BOTTOM SNAP ---
            if (
                (ctrl_type === Resize.BOTTOM_LEFT || ctrl_type === Resize.BOTTOM_RIGHT || ctrl_type === Resize.BOTTOM_MIDDLE) &&
                Math.abs((boxRect.bottom + dy) - parentRect.bottom) <= threshold
            ) {
                snappedDy = parentRect.bottom - boxRect.bottom;
                snapLines.showHorizontal(parentRect.bottom - grandRect.top); // fundo
                snapping = true;
            }

            if (!snapping) snapLines.hide();

            return { dx: snappedDx, dy: snappedDy };
        }

        if (wasInited.value) {
            //resizeInstance.cleanOffsets();
        }

        wasInited.value = true
    }

    async function reload() {
        if (wasInited.value) {
            await init()
        }
    }

    onMounted(async () => {
        document.addEventListener('mousedown', handleClickOutside);

        if (props.enableResize) {
            await init()
        } else {
            watch(() => props.enableResize, async () => {
                if (props.enableResize) {
                    await init()
                }
            });
        }
    })

    onBeforeUnmount(() => {
        document.removeEventListener('mousedown', handleClickOutside);
        resizeInstance?.Destroy();
        grabInstance?.Destroy();
        snapLines?.Destroy();
    });

    defineExpose({
        reload,
        boxRef,
        getRect: (abs = false) => {
            const box = boxRef.value;
            if (!box) return null;
            const originalTransform = box.style.transform;
            box.style.transform = 'none';
            const rect = box.getBoundingClientRect();
            const x = abs ? rect.left / videoEditor.zoomLevel : parseInt(box.style.left || '0', 10);
            const y = abs ? rect.top / videoEditor.zoomLevel : parseInt(box.style.top || '0', 10);
            box.style.transform = originalTransform;
            return {
                x: x,
                y: y,
                width: rect.width / videoEditor.zoomLevel,
                height: rect.height / videoEditor.zoomLevel,
                left: x,
                top: y,
                rotation: rotation.value,
            };
        },
        setPosition: (x, y) => {
            const box = boxRef.value;
            if (!box) return;
            box.style.left = `${x}px`;
            box.style.top = `${y}px`;
        },
        setSize: (width, height) => {
            const box = boxRef.value;
            if (!box) return;
            box.style.width = `${width}px`;
            box.style.height = `${height}px`;
        },

        getRotation: () => rotation.value,
        flip: () => isFlipped.value = !isFlipped.value,
        getFlip: () => isFlipped.value,
    });

    function handleBoxClick() {
        if (props.enableResize) {
            showResizeControls.value = true;
        }
    }

    function handleClickOutside(event) {
        if (boxRef.value &&
            !boxRef.value.contains(event.target)
        ) {
            showResizeControls.value = false;
        }
    }

    function startRotate(e) {
        if (!boxRef.value) return;

        rotating = true;

        const rect = boxRef.value.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        initialAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        angleOffset = rotation.value - initialAngle;

        document.addEventListener('mousemove', rotateMouseMove);
        document.addEventListener('mouseup', stopRotate);
    }

    function rotateMouseMove(e) {
        if (!rotating || !boxRef.value) return;

        const rect = boxRef.value.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        rotation.value = angle + angleOffset;
    }

    function stopRotate() {
        console.log('finish')
        rotating = false;
        document.removeEventListener('mousemove', rotateMouseMove);
        document.removeEventListener('mouseup', stopRotate);
    }

</script>

<style scoped>
    .box {
        position: absolute;
        background-color: transparent;
        /* transform-origin: right top !important; */
        /* transform-origin: left top !important; */
        /* transform-origin: right bottom !important; */
        /* transform-origin: left bottom !important; */
        transform-origin: center center;
        /* opacity: 0.6; */
    }


    /*.box::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 0, 0, 0.6);
        transform: rotate(-45deg);
        transform-origin: center;
        pointer-events: none;
    }*/


    .resize-controls {
        position: absolute;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        transition: border 0.3s;
        border: 2px solid var(--main-color);
        background-color: transparent;
    }

    .resize-controls-line {
        display: flex;
        justify-content: space-between;
        width: 100%;
        height: 100%;
    }

    .resize-controls-item {
        width: 14px;
        height: 14px;
        background-color: white;
        border: 2px solid var(--main-color);
        pointer-events: auto;
        cursor: pointer;
        transition: transform 0.2s ease;
    }

    .resize-controls-item-circle {
        border-radius: 50%;
    }

    .resize-controls-item-rect {
        width: 21px;
        height: 14px;
        border-radius: 10%;
    }

    .resize-controls-line-middle {
        align-items: center;
    }

    .resize-controls-line-last {
        align-items: flex-end;
    }

    .top-left {
        transform: translate(-50%, -50%);
        cursor: nwse-resize;
    }

    .top-center {
        transform: translate(0, -50%);
        cursor: ns-resize;
    }

    .top-right {
        transform: translate(50%, -50%);
        cursor: nesw-resize;
    }

    .middle-left {
        width: 14px;
        height: 21px;
        transform: translate(-50%, 0%);
        cursor: ew-resize;
    }

    .middle-right {
        width: 14px;
        height: 21px;
        transform: translate(50%, 0%);
        cursor: ew-resize;
    }

    .bottom-left {
        transform: translate(-50%, 50%);
        cursor: nesw-resize;
    }

    .bottom-center {
        transform: translate(0, 50%);
        cursor: ns-resize;
    }

    .bottom-right {
        transform: translate(50%, 50%);
        cursor: nwse-resize;
    }

    .rotate-button {
        position: absolute;
        display: flex;
        justify-content: center;
        align-items: center;
        top: -50px;
        left: 50%;
        width: 25px;
        height: 25px;
        transform: translateX(-50%);
        background: white;
        border: 2px solid var(--main-color);
        border-radius: 50%;
        cursor: grab;
        user-select: none;
    }

    .rotate-button::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 25px;
        background-image: repeating-linear-gradient(to bottom,
                rgb(86, 86, 86),
                rgb(86, 86, 86) 2px,
                transparent 2px,
                transparent 4px);
        width: 2px;
    }

    .rotate-button>i {
        font-size: 10px;
    }

    .flip-div {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
</style>