<template>
    <div class="config-range-box">
        <div v-for="setting in props.settings" class="config-range-line">
            <div class="config-range-line-left">
                <p class="config-range-title">{{ setting.name }}</p>
            </div>
            <div class="config-range-line-right">
                <input class="config-range-line-range-input" type="range" v-model="setting.value" :min="setting.min"
                    :max="setting.max" :step="setting.step" @input="onChange(setting)">
                <input class="config-range-line-number-input" type="number" v-model="setting.value" :min="setting.min"
                    :max="setting.max" :step="setting.step" @input="onChange(setting)">
            </div>
        </div>
    </div>
</template>

<script setup>
    const props = defineProps({
        settings: Array,
    });

    const emit = defineEmits(['change']);

    function onChange(setting) {
        emit('change', setting)
    }
</script>

<style scoped>
    .config-range-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        max-height: none;
        gap: 30px;
    }

    .config-range-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        width: 100%;
        height: 100%;
    }

    .config-range-line-left {
        display: flex;
        align-items: center;
        width: 30%;
    }

    .config-range-line-right {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 80%;
        gap: 5px;
    }

    .config-range-title {
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 500;
        color: #2c2c2c;
        display: block;
        margin-top: 0px;
    }

    .config-range-line-range-input {
        width: 60%;
        height: 2px;
        background: #ddd;
        border-radius: 5px;
        outline: none;
        color: var(--main-color);
    }

    .config-range-line-number-input {
        width: 25%;
        text-align: right;
        border: none;
        flex: 0 0 auto;
        padding: 0.375rem 0.5rem;
        border-radius: 0.25rem;
        background-color: #ededed;
    }

    .config-range-line-number-input:focus {
        outline: none;
    }

    /* Chrome, Safari, Edge, Opera */
    .config-range-line-number-input::-webkit-outer-spin-button,
    .config-range-line-number-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    /* Firefox */
    .config-range-line-number-input {
        -moz-appearance: textfield;
    }
</style>