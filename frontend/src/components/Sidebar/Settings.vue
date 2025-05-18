<template>
    <div>
        <StickyHeader>Settings</StickyHeader>

        <div v-if="false" class="resize-container">
            <p class="resize-title">Size</p>
            <div class="resize-box">
                <div class="custom-select">
                    <input type="text" v-model="search" @focus="handleFocus" @blur="handleBlur"
                        placeholder="Search or select size..." />
                    <ul v-if="open" class="dropdown">
                        <li v-for="item in filteredItems" :key="item.label" @mousedown.prevent="select(item)">
                            {{ item.label }}
                        </li>
                        <li v-if="filteredItems.length === 0" class="no-results">No results</li>
                    </ul>
                    <div v-if="selected" class="selected">
                        Selected: <strong>{{ selected.label }}</strong>
                    </div>
                </div>
            </div>
        </div>

        <div class="local-sidebar-div sidebar-div">
            <div class="aside-box speed-container">
                <div class="speed-title">Speed</div>
                <div class="speed-buttons-container">
                    <button v-for="option in speedOptions" :key="option"
                        :class="['speed-button', { active: currentSpeed === option }]" @click="setSpeed(option)">
                        {{ option }}x
                    </button>
                </div>
                <input class="speed-input" type="number" step="0.1" min="0.1" v-model.number="inputSpeed"
                    @change="setSpeed(inputSpeed)" />
            </div>
        </div>


    </div>
</template>

<script setup>
    import { ref, computed, watch } from 'vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import { useVideoEditor } from '@/stores/videoEditor';
    import { useTimelineStore } from '@/stores/timeline'

    const videoEditor = useVideoEditor();
    const timelineStore = useTimelineStore();

    const items = ref([
        { label: 'YouTube Shorts (9:16)', width: 1080, height: 1920 },
        { label: 'YouTube (16:9)', width: 1920, height: 1080 },
        { label: 'Instagram Post (1:1)', width: 1080, height: 1080 },
        { label: 'Instagram Story (9:16)', width: 1080, height: 1920 },
        { label: 'Facebook Cover (820x312)', width: 820, height: 312 },
    ])

    const speedOptions = [0.5, 1.0, 2.0]
    const currentSpeed = ref(1.0)
    const inputSpeed = ref(currentSpeed.value)

    function setSpeed(newSpeed) {
        const parsed = parseFloat(newSpeed)
        if (!isNaN(parsed) && parsed > 0) {
            currentSpeed.value = parsed
            inputSpeed.value = parsed
        }
    }

    // 🔔 Se quiser fazer algo quando o speed mudar (como alterar vídeo):
    watch(currentSpeed, (newVal) => {
        console.log('Speed changed to:', newVal)
        if (videoEditor.selectedElement?.type === 'video') {
            const video = videoEditor.selectedElement
            timelineStore.setVideoSpeed(video, newVal)
        }
    })

    watch(() => videoEditor.selectedElement, (e) => {
        if (e?.type === 'video') {
            const video = e
            setSpeed(video.speed)
        }
    })
</script>

<style scoped>
    .resize-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        padding: 20px;
    }

    .resize-title {
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 600;
        margin-bottom: 8px;
    }

    .resize-box {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        height: 48px;
    }

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