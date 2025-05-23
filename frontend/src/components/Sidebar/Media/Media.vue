<template>
    <div class="media-container">
        <StickyHeader>Add Media</StickyHeader>
        <UploadBox :accept="'video/*'" @on-file-upload="onFileUpload" />
        <StockVideos :videos="videos" @add-video="addVideo" />
        <MagicTools />
    </div>
</template>

<script setup>
    import { onMounted, ref, nextTick } from 'vue'
    import StockVideos from './StockVideos.vue'
    import MagicTools from './MagicTools.vue'
    import UploadBox from './UploadBox.vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import { useVideoEditor } from '@/stores/videoEditor';

    const videoEditor = useVideoEditor();

    const videos = ref([
        { use_cache: true, src: "/videos/214703_tiny.mp4" },
        { use_cache: true, src: "/videos/pessoa_a_correr.mp4" },
        { use_cache: false, src: "/videos/cavalos_vertical.mp4" },
        { use_cache: false, src: "/videos/numbered_frames.mp4" },
        { use_cache: false, src: "/videos/bouncing_ball.mp4" },
        { use_cache: false, src: "/videos/corrida.mp4" },
        { use_cache: false, src: "/videos/corrida_4xspeed.mp4" },
        { use_cache: false, src: "/videos/anatomical_model.mp4" },
        { use_cache: false, src: "/videos/pessoa_correr_cutted.mp4" },
        { use_cache: false, src: "/videos/football_min.mp4" },
        { use_cache: false, src: "/videos/back_doll.mp4" },
        { use_cache: false, src: "/videos/front_doll.mp4" },
    ])

    async function onFileUpload(file) {
        await videoEditor.addVideo(file)
    }

    async function addVideo(video) {
        try {
            videoEditor.isLoading = true
            const response = await fetch(video.src);
            const blob = await response.blob();

            const fileName = video.src.split('/').pop(); // Extrai "bouncing_ball.mp4" do path
            const file = new File([blob], fileName, {
                type: blob.type,
                lastModified: Date.now()
            });

            const videoObject = await videoEditor.addVideo(file);
            videoObject.use_cache = video.use_cache

        } catch (error) {
            console.error('Erro ao adicionar vídeo stock:', error);
        } finally {
            videoEditor.isLoading = false
        }
    }
</script>

<style scoped>
    .media-container {
        display: flex;
        flex-direction: column;
        gap: 30px;
    }
</style>