<template>
    <div class="container">
        <StickyHeader :show-icon="true" @icon-click="videoEditor.selectedElement = null">
            Edit Text
        </StickyHeader>

        <div class="content">
            <div class="local-sidebar-div sidebar-div">
                <div class="textarea-container">
                    <textarea v-model="textValue" class="textarea">{{ textElement?.text }}</textarea>
                </div>
            </div>

            <div class="style-container sidebar-div">
                <p class="sidebar-subtitle">Style</p>

                <div class="style-container-rows">
                    <div class="style-container-row-1">
                        <div class="dropdown-font-container">
                            <Dropdown v-model="textFont" :items="fontList" :placeholder="textElement?.style.fontFamily" />
                        </div>

                        <div class="dropdown-font-size-container">
                            <Dropdown v-model="textFontSize" :items="fontSizeList" :placeholder="textElement?.style.fontSize" :allowFreeValue="true" />
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

                    <div class="aside-box button-delete-container">
                        <button class="button-delete" @click="videoEditor.removeElement(textElement)">
                            Delete Text
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <StickyFooter>
            <AddNewElementButton :label="'Add Another Text Box'" />
        </StickyFooter>
    </div>
</template>

<script setup>
    import { useVideoEditor } from '@/stores/videoEditor'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import StickyFooter from '@/components/Sidebar/StickyFooter.vue'
    import Dropdown from '@/components/Sidebar/Dropdown.vue'
    import ColorPicker from '@/components/Sidebar/ColorPicker.vue'
    import ToggleCard from '@/components/Sidebar/ToggleCard.vue'
    import AddNewElementButton from '@/components/Sidebar/AddNewElementButton.vue'
    import { onMounted, ref, computed } from 'vue'

    const videoEditor = useVideoEditor()
    const textElement = computed(() => videoEditor.selectedElement)

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
        { label: '8px', size: '8px' },
        { label: '10px', size: '10px' },
        { label: '12px', size: '12px' },
        { label: '14px', size: '14px' },
        { label: '16px', size: '16px' },
        { label: '18px', size: '18px' },
        { label: '20px', size: '20px' },
        { label: '24px', size: '24px' },
        { label: '32px', size: '32px' },
        { label: '48px', size: '48px' },
    ]);

    const textValue = computed({
        get: () => textElement.value?.text || '',
        set: (val) => {
            if (textElement.value) {
                console.log('textValue', val)
                textElement.value.text = val
            }
        }
    })

    const textFont = computed({
        get: () => {
            const currentFont = textElement.value?.style.fontFamily || 'Inter'
            return fontList.value.find(item => item.font === currentFont)
        },
        set: (item) => {
            if (textElement.value) {
                textElement.value.style.fontFamily = item.font
            }
        }
    })

    const textFontSize = computed({
        get: () => {
            let size = textElement.value?.style.fontSize || '16px';
            size = parseFloat(size)
            size = isNaN(size) ? 0 : Math.round(size * 1e3) / 1e3 + 'px'
            return { label: size, size };
        },
        set: (item) => {
            if (textElement.value) {
                let size = item.free || item.size
                size = parseFloat(size)
                size = isNaN(size) ? 0 : Math.round(size * 1e3) / 1e3 + 'px'
                console.log('textFontSize', size)
                textElement.value.style.fontSize = size
            }
        }
    })

    const textColor = computed({
        get: () => textElement.value?.style.color || '#000000',
        set: (val) => {
            if (textElement.value) textElement.value.style.color = val
        }
    })

    const activeStyles = computed({
        get: () => {
            return [
                textElement.value?.style?.fontWeight === 'bold' ? 'bold' : '',
                textElement.value?.style?.fontStyle === 'italic' ? 'italic' : ''
            ].filter(Boolean)
        },
        set: (styles) => {
            if (textElement.value) {
                textElement.value.style.fontWeight = styles.includes('bold') ? 'bold' : 'normal'
                textElement.value.style.fontStyle = styles.includes('italic') ? 'italic' : 'normal'
            }
        }
    })

    const textAlign = computed({
        get: () => {
            const align = textElement.value?.style?.textAlign || 'left'
            return align
        },
        set: (align) => {
            if (textElement.value) {
                textElement.value.style.textAlign = align
            }
        }
    })

    onMounted(() => {

    })
</script>

<style scoped>
    .container {
        height: 100%;
    }

    .content {
        display: flex;
        flex-direction: column;
        position: relative;
        height: 100%;
    }

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
        min-height: 50px;
        border-color: #ddd;
    }

    .button-delete {
        width: 100%;
        background-color: white;
        color: rgb(41, 41, 41);
        border: none;
        padding: 10px 20px;
        text-align: center;
        font-size: 14px;
        cursor: pointer;
    }
</style>