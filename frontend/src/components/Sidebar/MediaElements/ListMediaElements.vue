<template>
    <div class="list-media-elements-container">
        <StickyHeader :showIcon="false">
            Media Elements
        </StickyHeader>

        <div class="local-sidebar-div sidebar-div">
            <!-- Filtro dos tipos -->
            <div class="filter-buttons">
                <button v-for="type in filterTypes" :key="type" :class="{ selected: selectedFilter === type }"
                    @click="selectedFilter = type" type="button">
                    {{ type.charAt(0).toUpperCase() + type.slice(1) }}
                </button>
            </div>

            <!-- Lista em grid -->
            <ul class="media-elements-grid">
                <li v-for="(element, index) in filteredElements" :key="index" class="media-element"
                    @click="onElementClick(element)">
                    <div v-if="elementType(element) === 'text'" class="text-element">
                        {{ element.text }}
                    </div>
                    <img v-else-if="elementType(element) === 'video' || elementType(element) === 'object'"
                        :src="getImageOfVideo(element)" alt="media preview" class="media-image" />
                    <div v-else class="unknown-element">Unknown type</div>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import { useVideoEditor } from '@/stores/videoEditor'

    const videoEditor = useVideoEditor()

    const filterTypes = ['all', 'text', 'video', 'object']
    const selectedFilter = ref('all')

    function getImageOfVideo(video) {
        const boxOfVideo = videoEditor.getBoxOfElement(video)
        if (!boxOfVideo) return ''
        const canvas = boxOfVideo.getCanvasToApplyVideo()
        if (!canvas) return ''
        return canvas.toDataURL('image/png')  // converte o canvas para Data URL
    }

    // Função para decidir o tipo do elemento (configurável)
    function elementType(element) {
        // Aqui você pode usar sua lógica para classificar:
        // exemplo simples:
        if (!element.type) return 'unknown'

        // Exemplo para configurar critérios:
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
        // Só printa, pode substituir pelo que quiser
        videoEditor.selectEditorElement(element)
        if (elementType(element) === 'text') {
            videoEditor.changeTool('text', 'text')
        } else if (elementType(element) === 'video' || elementType(element) === 'object') {
            videoEditor.changeTool('media', 'media')
        } else {
            console.log('Unknown Element Clicked:', element)
        }
    }
</script>

<style scoped>
    .list-media-elements-container {
        font-family: Arial, sans-serif;
        color: #333;
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
        grid-template-columns: repeat(2, 1fr);
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
</style>