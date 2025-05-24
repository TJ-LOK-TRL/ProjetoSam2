<template>
    <div class="simple-input-container">
        <i class="simple-input-icon" :class="icon"></i>
        <label class="simple-input-label">{{ label }}</label>
        <input v-if="showRange" class="simple-input-range" type="range" :min="min" :max="max" :step="step"
            :value="parseFloat(modelValue.toString().match(/[\d.]+/))" @input="$emit('update:modelValue', $event.target.value)" />
        <input class="simple-input-input" type="text" :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)" />
    </div>
</template>

<script setup>

    defineProps({
        modelValue: {
            type: [String, Number],
            required: true
        },
        label: {
            type: String,
            default: ''
        },
        icon: {
            type: String,
            default: ''
        },
        showRange: {
            type: Boolean,
            default: false
        },
        min: {
            type: Number,
            default: 0
        },
        max: {
            type: Number,
            default: 100
        },
        step: {
            type: Number,
            default: 1
        }
    })

</script>

<style scoped>
    .simple-input-container {
        position: relative;
        border-radius: 0.5rem;
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 9px 1rem;
        border: 0.5px solid rgb(225, 225, 227);
        box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.1);
    }

    .simple-input-icon {
        color: rgb(119, 119, 126)
    }

    .simple-input-label {
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 500;
        margin-left: 16px;
        flex: 1 1 0%;
        color: rgb(48, 48, 48);
    }

    .simple-input-range {
        height: 2px;
        background: #ddd;
        border-radius: 5px;
        outline: none;
        color: var(--main-color);
        margin-left: 8px;
        margin-right: 8px;
    }

    .simple-input-input {
        all: unset;
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 500;
        background-color: #ededed;
        padding: 0.375rem 0px;
        min-width: 50px;
        border-radius: 0.25rem;
        width: 65px;
        border: none;
        text-align: center;
    }
</style>