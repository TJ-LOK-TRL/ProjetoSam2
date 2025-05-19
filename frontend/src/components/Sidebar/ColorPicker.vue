<template>
    <div class="input-color-picker-container">
        <label for="input-color-picker" class="color-picker-icon"
            :style="{ background: modelValue, 
                      color: isLightColor(modelValue) ? 'black' : 'white', 
                      border: isLightColor(modelValue) ? '0.5px solid #ddd' : '0.5px solid transparent'
            }">
            <div class="color-picker-icon"></div>
        </label>
        <input type="color" :value="modelValue" id="input-color-picker"
            @input="$emit('update:modelValue', $event.target.value)">
    </div>
</template>

<script setup>
    defineProps({
        modelValue: String
    })

    function isLightColor(hex) {
        const c = hex.replace('#', '')
        const r = parseInt(c.substr(0, 2), 16)
        const g = parseInt(c.substr(2, 2), 16)
        const b = parseInt(c.substr(4, 2), 16)
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b
        return luminance > 180
    }
</script>

<style scoped>
    .color-picker-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        width: 25px;
        height: 25px;
        border-radius: 50%;
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
    }
</style>