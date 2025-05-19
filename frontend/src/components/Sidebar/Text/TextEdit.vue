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

        <div class="style-container-rows">
            <div class="style-container-row-1">
                <div class="dropdown-font-container">
                    <Dropdown :items="fontList" :placeholder="textElement?.font" />
                </div>

                <div class="dropdown-font-size-container">
                    <Dropdown :items="fontSizeList" :placeholder="textElement?.size" />
                </div>

                <div class="color-picker-container">
                    <ColorPicker v-model="textColor" />
                </div>
            </div>

            <div class="style-container-row-2">
                <div class="bold-italic-container">
                    <ToggleCard v-model="activeStyles" multiple>
                        <template #default>
                            <div data-value="bold"><i class="fas fa-bold" /></div>
                            <div data-value="italic"><i class="fas fa-italic" /></div>
                        </template>
                    </ToggleCard>
                </div>

                <div class="aligment-container">
                    <ToggleCard v-model="textAlign">
                        <template #default>
                            <div data-value="left"><i class="fas fa-align-left" /></div>
                            <div data-value="center"><i class="fas fa-align-center" /></div>
                            <div data-value="right"><i class="fas fa-align-right" /></div>
                        </template>
                    </ToggleCard>
                </div>
            </div>

            <div class="button-delete-container">
                <button class="button-delete" @click="videoEditor.removeElement(textElement)">
                    <i class="fas fa-trash-alt" />
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { useVideoEditor } from '@/stores/videoEditor'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import Dropdown from '@/components/Sidebar/Dropdown.vue'
    import ColorPicker from '@/components/Sidebar/ColorPicker.vue'
    import ToggleCard from '@/components/Sidebar/ToggleCard.vue'
    import { onMounted, ref, computed } from 'vue'

    const videoEditor = useVideoEditor()
    const textElement = ref(videoEditor.selectedElement)

    const fontList = ref([
        { label: 'Raleway', font: 'Raleway' },
        { label: 'Inter', font: 'Inter' },
        { label: 'Pacifico', font: 'Pacifico' },
        { label: 'Merriweather', font: 'Merriweather' },
        { label: 'Courier Prime', font: 'Courier Prime' },
        { label: 'Playfair Display', font: 'Playfair Display' },
        { label: 'Orbitron', font: 'Orbitron' },
        { label: 'Monoton', font: 'Monoton' },
        { label: 'Fredoka', font: 'Fredoka' },
        { label: 'Permanent Marker', font: 'Permanent Marker' },
    ]);

    const fontSizeList = ref([
        { label: '8px', value: '8px' },
        { label: '10px', value: '10px' },
        { label: '12px', value: '12px' },
        { label: '14px', value: '14px' },
        { label: '16px', value: '16px' },
        { label: '18px', value: '18px' },
        { label: '20px', value: '20px' },
        { label: '24px', value: '24px' },
        { label: '32px', value: '32px' },
        { label: '48px', value: '48px' },
    ]);

    const textColor = computed({
        get: () => textElement.value?.color || '#000000',
        set: (val) => {
            if (textElement.value) textElement.value.color = val
        }
    })

    const activeStyles = ref(null)

    const textAlign = ref(null)

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

    .style-container-rows {
        display: flex;
        flex-direction: column;
    }

    .style-container-row-1 {
        display: grid;
        grid-template-columns: 3fr 2fr 48px;
        gap: 8px;
        margin-bottom: 8px;
    }

    .dropdown-font-container {
        height: 50px;
        min-width: 100px;
    }

    .dropdown-font-size-container {
        height: 50px;
        min-width: 100px;
    }

    .color-picker-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 50px;
        border: 1px solid #ddd;
        border-radius: 8px;
        min-width: 48px;
    }

    .style-container-row-2 {
        display: grid;
        grid-template-columns: 1fr 2.5fr;
        gap: 8px;
        margin-bottom: 8px;
    }

    .bold-italic-container {
        height: 50px;
    }

    .aligment-container {
        height: 50px;
    }

    .button-delete-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 50px;
    }

    .button-delete {
        all: unset;
        cursor: pointer;
        background-color: rgb(255, 255, 255);
        border-radius: 0.5rem;
        height: auto;
        padding: 0.25rem 0.5rem;
        white-space: nowrap;
        text-overflow: ellipsis;
        max-width: 4.375rem;
        overflow: hidden;
        border: 0.5px solid rgb(225, 225, 227);
        box-shadow: rgba(0, 0, 0, 0.1) 0px 1px 2px;
    }
</style>