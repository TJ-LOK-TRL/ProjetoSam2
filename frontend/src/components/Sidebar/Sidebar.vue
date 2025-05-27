<template>
    <div class="sidebar-container">
        <Search v-if="videoEditor.selectedTool === 'search'" />
        <Settings v-else-if="videoEditor.selectedTool === 'settings'" />
        <MediaSelector v-else-if="videoEditor.selectedTool === 'media'" />
        <TextSelector v-else-if="videoEditor.selectedTool === 'text'" />
        <Projects v-else-if="videoEditor.selectedTool === 'projects'" />
        <ConfigSam v-else-if="videoEditor.selectedTool === 'configSam'" />
        <SamEffects v-else-if="videoEditor.selectedTool === 'samEffects'" />
        <ColorEffect v-else-if="videoEditor.selectedTool === 'colorEffect'" />
        <OverlayEffect v-else-if="videoEditor.selectedTool === 'overlayEffect'" />
        <BlendEffect v-else-if="videoEditor.selectedTool === 'blendEffect'" />
        <RemoveColor v-else-if="videoEditor.selectedTool === 'removeColor'" />
        <MediaElements v-else-if="videoEditor.selectedTool === 'mediaElements'" />
    </div>
</template>


<script setup>
    import Search from './Search.vue'
    import Settings from './Settings.vue'
    import TextSelector from './Text/Selector.vue'
    import MediaSelector from './Media/Selector.vue'
    import MediaElements from './MediaElements/ListMediaElements.vue'
    import ConfigSam from './ConfigSam.vue'
    import SamEffects from './Effects/SamEffects.vue'
    import ColorEffect from './Effects/ColorEffect.vue'
    import OverlayEffect from './Effects/OverlayEffect.vue'
    import BlendEffect from './Effects/BlendEffect.vue'
    import RemoveColor from './Effects/RemoveColor.vue'
    import Projects from './Projects.vue'

    import { useVideoEditor } from '@/stores/videoEditor'


    const videoEditor = useVideoEditor()


</script>



<style scoped>
    .sidebar-container {
        position: relative;
        height: 100%;
        border-right: 1px solid rgb(228, 229, 231);
        background-color: white;
        min-width: 350px;
        max-width: 375px;
        overflow-y: scroll;
    }

    h2 {
        margin-bottom: 10px;
    }

    button {
        width: 100%;
        padding: 8px;
        margin-bottom: 5px;
        background: #444;
        color: white;
        border: none;
        cursor: pointer;
    }

    button:hover {
        background: #666;
    }
</style>