<template>
    <div class="timeline-text-frame">
        <span class="text-icon">T</span>
        <label :style="{ fontFamily: props.text?.style?.fontFamily }">{{ props.text?.text }}</label>
    </div>
</template>

<script setup>
    const props = defineProps({
        text: Object,
    })

    function update(newWidth) {

    }

    defineExpose({
        update,
    })
</script>

<style scoped>
    .timeline-text-frame {
        display: flex;
        align-items: center;
        width: 100%;
        height: 30px;
        background-color: rgb(255 197 144);
        border-color: rgb(255 98 72);
        border-width: 2px;
        border-style: solid;
        color: rgb(198 59 0);
        font-size: 12px;
    }

    .timeline-text-frame label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
    }

    .text-icon {
        width: 20px;
        height: 20px;
        color: rgb(198 59 0);
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        margin-right: 5px;
        font-size: 20px;
    }
</style>