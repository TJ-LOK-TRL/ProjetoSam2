<template>
    <div class="container">
        <StickyHeader>Add Text</StickyHeader>
        <div class="sidebar-div texts-container">
            <div class="text-container-background grab-placeholder" v-for="(item, i) in items" :key="i"
                :class="item.back_class">
                <div class="text-container" ref="textRefs">
                    <p class="text" :class="item.class" :data-font-class="item.class">{{ item.label }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
    import Grab from '@/assets/js/grab.js';
    import FixedTransformer from '@/assets/js/fixed_transformer.js';
    import { useVideoEditor } from '@/stores/videoEditor'
    import StickyHeader from '@/components/Sidebar/StickyHeader.vue'

    const videoEditor = useVideoEditor()

    const items = [
        { label: 'Headline Title', class: 'font-headline', back_class: 'span-2' },
        { label: 'Simple', class: 'font-simple', back_class: '' },
        { label: 'Handwriting', class: 'font-handwriting', back_class: '' },
        { label: 'Serif', class: 'font-serif', back_class: '' },
        { label: 'Typewriter', class: 'font-typewriter', back_class: '' },
        { label: 'Script', class: 'font-script', back_class: '' },
        { label: 'Gothic', class: 'font-gothic', back_class: '' },
        { label: 'Modern', class: 'font-modern', back_class: '' },
        { label: 'Bold Impact', class: 'font-impact', back_class: '' },
        { label: 'Rounded', class: 'font-rounded', back_class: '' },
        { label: 'Outline', class: 'font-outline', back_class: '' },
        { label: 'Vintage', class: 'font-vintage', back_class: '' },
    ];

    const textRefs = ref([]);

    let grabInstances = [];

    onMounted(async () => {
        await nextTick();
        textRefs.value.forEach((el) => {
            if (el) {
                let grab = new Grab(el, el)
                let transformer = new FixedTransformer();

                grab.useViewportOffsets = true

                grab.onIniGrabEvent = (elementGrab, elementMove) => {
                    const placeholder = document.createElement('div');
                    const rect = elementMove.getBoundingClientRect();

                    placeholder.style.width = rect.width + 'px';
                    placeholder.style.height = rect.height + 'px';
                    placeholder.classList.add('grab-placeholder');

                    transformer.transform(elementMove);

                    elementMove.parentNode.insertBefore(placeholder, elementMove);
                    elementMove.__placeholder = placeholder;

                    //set hover here
                    videoEditor.videoPlayerContainer.classList.add('hovering-over')
                }

                grab.onEndGrabEvent = (elementGrab, elementMove) => {
                    if (elementMove.__placeholder) {
                        elementMove.__placeholder.remove();
                        delete elementMove.__placeholder;
                    }
                    transformer.restore(elementMove);

                    videoEditor.videoPlayerContainer.classList.remove('hovering-over')

                    const mouseX = event.clientX;
                    const mouseY = event.clientY;

                    const hoveredElement = document.elementFromPoint(mouseX, mouseY);

                    if (videoEditor.videoPlayerContainer.contains(hoveredElement)) {
                        let e_text = elementMove.querySelector('.text')
                        if (e_text) {
                            const fontClass = e_text.dataset.fontClass
                            const label = e_text.innerText || 'Text';

                            videoEditor.addText(
                                label,
                                fontClass
                            );
                        }
                    }
                }

                grabInstances.push(grab);
            }
        });
    });

    onBeforeUnmount(() => {
        grabInstances.forEach((g) => g?.Destroy?.());
    });
</script>

<style scoped>
    .container {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
    }

    .texts-container {
        position: relative;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
    }

    .text-container-background {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .text-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        position: relative;
        background-color: #f0f0f0;
        padding: 33px 10px;
        text-align: center;
        border-radius: 5px;
        transition: background-color 0.3s ease, transform 0.2s ease;
        cursor: pointer;
    }

    .text-container:hover {
        background-color: #e0e0e0;
        transform: translateY(-2px);
    }

    .text-container .text {
        transition: color 0.3s ease, transform 0.3s ease;
    }

    .text-container:hover .text {
        color: #222;
        transform: scale(1.03);
    }

    .text {
        font-size: 1.1rem;
        margin: 0;
        overflow: hidden;
    }

    .span-2 {
        grid-column: span 2;
    }

    .grab-placeholder {
        background-image: repeating-linear-gradient(45deg,
                /* ângulo das riscas */
                rgba(0, 0, 0, 0.03),
                /* cor da risca */
                rgba(0, 0, 0, 0.03) 10px,
                transparent 10px,
                transparent 20px
                /* espaçamento entre riscas */
            );
        border-radius: 12px;
        /* opcional, se quiseres cantos arredondados */
    }
</style>