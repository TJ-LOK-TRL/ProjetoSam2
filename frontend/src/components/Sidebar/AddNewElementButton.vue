<template>
    <div class="button-add-text-container">
        <button class="button-add-text" @click="videoEditor.selectedElement = null">
            <i class="fas fa-plus" />
            <label>{{ label }}</label>
        </button>
    </div>
</template>

<script setup>
    import { useVideoEditor } from '@/stores/videoEditor'

    const videoEditor = useVideoEditor()

    defineProps({
        label: {
            type: String,
            default: 'Add Text'
        }
    })
</script>

<style scoped>
    .button-add-text {
        display: flex;
        gap: 8px;
        width: 100%;
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 400;
        padding: 0px 16px;
        border-radius: 10px;
        height: 3rem;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        text-decoration: none;
        user-select: none;
        background-color: rgb(247, 247, 248);
        border: 1px solid rgb(247, 247, 248);
        color: rgb(24, 25, 27);
        box-shadow: none;
    }

    .button-add-text>* {
        pointer-events: none;
    }

    .button-add-text:hover {
        background-color: rgb(238, 238, 239);
        border: 1px solid rgb(238, 238, 239);
    }
</style>