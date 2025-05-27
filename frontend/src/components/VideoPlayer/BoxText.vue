<template>
    <ResizableBox class="text-box-resizable" ref="boxTextRef" :enable-resize="text?.visible" v-show="text?.visible" @dblclick="enableEdit"
        :class="{ 'element-box-selected': text?.id === videoEditor?.selectedElement?.id && text?.visible }"
        :style="{ pointerEvents: isEditing ? 'none' : 'auto' }" @click="videoEditor.selectEditorElement(text)">
        <div v-if="text" class="text-box" :class="text.style" :contenteditable="isEditing" ref="textRef"
            :style="text.style" @blur="disableEdit" @input="onInput" @keydown.enter.prevent="disableEdit">
            {{ text.text }}
        </div>
    </ResizableBox>
</template>

<script setup>
    import { ref, defineExpose, nextTick, onMounted } from 'vue';
    import ResizableBox from '@/components/ResizableBox.vue';
    import { useVideoEditor } from '@/stores/videoEditor'

    const videoEditor = useVideoEditor()

    const props = defineProps({
        textElement: Object
    });

    const isEditing = ref(false);
    const textRef = ref(null);
    const boxTextRef = ref(null);
    const text = ref(null)

    function enableEdit() {
        isEditing.value = true;
        nextTick(() => {
            const el = textRef.value;
            if (el) {
                el.focus();
                // Seleciona todo o texto e move o cursor para o final
                document.execCommand('selectAll', false, null);
                document.getSelection()?.collapseToEnd();
            }
        });
    }

    function disableEdit() {
        isEditing.value = false;
        text.value.text = textRef.value?.innerText ?? '';
    }

    function onInput(e) {
        text.value.text = e.target.innerText
    }

    onMounted(() => {
        text.value = props.textElement

        nextTick(() => {
            videoEditor.registerBox(text.value, {
                getRect: (abs = false) => {
                    return boxTextRef.value?.getRect(abs)
                },
                flip: () => boxTextRef.value?.flip(),
                getFlip: () => boxTextRef.value?.getFlip(),
                getRotation: () => boxTextRef.value?.getRotation(),
                box: boxTextRef.value,
            })
        })
    })

    defineExpose({
        boxTextRef,
        getText: () => currentLabel.value
    });
</script>

<style scoped>
    .text-box {
        width: 100%;
        height: 100%;
        text-align: center;
        color: white;
        padding: 8px;
        font-size: 1.5rem;
        word-break: break-word;
        outline: none;
        white-space: pre-wrap;
        user-select: text;
        cursor: text;
        overflow: hidden;
    }
</style>