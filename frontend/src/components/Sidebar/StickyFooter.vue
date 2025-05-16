<template>
    <div class="sticky-footer-container" :class="{ 'has-shadow': isScrolled }" ref="footer">
        <slot></slot>
    </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted, nextTick } from 'vue';

    const footer = ref(null);
    const isScrolled = ref(false);

    function handleScroll() {
        const container = footer.value?.parentElement.parentElement;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            isScrolled.value = scrollTop + clientHeight < scrollHeight;
        } else {
            //console.log('Container not found');
        }
    }

    onMounted(async () => {
        await nextTick();
        const container = footer.value?.parentElement.parentElement;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            handleScroll();
        }
    });

    onUnmounted(() => {
        const container = footer.value?.parentElement.parentElement;
        if (container) {
            container.removeEventListener('scroll', handleScroll);
        }
    });
</script>

<style>
    .sticky-footer-container {
        position: sticky;
        bottom: 0;
        z-index: 10;
        width: 100%;
        /*height: 100%;*/
        background-color: white;
        padding: 20px;
    }

    .has-shadow {
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .footer.has-shadow {
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    }
</style>