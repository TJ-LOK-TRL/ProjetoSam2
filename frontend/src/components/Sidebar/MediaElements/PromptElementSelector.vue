<template>
    <div v-if="videoEditor.isPromptElementOpen" class="prompt-element-selector-container">
        <div class="prompt-element-selector">
            <ListMediaElements :title="'Select an element'" :gridColumns="4" @onElementSelected="onElementSelected"
                :titleAlign="'center'" :showButtonDone="true" :showButtonCancel="true" @onButtonClicked="onButtonClicked" :selectable="true" />
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, watch } from 'vue'
    import ListMediaElements from './ListMediaElements.vue'
    import { useVideoEditor } from '@/stores/videoEditor'

    const videoEditor = useVideoEditor()
    const promptElements = ref([])

    async function onElementSelected({ element, type }) {
        promptElements.value.push(element)
        await videoEditor.onElementPromptedSelectCallback?.(element, type)
    }

    async function onButtonClicked(buttonType) {
        if (buttonType === 'done') {
            await videoEditor.onElementPromptSelectionDoneCallback?.(promptElements.value)
            videoEditor.isPromptElementOpen = false
        }

        else if (buttonType === 'cancel') {
            videoEditor.isPromptElementOpen = false
        }
    }

    watch(() => videoEditor.isPromptElementOpen, (newVal) => {
        if (newVal) {
            promptElements.value = []
        }
    })

</script>

<style scoped>
    .prompt-element-selector-container {
        position: fixed;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.4);
        /* opcional para efeito modal */
        z-index: 9999;
    }

    .prompt-element-selector {
        background: white;
    }
</style>