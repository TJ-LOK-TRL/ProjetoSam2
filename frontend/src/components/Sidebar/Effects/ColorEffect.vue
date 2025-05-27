<template>
    <div class="color-effect-container">
        <StickyHeader :show-icon="true">
            Color Effect Settings
        </StickyHeader>

        <div class="local-sidebar-div sidebar-div">
            <p class="section-title">Basic Color</p>
            <ConfigRadio :settings="baseColorSettings" v-model:selectedRadio="currentColorType"
                @change="onColorTypeChange" class="aside-box">
                <template #default=" { setting }">
                    <template v-if="setting.name === 'Color'">
                        <ColorPicker v-model:selectedColor="selectedColor" @change="changeToSelectedColor" />
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
    import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
        { name: 'Factor', value: 1, defaultValue: 1, min: 0, max: 2, step: 0.1 },
        { name: 'Brightness', value: 0, defaultValue: 0, min: -1, max: 1, step: 0.1 },
        { name: 'Contrast', value: 0, defaultValue: 0, min: -1, max: 1, step: 0.1 },
        { name: 'Exposure', value: 0, defaultValue: 0, min: -2, max: 2, step: 0.1 },
        { name: 'Hue', value: 0, defaultValue: 0, min: -180, max: 180, step: 1 },
        { name: 'Saturation', value: 1, defaultValue: 1, min: 0, max: 2, step: 0.1 }
    ]);

    const colorEffectSettings = ref([
        { name: 'Sharpen', value: 0, defaultValue: 0, min: 0, max: 2, step: 0.1 },
        { name: 'Noise', value: 0, defaultValue: 0, min: 0, max: 1, step: 0.01 },
        { name: 'Blur', value: 0, defaultValue: 0, min: 0, max: 10, step: 1 },
        { name: 'Vignette', value: 0, defaultValue: 0, min: 0, max: 1, step: 0.01 }
    ]);

    function updateUI(video) {
        const effectState = videoEditor.register.getLastStateOfEffect(video.id, videoEditor.maskHandler.maskToEdit.objId, 'colorEffect')
        console.log('EffectState:', effectState, video.id, videoEditor.maskHandler.maskToEdit.objId)
        if (effectState) {
            selectedColor.value = effectState.color || selectedColor.value
            currentColorType.value = effectState.color === null ? 'Default' : 'Color'

            colorCorrectionSettings.value.forEach(item => {
                const key = item.name.toLowerCase();
                item.value = effectState.settings?.[key] ?? item.defaultValue;
            });

            colorEffectSettings.value.forEach(item => {
                const key = item.name.toLowerCase();
                item.value = effectState.settings?.[key] ?? item.defaultValue;
            });

            console.log('colorCorrectionSettings.value =', colorCorrectionSettings.value)
            console.log('colorEffectSettings.value =', colorEffectSettings.value)
        } else {
            selectedColor.value = '#ff0000'
            currentColorType.value = 'Default'

            colorCorrectionSettings.value.forEach(item => {
                item.value = item.defaultValue
            })

            colorEffectSettings.value.forEach(item => {
                item.value = item.defaultValue
            })
        }
    }

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
        const boxOfVideo = videoEditor.getBoxOfElement(video)
        console.log(settings)

        let effectType;
        if (mask.objId === -1) {
            await videoEditor.effectHandler.resetEffects(boxOfVideo, video, mask, 'background');
            effectType = EffectHandler.COLOR_BKG_EFFECT_ID;
        } else if (mask.objId === -3) {
            await videoEditor.effectHandler.resetEffects(boxOfVideo, video, mask, 'background');
            await videoEditor.effectHandler.resetEffects(boxOfVideo, video, mask, 'object');
            effectType = EffectHandler.COLOR_ALL_EFFECT_ID;
        } else {
            await videoEditor.effectHandler.resetEffects(boxOfVideo, video, mask, 'object');
            effectType = EffectHandler.COLOR_OBJ_EFFECT_ID;
        }

        await videoEditor.effectHandler.changeColorOfMask(video, mask, color, settings)

        const effect_id = EffectHandler.id(effectType, mask.objId);
        boxOfVideo.addOnDrawVideoCallback(effect_id, async img => {
            let frame_mask;
            if (mask.objId === -1) {
                const obj_masks = Object.values(video.trackMasks?.[video.frameIdx] || {})
                frame_mask = await videoEditor.maskHandler.getBackgroundMask(obj_masks, ...boxOfVideo.getBoxVideoSize());
            } else if (mask.objId === -3) {
                frame_mask = await videoEditor.maskHandler.getBackgroundMask([], ...boxOfVideo.getBoxVideoSize());
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

        if (newColor === undefined) {
            newColor = currentColorType.value === 'Default' ? null : selectedColor.value;
        }

        await changeColor(newColor, getSettingValues())
        updateUI(videoEditor.selectedElement)
    }

    async function onColorTypeChange(setting) {
        await changeToSelectedColor()
    }

    function onVideo(e) {
        if (e?.id !== videoEditor.maskHandler.video.id || videoEditor.maskHandler.maskToEdit === null) {
            videoEditor.changeToPreviousTool()
        } else {
            updateUI(e)
        }
        //if (e?.type === 'video') {
        //    console.log(e.id)
        //    updateUI(e)
        //} else {
        //    videoEditor.changeToPreviousTool()
        //}
    }

    onMounted(() => {
        onVideo(videoEditor.selectedElement)
        watch(() => videoEditor.selectedElement, (e) => onVideo(e))
        videoEditor.maskHandler.onMaskToEditChange('ColorEffect', (mask) => onVideo(videoEditor.maskHandler.video))
    })

    onUnmounted(() => {
        videoEditor.maskHandler.removeOnMaskToEditCallback('ColorEffect')
    })
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