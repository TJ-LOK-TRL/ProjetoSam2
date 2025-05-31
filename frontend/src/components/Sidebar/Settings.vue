<template>
    <div class="settings-container">
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

        <div class="sidebar-div settings-group">
            <p class="sidebar-subtitle settings-title">
                <span>SAM Settings</span>
            </p>

            <div class="settings-content">
                <SimpleInputCard v-model="scaleFactor" :label="'Scale Factor'" :showRange="true"
                    :icon="'fa-solid fa-up-right-and-down-left-from-center'" :min="0.1" :max="1" :step="0.01" />
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, watch } from 'vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import { useVideoEditor } from '@/stores/videoEditor';
    import { useTimelineStore } from '@/stores/timeline'
    import SimpleInputCard from '@/components/Sidebar/SimpleInputCard.vue'

    const videoEditor = useVideoEditor();
    const timelineStore = useTimelineStore();

    const items = ref([
        { label: 'YouTube Shorts (9:16)', width: 1080, height: 1920 },
        { label: 'YouTube (16:9)', width: 1920, height: 1080 },
        { label: 'Instagram Post (1:1)', width: 1080, height: 1080 },
        { label: 'Instagram Story (9:16)', width: 1080, height: 1920 },
        { label: 'Facebook Cover (820x312)', width: 820, height: 312 },
    ])

    const scaleFactor = computed({
        get: () => {
            return videoEditor.maskScaleFactor
        },

        set: (val) => {
            videoEditor.maskScaleFactor = val
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

    .settings-group {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    .settings-content {
        display: flex;
        flex-direction: column;
        gap: 7.5px;
    }
</style>