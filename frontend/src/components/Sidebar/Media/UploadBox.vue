<template>
    <div class="sidebar-div upload-file-container">
        <div class="upload-file-box" @dragover.prevent @drop="handleDrop" @click="selectFile">
            <i class="upload-file-box-icon fas fa-cloud-arrow-up"></i>
            <p class="upload-file-box-title">Upload a File</p>
            <p class="upload-file-box-text">Drag & drop a file<br> or <a class="upload-file-box-link" href="#">import
                    from your computer</a></p>
            <input type="file" ref="fileInput" hidden @change="handleFileUpload" :accept="props.accept">
        </div>
    </div>
</template>

<script setup>
    import { ref } from 'vue'

    const fileInput = ref(null)

    const props = defineProps({
        accept: String,
    })

    const emit = defineEmits(['onFileUpload'])

    function selectFile() {
        fileInput.value.click()
    }

    async function handleFileUpload(event) {
        const file = event.target.files[0]
        if (file) {
            emit('onFileUpload', file)
        }
    }

    async function handleDrop(event) {
        event.preventDefault()
        const file = event.dataTransfer.files[0]
        if (file) {
            emit('onFileUpload', file)
        }
    }
</script>

<style scoped>
    .upload-file-box {
        width: 100%;
        height: 150px;
        border: 1px dashed rgb(228, 229, 231);
        border-radius: 5%;
        gap: 0.5rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 35px;
    }

    .upload-file-box:hover {
        background-color: rgb(247, 247, 247);
        border-color: rgb(183, 184, 186);
        cursor: pointer;
    }

    .upload-file-box-icon {
        font-size: 20px;
        color: gray;
    }

    .upload-file-box-title {
        font-size: 13px;
        text-align: center;
    }

    .upload-file-box-text {
        font-size: 11.5px;
        color: #A5A7AD;
        text-align: center;
    }

    .upload-file-box-link {
        color: #5666F5;
    }
</style>