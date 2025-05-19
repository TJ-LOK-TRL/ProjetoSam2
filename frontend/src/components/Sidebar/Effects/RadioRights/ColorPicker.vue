<template>
    <input type="text" v-model="selectedColor" class="color-picker-input-hex">
    <div class="input-color-picker-container">
        <!-- Ícone para abrir o seletor de cor -->
        <label for="input-color-picker" class="color-picker-icon"
            :style="{ background: selectedColor, color: isLightColor(selectedColor) ? 'black' : 'white' }">
            <i class="fas fa-fill-drip"></i>
        </label>
        <!-- Input de cor oculto -->
        <input type="color" v-model="selectedColor" id="input-color-picker" @change="onChangeColor">
    </div>
</template>

<script setup>
    import { ref } from 'vue'

    const props = defineProps({
        selectedColor: {
            type: String,
            default: '#ff0000',
            required: false,
        },
    })

    const emits = defineEmits(['change'])

    const selectedColor = ref(props.selectedColor)

    // Verifica se a cor é clara com base na luminância
    function isLightColor(hex) {
        const c = hex.replace('#', '')
        const r = parseInt(c.substr(0, 2), 16)
        const g = parseInt(c.substr(2, 2), 16)
        const b = parseInt(c.substr(4, 2), 16)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b)
        return luminance > 180
    }

    function onChangeColor() {
        emits('change', selectedColor.value)
    }
</script>

<style scoped>
    .color-picker-container {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 20px;
    }

    .color-picker-input-hex {
        width: 80%;
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 400;
        color: rgb(73, 73, 73);
        height: 1.5rem;
        border: none;
        text-align: right;
        text-transform: uppercase;
        background-color: transparent;
    }

    .color-picker-input-hex:focus {
        outline: none;
    }

    .color-picker-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        font-size: 11px;
        transition: color 0.2s ease;
    }

    #input-color-picker {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
        pointer-events: none;
    }

    .input-color-picker-container {
        display: flex;
        justify-content: right;
        align-items: center;
        position: relative;
        width: 20%;
    }
</style>