<template>
    <div class="sidebar-div stock-videos-container" @mouseenter="handleVideoContainerHover($event)"
        @mouseleave="handleVideoContainerLeave($event)" ref="stockVideosContent">
        <p class="sidebar-subtitle">
            <span>{{ props.title }}</span>
        </p>
        <div class="stock-videos-slideshow">
            <div class="stock-videos-content">
                <div class="videos-container" ref="videosContainer">
                    <div class="video-item" v-for="(item, index) in mediaItems" :key="index"
                        @click="handleStockVideoClick(item)">
                        <video v-if="item.type === 'video'" :src="item.src" class="media" muted playsinline
                            @loadedmetadata="setDuration(index, $event)" @mouseenter="handleVideoHover($event)"
                            @mouseleave="handleVideoLeave($event)"></video>

                        <img v-else-if="item.type === 'image'" :src="item.src" class="media" />

                        <div v-if="item.type === 'video'" class="video-time">{{ formattedDurations[index] }}</div>
                    </div>
                </div>
            </div>
            <button class="arrow-left" ref="arrowLeft" :style="{ opacity: isHoveringContainer && showLeftArrow ? 1 : 0, 
                pointerEvents: isHoveringContainer && showLeftArrow ? 'all' : 'none' }">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button class="arrow-right" ref="arrowRight" :style="{ opacity: isHoveringContainer && showRightArrow ? 1 : 0, 
                pointerEvents: isHoveringContainer && showRightArrow ? 'all' : 'none' }">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    </div>
</template>

<script setup>
    import { onMounted, ref, nextTick, computed } from 'vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import SlideShow from '@/assets/js/slideshow'
    import slideshowGrab from '@/assets/js/slideshow_grap'

    const formattedDurations = ref([])
    const showLeftArrow = ref(false);
    const showRightArrow = ref(true);
    const isHoveringContainer = ref(false);
    const preventNextSelect = ref(false);
    const stockVideosContent = ref(null)
    const videosContainer = ref(null);
    const arrowLeft = ref(null)
    const arrowRight = ref(null)
    const dragStartTarget = ref(null);

    const mediaItems = computed(() => {
        const videoItems = props.videos.map(v => ({ ...v, type: 'video' }))
        const imageItems = props.images.map(i => ({ ...i, type: 'image' }))
        return [...videoItems, ...imageItems]
    })

    const props = defineProps({
        videos: {
            type: Array,
            default: () => []
        },
        images: {
            type: Array,
            default: () => []
        },
        title: {
            type: String,
            default: 'Stock Videos'
        }
    })

    const emit = defineEmits(['add-video'])

    function setDuration(index, event) {
        const video = event.target;
        video.loop = true;
        const duration = video.duration;
        if (!isNaN(duration)) {
            formattedDurations.value[index] = formatTime(duration);
        }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    function handleVideoContainerHover(event) {
        isHoveringContainer.value = true
    }

    function handleVideoContainerLeave(event) {
        isHoveringContainer.value = false
    }

    function handleVideoHover(event) {
        const video = event.target;
        video.muted = true;
        video.play().catch(e => {
            console.warn("Reprodução bloqueada:", e);
        });
    }

    function handleVideoLeave(event) {
        event.target.pause();
    }

    function handleStockVideoClick(video) {
        if (preventNextSelect.value === true) {
            preventNextSelect.value = false
            return
        }

        emit('add-video', video)
    }

    onMounted(async () => {
        await nextTick()
        let slideShow = new SlideShow(stockVideosContent.value, videosContainer.value, 'video-item', 8);
        slideShow.setArrowLeft(arrowLeft.value);
        slideShow.setArrowRight(arrowRight.value);
        slideshowGrab(slideShow, 5,
            /* On Drag Enter */
            (e) => {
                dragStartTarget.value = e.target
            },

            /* On Drag Move */
            () => {
                preventNextSelect.value = true; // HAVE TO BE HERE CUZ DRAG ENTER IS ALWAYS CALLED EVEN IF NO REAL DRAG 
            },

            /* On Drag Leave */
            (e) => {
                const videoItems = Array.from(videosContainer.value.querySelectorAll('.video-item'));
                const startInside = videoItems.some(item => item.contains(dragStartTarget.value));
                const endInside = videoItems.some(item => item.contains(e.target));

                const wasClickInItem = startInside && endInside;

                if (!wasClickInItem) {
                    preventNextSelect.value = false;
                }

                dragStartTarget.value = null;
            }
        )

        slideShow.onNumChange = ({ canGoLeft, canGoRight }) => {
            showLeftArrow.value = canGoLeft;
            showRightArrow.value = canGoRight;
        };
    })

</script>

<style scoped>
    .stock-videos-slideshow {
        position: relative;
        display: flex;
        width: 100%;
    }

    .stock-videos-container {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        overflow: hidden;
    }

    .stock-videos-content {
        display: flex;
        overflow: hidden;
        transition: transform 0.5s ease;
        width: 100%;
    }

    .videos-container {
        position: relative;
        display: flex;
        transition: .5s;
        gap: 8px;
    }

    .video-item {
        width: 140px;
        position: relative;
        flex-shrink: 0;
        border-radius: .625rem;
    }

    .video-item video, 
    .video-item img {
        width: 100%;
        height: 80px;
        object-fit: cover;
        border-radius: .625rem;
        cursor: pointer;
        user-select: none;
        -webkit-user-drag: none;
        user-drag: none;
    }

    .arrow-left,
    .arrow-right {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: white;
        color: rgb(63, 63, 63);
        border: none;
        padding: 10px;
        font-size: 11px;
        cursor: pointer;
        z-index: 10;
        border: 1px solid black;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
        transition: opacity 0.5s ease;
        opacity: 0;
        pointer-events: none;
    }

    .arrow-left {
        left: 0px;
    }

    .arrow-right {
        right: 0px;
    }

    .video-time {
        font-family: Inter, sans-serif;
        font-size: 0.71875rem;
        letter-spacing: 0.01em;
        font-weight: 500;
        color: rgb(255, 255, 255);
        background: rgba(25, 32, 51, 0.75);
        border-radius: 4px;
        position: absolute;
        left: 0.5rem;
        bottom: 0.5rem;
        padding: 0.25rem;
        line-height: 1;
        z-index: 2;
        pointer-events: none;
    }

    .video-item:hover .video-time {
        display: block;
    }
</style>