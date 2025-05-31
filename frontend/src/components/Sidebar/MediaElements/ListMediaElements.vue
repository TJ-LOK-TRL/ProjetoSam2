<template>
    <div class="list-media-elements-container">
        <StickyHeader :showIcon="false">
            <div class="list-media-title-container" :style="`justify-content: ${titleAlign}`">
                {{ title }}
            </div>
        </StickyHeader>

        <div class="local-sidebar-div sidebar-div">
            <!-- Filtro dos tipos -->
            <div class="filter-buttons" :style="`justify-content: ${titleAlign}`">
                <button v-for="type in filterTypes" :key="type" :class="{ selected: selectedFilter === type }"
                    @click="selectedFilter = type" type="button">
                    {{ type.charAt(0).toUpperCase() + type.slice(1) }}
                </button>
            </div>

            <!-- Lista em grid -->
            <ul class="media-elements-grid" :style="`grid-template-columns: repeat(${gridColumns}, 1fr);`">
                <li v-for="(element, index) in filteredElements" :key="index" class="media-element"
                    @click="onElementClick(element)" :class="{ selected: selectable && selectedElements.has(element) }">
                    <div v-if="elementType(element) === 'text'" class="text-element">
                        {{ element.text }}
                    </div>
                    <img v-else-if="elementType(element) === 'video' || elementType(element) === 'object'"
                        :src="getImageOfVideo(element)" alt="media preview" class="media-image" />
                    <div v-else class="unknown-element">Unknown type</div>
                </li>
            </ul>

            <div class="bottom-buttons" v-if="props.showButtonDone || props.showButtonCancel">
                <button v-if="props.showButtonCancel" class="cancel-button" @click="emit('onButtonClicked', 'cancel')">
                    Cancel
                </button>
                <button v-if="props.showButtonDone" class="done-button" @click="emit('onButtonClicked', 'done')">
                    Done
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import { useVideoEditor } from '@/stores/videoEditor'

    const videoEditor = useVideoEditor()

    const props = defineProps({
        allowedTypes: { type: Array, default: () => ['all', 'text', 'video', 'object'] },
        gridColumns: { type: Number, default: 2 },
        title: { type: String, default: 'Media Elements' },
        titleAlign: { type: String, default: 'left' },
        showButtonDone: { type: Boolean, default: false },
        showButtonCancel: { type: Boolean, default: false },
        selectable: { type: Boolean, default: false }
    })

    const filterTypes = computed(() => props.allowedTypes)
    const selectedFilter = ref('all')
    const selectedElements = ref(new Set())

    const emit = defineEmits(['onElementSelected', 'onButtonClicked'])

    function getImageOfVideo(video) {
        const boxOfVideo = videoEditor.getBoxOfElement(video)
        if (!boxOfVideo) return ''
        const canvas = boxOfVideo.getCanvasToApplyVideo()
        if (!canvas) return ''
        return canvas.toDataURL('image/png')  // converte o canvas para Data URL
    }

    function elementType(element) {
        if (!element.type) return 'unknown'
        if (element.type === 'text' || (element.text && typeof element.text === 'string')) return 'text'
        if (element.type === 'video' || element.mediaType === 'video') return 'video'
        if (element.type === 'object' || element.mediaType === 'object') return 'object'

        return 'unknown'
    }

    const filteredElements = computed(() => {
        if (selectedFilter.value === 'all') {
            return videoEditor.getElements()
        }
        return videoEditor.getElements().filter(el => elementType(el) === selectedFilter.value)
    })

    function onElementClick(element) {
        if (props.selectable) {
            if (selectedElements.value.has(element)) {
                selectedElements.value.delete(element)
            } else {
                selectedElements.value.add(element)
            }
        }
        emit('onElementSelected', { element, type: elementType(element) })
    }
</script>

<style scoped>
    .list-media-elements-container {
        font-family: Arial, sans-serif;
        color: #333;
    }

    .list-media-title-container {
        display: flex;
        width: 100%;
        height: 100%;
    }

    .section-title {
        font-weight: bold;
        margin-bottom: 0.5rem;
    }

    .filter-buttons {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .filter-buttons button {
        background-color: #eee;
        border: none;
        padding: 0.4rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        color: #555;
        transition: background-color 0.3s ease, color 0.3s ease;
    }

    .filter-buttons button:hover {
        background-color: #ddd;
    }

    .filter-buttons button.selected {
        background-color: #999;
        color: white;
    }

    .media-elements-grid {
        display: grid;
        /* grid-template-columns: repeat(2, 1fr); */
        gap: 1rem;
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .media-element {
        background-color: #f8f8f8;
        border-radius: 6px;
        padding: 0.75rem;
        cursor: pointer;
        box-shadow: 0 0 4px rgb(0 0 0 / 0.1);
        transition: box-shadow 0.2s ease;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 80px;
        overflow: hidden;
        text-align: center;
    }

    .media-element:hover {
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
    }

    .text-element {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 1rem;
        color: #222;
        overflow: hidden;
        text-overflow: ellipsis;
        max-height: 4.5rem;
    }

    .media-image {
        max-width: 100%;
        max-height: 70px;
        object-fit: contain;
        border-radius: 4px;
    }

    .bottom-buttons {
        display: flex;
        justify-content: flex-end;
        margin-top: 1rem;
        gap: 0.5rem;
    }

    .bottom-buttons button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        font-weight: bold;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .cancel-button {
        background-color: #eee;
        color: #444;
    }

    .cancel-button:hover {
        background-color: #ddd;
    }

    .done-button {
        background-color: var(--main-color);
        color: white;
    }

    .done-button:hover {
        background-color: var(--main-color);
    }

    .media-element.selected {
        background-color: #e0f7fa;
        border: 2px solid var(--main-color);
        border-radius: 8px;
    }
</style>