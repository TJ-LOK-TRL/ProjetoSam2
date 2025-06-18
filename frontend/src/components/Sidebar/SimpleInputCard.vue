<template>
    <div class="simple-input-container">
        <i v-if="icon" class="simple-input-icon" :class="icon"></i>
        <label v-if="label" class="simple-input-label">{{ label }}</label>
        <input v-if="showRange" class="simple-input-range" type="range" :min="min" :max="max" :step="step"
            :value="parseFloat(modelValue.toString().match(/[\d.]+/))"
            @input="$emit('update:modelValue', Number($event.target.value))" 
            :style="{ marginLeft: label ? '8px' : '0' }" />

        <label v-if="typeof modelValue === 'boolean'" class="toggle-switch">
            <input type="checkbox" :checked="modelValue" @change="$emit('update:modelValue', $event.target.checked)" />
            <span class="slider" />
        </label>

        <input v-else class="simple-input-input" type="text" :value="modelValue"
            @input="onTextInput" />
    </div>
</template>

<script setup>
    const props = defineProps({
        modelValue: {
            type: [String, Number, Boolean],
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
        respectLimitsAsNumber: {
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

    const emit = defineEmits(['update:modelValue'])

    function onTextInput(event) {
        event.target.value = event.target.value.replace(/^(\d*\.\d*).*$/, '$1') // Resolves multiple points to one point, ex: "12...." to "12."
        if ((props.showRange || props.respectLimitsAsNumber) && !event.target.value.endsWith('.')) {
            let val = Number(event.target.value)
            
            if (!isNaN(val)) {
                val = Math.min(Math.max(val, props.min), props.max)
                event.target.value = val
                emit('update:modelValue', val) // Emitir como número
                return
            } else {
                event.target.value = props.modelValue
                return
            }
        }

        emit('update:modelValue', event.target.value)
    }


</script>

<style scoped>
    .simple-input-container {
        position: relative;
        border-radius: 0.5rem;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
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

    .toggle-switch {
        position: relative;
        display: inline-block;
        margin-top: 4px;
        margin-bottom: 4px;
        width: 36px;
        height: 20px;
    }

    .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        background-color: #ccc;
        border-radius: 34px;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        transition: 0.2s;
    }

    .slider::before {
        content: "";
        position: absolute;
        height: 14px;
        width: 14px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        border-radius: 50%;
        transition: 0.2s;
    }

    input:checked+.slider {
        background-color: var(--main-color, #4CAF50);
    }

    input:checked+.slider::before {
        transform: translateX(16px);
    }
</style>