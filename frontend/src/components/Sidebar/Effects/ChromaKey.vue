<template>
    <div class="local-sidebar-div sidebar-div">
        <p class="section-title">{{ props.title }}</p>
        <ConfigRadio :settings="detectionSettings" :selected-radio="currentDetectionType"
            @change="onDetectionTypeChange" class="aside-box">
            <template #default=" { setting }">
                <template v-if="setting.name === 'Color'">
                    <ColorPicker :selectedColor="selectedColor" @change="onChangeColor" />
                </template>
                <template v-else-if="setting.name === 'Position'">
                    <div class="position-input-container">
                        <input type="text" v-model="position" class="position-input" placeholder="x,y"
                            @onChangePosition="onChangePosition" />
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
    import { ref } from 'vue'
    import ConfigRadio from '@/components/Sidebar/Effects/ConfigRadio.vue'
    import ColorPicker from './RadioRights/ColorPicker.vue'
    import ConfigRange from '@/components/Sidebar/Effects/ConfigRange.vue'

    const props = defineProps({
        title: String,
        tolerance: {
            type: Number,
            default: 100,
        },
    })

    const emits = defineEmits(['update'])

    const currentDetectionType = ref('Position')
    const selectedColor = ref('#ff0000')
    const position = ref('0,0')
    const tolerance = ref(props.tolerance)

    const detectionSettings = ref([
        { name: 'Color' },
        { name: 'Position' },
    ])

    const chromaKeySettings = ref([
        { name: 'Tolerance', value: tolerance.value, min: 0, max: 300, step: 1 },
    ]);

    function update() {
        emits('update', {
            detectionType: currentDetectionType.value,
            selectedColor: selectedColor.value,
            position: position.value,
            tolerance: tolerance.value,
        })
    }

    function onDetectionTypeChange(setting) {
        currentDetectionType.value = setting.name
        update()
    }

    function onChangeColor(color) {
        selectedColor.value = color
        update()
    }

    function onChangePosition(event) {
        const value = event.target.value
        const [x, y] = value.split(',').map(Number)
        position.value = { x, y }
        update()
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