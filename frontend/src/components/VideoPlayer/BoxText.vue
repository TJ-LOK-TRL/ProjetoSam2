<template>
    <ResizableBox class="text-box-resizable" ref="boxTextRef" :enable-resize="true" @dblclick="enableEdit"
        :style="{ pointerEvents: isEditing ? 'none' : 'auto' }" @click="videoEditor.selectEditorElement(textElement)" >
        <div v-if="textElement" class="text-box" :class="textElement.font" :contenteditable="isEditing" ref="textEl"
            @blur="disableEdit" @keydown.enter.prevent="disableEdit">
            {{ textElement.text }}
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
    const textEl = ref(null);
    const boxTextRef = ref(null);
    const textElement = ref(null)

    function enableEdit() {
        isEditing.value = true;
        nextTick(() => {
            const el = textEl.value;
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
        textElement.text = textEl.value?.innerText ?? '';
    }

    onMounted(() => {
        textElement.value = props.textElement
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