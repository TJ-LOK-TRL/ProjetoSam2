<template>
    <div class="sticky-header-container" :class="{ 'has-shadow': isScrolled }" ref="header">
        <div class="sticky-header-title">
            <div class="title-icon" v-if="showIcon" @click="videoEditor.changeToPreviousTool()"><i class="fas fa-chevron-left"></i></div>
            <span><slot></slot></span>
        </div>
    </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted, nextTick } from 'vue';
    import { useVideoEditor } from '@/stores/videoEditor'

    const videoEditor = useVideoEditor();

    const props = defineProps({
        showIcon: {
            type: Boolean,
            default: false
        }
    });

    const header = ref(null);
    const isScrolled = ref(false);

    function handleScroll() {
        const container = header.value?.parentElement.parentElement;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            isScrolled.value = scrollTop > 0;
        } else {
            //console.log('Container not found');
        }
    }

    onMounted(async () => {
        await nextTick();
        const container = header.value?.parentElement.parentElement;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            handleScroll();
        }
    });

    onUnmounted(() => {
        const container = header.value?.parentElement.parentElement;
        if (container) {
            container.removeEventListener('scroll', handleScroll);
        }
    });
</script>

<style>
    .sticky-header-container {
        position: sticky;
        top: 0;
        z-index: 10;
        width: 100%;
        /*height: 100%;*/
        background-color: white;
    }

    .sticky-header-title {
        display: flex;
        align-items: center;
        gap: 6px;

        font-size: 18px;
        font-size: 1.125rem;

        font-weight: 600;
        font-family: Inter, sans-serif;
        color: rgb(58, 58, 58);
        padding: 20px;
    }

    .has-shadow {
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .title-icon {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 24px;
        height: 24px;
        font-size: 0.8rem;
        border-radius: 50%;
        cursor: pointer;
    }

    .title-icon i {
        margin-top: 2px;
    }

    .title-icon:hover {
        background: rgb(229, 229, 229);
    }
</style>