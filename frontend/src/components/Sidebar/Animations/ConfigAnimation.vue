<template>
    <div class="config-animation-container">
        <StickyHeader :show-icon="true">
            Animation
        </StickyHeader>

        <div class="animation-group config-animation-content">
            <div class="filter-animation-container" ref="filterContainer">
                <div v-for="(animationType, index) in animationTypes" :key="index" class="filter-animation-item"
                    @click="selectAnimationType(animationType)"
                    :class="{ selected: currentAnimationType === animationType }">
                    {{ animationType.charAt(0).toUpperCase() + animationType.slice(1) }}
                </div>

                <div class="underline" :style="underlineStyle"></div>
            </div>

            <div class="list-animation-container">
                <ul class="list-animation-grid">
                    <li v-for="(animation, index) in filteredAnimations" :key="index" class="animation-item">
                        <div class="animation-toggle-button" @click="selectAnimation(animation)"
                            :class="{ selected: animation.name === currentAnimationByType[currentAnimationType]?.name && animation.type === currentAnimationByType[currentAnimationType]?.type }">
                            <div class="animation-icon-container">
                                <i :class="[animation.icon, animation.class]"></i>
                            </div>
                        </div>

                        <span class="animation-span">{{ animation.name }}</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'
    import { useVideoEditor } from '@/stores/videoEditor';

    const videoEditor = useVideoEditor()

    const animationTypes = ref([
        'in', 'out'
    ])

    const animations = ref([
        { name: 'None', type: 'in', icon: 'fas fa-ban' },
        { name: 'None', type: 'out', icon: 'fas fa-ban' },
        { name: 'Fade', type: 'in', icon: 'fas fa-square', class: 'fade-in-effect' },
        { name: 'Fade', type: 'out', icon: 'fas fa-square', class: 'fade-out-effect' },
    ])

    const currentAnimationType = ref('in')
    const currentAnimationByType = ref({})
    const filteredAnimations = computed(() => animations.value.filter(animation => !animation.type || animation.type === currentAnimationType.value))

    const filterContainer = ref(null)
    const underlineStyle = ref({})

    const mediaElement = ref(null)

    function selectAnimationType(animationType) {
        currentAnimationType.value = animationType
        updateUnderline()
    }

    function selectAnimation(animation) {
        currentAnimationByType.value[animation.type] = animation

        videoEditor.animationHandler.applyAnimation(mediaElement.value, animation.name, animation.type, {
            duration: 1,
        })
    }
    
    function updateUI() {
        const editorElement = videoEditor.selectedElement
        if (!editorElement) videoEditor.changeToPreviousTool()

        currentAnimationByType.value = {}
        for (const animationType of animationTypes.value) {
            const animationInfo = videoEditor.register.getLastAnimationByType(editorElement.id, animationType)
            if (animationInfo) {
                const anim = animations.value.find(anim => anim.name === animationInfo.name && anim.type === animationType)
                currentAnimationByType.value[animationType] = anim
            } else {
                const anim = animations.value.find(anim => anim.name === 'None' && anim.type === animationType)
                currentAnimationByType.value[animationType] = anim
            }
        }
        
        mediaElement.value = editorElement
    }

    function updateUnderline() {
        // Garante que a linha segue o item certo
        const container = filterContainer.value
        if (!container) return

        const index = animationTypes.value.indexOf(currentAnimationType.value)
        if (index === -1) return

        const item = container.querySelectorAll('.filter-animation-item')[index]
        if (!item) return

        underlineStyle.value = {
            width: item.offsetWidth + 'px',
            transform: `translateX(${item.offsetLeft}px)`
        }
    }

    onMounted(() => {
        updateUnderline()
        window.addEventListener('resize', updateUnderline)

        mediaElement.value = videoEditor.selectedElement
        watch(() => videoEditor.selectedElement, updateUI)
    })

    onUnmounted(() => {
        window.removeEventListener('resize', updateUnderline)
    })
</script>

<style scoped>
    .animation-group {
        padding-left: 10px;
        padding-right: 10px;
    }

    .config-animation-content {
        display: flex;
        flex-direction: column;
        gap: 24px;
    }

    .filter-animation-container {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
        border-bottom: 1px solid rgb(231, 230, 230);
    }

    .filter-animation-item {
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;
        cursor: pointer;
        padding-bottom: 16px;
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        user-select: none;
        color: rgb(165, 167, 173);
        font-weight: 500;
    }

    .filter-animation-item:hover {
        color: rgb(24, 25, 27);
    }

    .filter-animation-item.selected {
        color: rgb(24, 25, 27);
    }

    .list-animation-container {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
    }

    .list-animation-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        width: 100%;
        padding: 0;
    }

    .animation-item {
        display: flex;
        flex-direction: column;
        gap: 0.5px;
    }

    .animation-toggle-button {
        all: unset;
        position: relative;
        height: 5rem;
        min-height: auto;
        border: 2px solid rgb(231, 230, 230);
        border-radius: 0.625rem;
        overflow: visible;
        transition: background-color 0.25s, border-color 0.25s;
        cursor: pointer;
    }

    .animation-toggle-button:hover {
        border-color: rgb(201, 200, 200);
    }

    .animation-toggle-button.selected {
        border-color: var(--main-color-alpha-stronger);
        background-color: var(--main-color-alpha-weaker);
    }

    .animation-icon-container {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        font-size: 30px;
        color: rgb(139, 132, 133)
    }

    .animation-toggle-button.selected .animation-icon-container {
        color: var(--main-color-alpha-stronger);
    }

    .animation-span {
        font-family: Inter, sans-serif;
        font-size: 0.8125rem;
        line-height: 1rem;
        letter-spacing: 0px;
        font-weight: 400;
        color: rgb(81, 76, 77);
    }

    .underline {
        position: absolute;
        bottom: 0;
        height: 3px;
        background-color: var(--main-color);
        transition: transform 0.3s ease, width 0.3s ease;
        z-index: 0;
    }

    .fade-in-effect {
        mask-image: linear-gradient(to top, rgba(0, 0, 0, 0) 0%, black 30%);
        -webkit-mask-image: linear-gradient(to top, rgba(0, 0, 0, 0) 0%, black 80%);
    }

    .fade-out-effect {
        mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, black 30%);
        -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, black 80%);
    }
</style>