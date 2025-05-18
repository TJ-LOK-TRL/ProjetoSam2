<template>
    <StickyHeader :show-icon="true">
        Edit Text
    </StickyHeader>

    <div class="local-sidebar-div sidebar-div">
        <div class="textarea-container">
            <Textarea class="textarea">{{ textElement?.text }}</Textarea>
        </div>
    </div>

    <div class="style-container sidebar-div">
        <p class="sidebar-subtitle">Style</p>

        <div class="dropdown-container">
            <Dropdown :items="fontList" :placeholder="textElement?.font" />
        </div>
    </div>
</template>

<script setup>
    import { useVideoEditor } from '@/stores/videoEditor'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import Dropdown from '@/components/Sidebar/Dropdown.vue'
    import { onMounted, ref } from 'vue'

    const videoEditor = useVideoEditor()
    const textElement = ref(videoEditor.selectedElement)

    const fontList = ref([
        { label: 'Raleway', font: 'Raleway' },
        { label: 'Inter', font: 'Inter' },
        { label: 'Pacifico (Handwriting)', font: 'Pacifico' },
        { label: 'Merriweather (Serif)', font: 'Merriweather' },
        { label: 'Courier Prime (Typewriter)', font: 'Courier Prime' },
        { label: 'Playfair Display (Script)', font: 'Playfair Display' },
        { label: 'Orbitron (Gothic)', font: 'Orbitron' },
        { label: 'Raleway (Modern)', font: 'Raleway' },
        { label: 'Monoton (Bold Impact)', font: 'Monoton' },
        { label: 'Fredoka (Rounded)', font: 'Fredoka' },
        { label: 'Raleway (Outline)', font: 'Raleway' },
        { label: 'Permanent Marker (Vintage)', font: 'Permanent Marker' },
    ]);

    function applyFontToText(textElement, selectedFontClass) {
        const fontFamily = fontMap[selectedFontClass] || 'sans-serif';
        textElement.class = selectedFontClass;
        textElement.font = fontFamily;
    }

    onMounted(() => {

    })
</script>

<style scoped>
    .textarea-container {
        padding: 24px;
        border-radius: 0.625rem;
        background-color: rgb(245 245 246);
    }

    .textarea {
        outline: none;
        padding: 0px;
        width: 100%;
        height: 64px;
        border: none;
        background-color: rgb(245, 245, 246);
        resize: none;
        font-family: Inter, sans-serif;
        font-size: 0.9375rem;
        line-height: 1.25rem;
        letter-spacing: 0px;
        font-weight: 400;
    }

    .style-container {
        display: flex;
        flex-direction: column;
    }

    .dropdown-container {
        height: 50px;
    }
</style>