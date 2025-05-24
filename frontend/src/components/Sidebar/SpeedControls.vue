<!-- SpeedControls.vue -->
<template>
    <div class="aside-box speed-container">
        <div class="speed-title">Speed</div>
        <div class="speed-buttons-container">
            <button v-for="option in speedOptions" :key="option"
                :class="['speed-button', { active: modelValue === option }]"
                @click="$emit('update:modelValue', option)">
                {{ option }}x
            </button>
        </div>
        <input class="speed-input" type="number" step="0.1" min="0.1" :value="modelValue"
            @input="$emit('update:modelValue', parseFloat($event.target.value))" />
    </div>
</template>

<script setup>
    defineProps({
        modelValue: {
            type: Number,
            required: true
        }
    })

    const speedOptions = [0.5, 1.0, 2.0]
</script>

<style scoped>
    .speed-container {
        gap: 10px;
    }

    .speed-title {
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 500;
        white-space: nowrap;
        color: rgb(48, 48, 48);
    }

    .speed-buttons-container {
        display: flex;
        gap: 5px;
    }

    .speed-button {
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 500;
        color: var(--main-color);
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
        font-size: 0.8125rem;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        text-decoration: none;
        user-select: none;
    }

    .speed-button.active {
        border-color: var(--main-color);
    }

    .speed-input {
        width: 25%;
        text-align: right;
        border: none;
        flex: 0 0 auto;
        padding: 0.375rem 0.5rem;
        border-radius: 0.25rem;
        background-color: #ededed;
    }
</style>