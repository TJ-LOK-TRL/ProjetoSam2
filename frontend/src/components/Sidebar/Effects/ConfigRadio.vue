<template>
    <div class="config-radio-box">
        <template v-for="(setting, index) in props.settings">
            <div class="config-radio-line">
                <div class="config-radio-left">
                    <input class="config-radio-input" type="radio" :name="radioName" :value="setting.name"
                        v-model="selectedRadio" @change="onChange(setting)">
                    <p class="config-radio-title">{{ setting.name }}</p>
                </div>
                <div class="config-radio-right">
                    <slot :setting="setting"></slot>
                </div>
            </div>
            <div v-if="index < props.settings.length - 1" class="line-separator"></div>
        </template>
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue'
    
    const props = defineProps({
        settings: Array,
        selectedRadio: String,
        radioName: {
            type: String,
            default: 'radio',
            required: false,
        }
    });

    const emit = defineEmits(['change', 'update:selectedRadio'])

    const radioName = ref(props.radioName || 'radio')

    const selectedRadio = computed({
        get: () => props.selectedRadio,
        set: (value) => emit('update:selectedRadio', value)
    })

    function onChange(setting) {
        emit('change', setting)
    }
</script>

<style scoped>
    .config-radio-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        max-height: none;
        gap: 20px;
        padding: 0px !important;
    }

    .config-radio-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        width: 100%;
        height: 100%;
    }

    .config-radio-line:last-of-type {
        padding: 20px;
        padding-top: 0px;
    }

    .config-radio-line:first-of-type {
        padding: 20px;
        padding-bottom: 0px;
    }

    .config-radio-left {
        display: flex;
        align-items: center;
        gap: 5px;
        height: 100%;
        flex-grow: 1;
    }

    .config-radio-right {
        display: flex;
        align-items: center;
        gap: 10px;
        height: 100%;
        flex-grow: 1;
    }

    .config-radio-title {
        color: rgb(24, 25, 27);
        font-size: 13px;
        font-family: Inter, sans-serif;
        margin-top: 1px;
    }

    .line-separator {
        width: 100%;
        height: 1px;
        background-color: #ddd;
        opacity: 0.6;
    }
</style>