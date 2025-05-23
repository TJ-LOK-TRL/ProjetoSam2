<template>
    <div class="color-effect-container">
        <StickyHeader :show-icon="true">
            Color Effect Settings
        </StickyHeader>

        <div class="local-sidebar-div sidebar-div">
            <p class="section-title">Basic Color</p>
            <ConfigRadio :settings="baseColorSettings" :selected-radio="currentColorType" @change="onColorTypeChange"
                class="aside-box">
                <template #default=" { setting }">
                    <template v-if="setting.name === 'Color'">
                        <ColorPicker :selectedColor="selectedColor" @change="changeToSelectedColor" />
                    </template>
                    <template v-else-if="setting.name === 'Default'">
                        <div class="default-icon-container">
                            <i class="fas fa-ban"></i>
                        </div>
                    </template>
                </template>
            </ConfigRadio>
        </div>

        <div class="local-sidebar-div sidebar-div">
            <p class="section-title">Color correction</p>
            <ConfigRange :settings="colorCorrectionSettings" @change="changeToSelectedColor()" class="aside-box" />
        </div>

        <div class="local-sidebar-div sidebar-div">
            <p class="section-title">Color effect</p>
            <ConfigRange :settings="colorEffectSettings" @change="changeToSelectedColor()" class="aside-box" />
        </div>
    </div>
</template>

<script setup>
    import { ref } from 'vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import ConfigRange from '@/components/Sidebar/Effects/ConfigRange.vue'
    import ConfigRadio from '@/components/Sidebar/Effects/ConfigRadio.vue'
    import ColorPicker from './RadioRights/ColorPicker.vue'
    import EffectHandler from '@/assets/js/effectHandler.js';
    import { useVideoEditor } from '@/stores/videoEditor';

    const videoEditor = useVideoEditor()

    const selectedColor = ref('#ff0000')
    const currentColorType = ref('Default')

    const baseColorSettings = ref([
        { name: 'Color' },
        { name: 'Default' },
    ])

    const colorCorrectionSettings = ref([
        { name: 'Factor', value: 1, min: 0, max: 2, step: 0.1 }, // 0 a 1 (1 = normal)
        { name: 'Brightness', value: 0, min: -1, max: 1, step: 0.1 }, // -1 a 1 (0 = normal)
        { name: 'Contrast', value: 0, min: -1, max: 1, step: 0.1 },   // -1 a 1 (0 = normal)
        { name: 'Exposure', value: 0, min: -2, max: 2, step: 0.1 },  // -2 a 2 (0 = normal)
        { name: 'Hue', value: 0, min: -180, max: 180, step: 1 },     // -180° a 180° (0 = normal)
        { name: 'Saturation', value: 1, min: 0, max: 2, step: 0.1 } // 0 a 2 (1 = normal)
    ]);

    const colorEffectSettings = ref([
        { name: 'Sharpen', value: 0, min: 0, max: 2, step: 0.1 },   // 0 a 2
        { name: 'Noise', value: 0, min: 0, max: 1, step: 0.01 },    // 0 a 1 (intensidade)
        { name: 'Blur', value: 0, min: 0, max: 10, step: 1 },     // 0 a 10px
        { name: 'Vignette', value: 0, min: 0, max: 1, step: 0.01 }  // 0 a 1 (intensidade)
    ]);

    function getSettingValues() {
        const allSettingsArray = [
            ...colorCorrectionSettings.value,
            ...colorEffectSettings.value
        ];

        const settings = Object.fromEntries(
            allSettingsArray.map(({ name, value }) => [name.toLowerCase(), parseFloat(value)])
        );

        return settings
    }

    async function changeColor(color, settings) {
        console.log('Color applied:', color);

        const video = videoEditor.maskHandler.video;
        const mask = videoEditor.maskHandler.maskToEdit
        const boxOfVideo = videoEditor.getBoxOfVideo(video)
        console.log(settings)


        await videoEditor.effectHandler.resetEffects(boxOfVideo, video, mask, mask.objId === -1 ? 'background' : 'object');
        await videoEditor.effectHandler.changeColorOfMask(video, mask, color, settings)

        const effect_id = EffectHandler.id(mask.objId === -1 ? EffectHandler.COLOR_BKG_EFFECT_ID : EffectHandler.COLOR_OBJ_EFFECT_ID, mask.objId)
        boxOfVideo.addOnDrawVideoCallback(effect_id, async img => {
            let frame_mask;
            if (mask.objId === -1) {        
                const obj_masks = Object.values(video.trackMasks?.[video.frameIdx] || {})
                frame_mask = await videoEditor.maskHandler.getBackgroundMask(obj_masks, ...boxOfVideo.getBoxVideoSize());
            } else {
                frame_mask = video.trackMasks?.[video.frameIdx]?.[mask.objId]
            }

            if (frame_mask) {
                const [width, height] = boxOfVideo.getBoxVideoSize()
                const outputCanvas = document.createElement('canvas')
                outputCanvas.width = width
                outputCanvas.height = height
                const outputCtx = outputCanvas.getContext('2d')
                outputCtx.drawImage(img, 0, 0, width, height)
                await videoEditor.maskHandler.changeColorOfMask(img, frame_mask, color, settings, 255, 255, outputCanvas, null);
                return outputCanvas
            }
            return img
        })
    }

    async function changeToSelectedColor(newColor) {
        console.log('New selected color:', newColor);
        if (newColor) selectedColor.value = newColor;
        const color = currentColorType.value === 'Default' ? null : selectedColor.value
        await changeColor(color, getSettingValues())
    }

    async function onColorTypeChange(setting) {
        currentColorType.value = setting.name
        await changeToSelectedColor(selectedColor.value)
    }
</script>

<style scoped>
    .color-effect-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
        position: relative;
        width: 100%;
        height: 100%;
    }

    .default-icon-container {
        display: flex;
        width: 100%;
        justify-content: right;
        color: rgb(196, 196, 196);
        font-size: 22px;
    }
</style>