<template>
    <div class="local-sidebar-div sidebar-div">
        <p class="section-title">{{ props.title }}</p>
        <ConfigRadio :settings="detectionSettings" v-model:selectedRadio="currentDetectionType" class="aside-box">
            <template #default=" { setting }">
                <template v-if="setting.name === 'Color'">
                    <ColorPicker v-model:selectedColor="selectedColor" />
                </template>
                <template v-else-if="setting.name === 'Position'">
                    <div class="position-input-container">
                        <input type="text" v-model="position" class="position-input" placeholder="x,y" />
                    </div>
                    <div class="icon-position-container">
                        <i class="fas fa-crosshairs"></i>
                    </div>
                </template>
            </template>
        </ConfigRadio>
    </div>
    <div class="local-sidebar-div sidebar-div">
        <p class="section-title">Chroma Key Settings</p>
        <ConfigRange :settings="chromaKeySettings" @change="onChangeTolerance" class="aside-box" />
    </div>
</template>

<script setup>
    import { ref, computed } from 'vue'
    import ConfigRadio from '@/components/Sidebar/Effects/ConfigRadio.vue'
    import ColorPicker from './RadioRights/ColorPicker.vue'
    import ConfigRange from '@/components/Sidebar/Effects/ConfigRange.vue'

    const props = defineProps({
        title: String,
        modelValue: {
            type: Object,
            default: () => ({
                detectionType: 'Position',
                selectedColor: '#ff0000',
                position: '0,0',
                tolerance: 100,
            }),
        },
    })

    const emit = defineEmits(['update:modelValue'])

    const data = computed({
        get() {
            return props.modelValue
        },
        set(value) {
            emit('update:modelValue', value)
        }
    })

    const currentDetectionType = computed({
        get: () => data.value.detectionType,
        set: (val) => {
            data.value = { ...data.value, detectionType: val }
        }
    })
    const selectedColor = computed({
        get: () => data.value.selectedColor,
        set: (val) => {
            data.value = { ...data.value, selectedColor: val }
        }
    })
    const position = computed({
        get: () => data.value.position,
        set: (val) => {
            data.value = { ...data.value, position: val }
        }
    })
    const tolerance = computed({
        get: () => data.value.tolerance,
        set: (val) => {
            data.value = { ...data.value, tolerance: val }
        }
    })

    const detectionSettings = ref([
        { name: 'Color' },
        { name: 'Position' },
    ])

    const chromaKeySettings = computed(() => ([{
        name: 'Tolerance',
        value: tolerance.value,
        min: 0,
        max: 300,
        step: 1
    }]))

    function update() {
        //emit('update', {
        //    detectionType: currentDetectionType.value,
        //    selectedColor: selectedColor.value,
        //    position: position.value,
        //    tolerance: tolerance.value,
        //})
    }

    function onChangeTolerance(setting) {
        tolerance.value = setting.value
        update()
    }
</script>

<style scoped>
    .position-input-container {
        display: flex;
        align-items: center;
        justify-content: right;
        width: 80%;
        height: 100%;
    }

    .position-input {
        width: 30%;
        text-align: right;
        border: none;
        flex: 0 0 auto;
        padding: 0.375rem 0.5rem;
        border-radius: 0.25rem;
        background-color: #ededed;
    }

    .position-input:focus {
        outline: none;
    }

    .icon-position-container {
        width: 20%;
        height: 100%;
        display: flex;
        justify-content: right;
        align-items: center;
    }
</style>