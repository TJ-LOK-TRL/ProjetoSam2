<template>
    <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p class="loading-text">Loading...</p>
    </div>
</template>

<script setup>
    import { ref, onMounted, watch } from 'vue';

    const props = defineProps({
        isLoading: Boolean
    });

    const isLoading = ref(props.isLoading)

    watch(() => props.isLoading, () => {
        isLoading.value = props.isLoading
    })    
</script>

<style scoped>
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.75);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .spinner {
        width: 50px;
        height: 50px;
        border: 5px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .loading-text {
        margin-top: 10px;
        color: white;
        font-size: 18px;
        font-weight: bold;
        text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }

        to {
            transform: rotate(360deg);
        }
    }
</style>