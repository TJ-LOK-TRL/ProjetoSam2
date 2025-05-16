<template>
    <div class="toolbar-container">
        
        <div class="toolbar-item" @click="selectTool('search')"
            :class="{ 'selected': videoEditor.selectedToolIcon === 'search' }">
            <div class="toolbar-item-icon-container">
                <i class="toolbar-item-icon fa-solid fa-magnifying-glass"></i>
            </div>
            <p class="toolbar-item-label">Search</p>
        </div>

        <div class="toolbar-item" @click="selectTool('settings')"
            :class="{ 'selected': videoEditor.selectedToolIcon === 'settings' }">
            <div class="toolbar-item-icon-container">
                <i class="toolbar-item-icon fa-solid fa-gear"></i>
            </div>
            <p class="toolbar-item-label">Settings</p>
        </div>
        <div class="toolbar-item" @click="selectTool('media')"
            :class="{ 'selected': videoEditor.selectedToolIcon === 'media' }">
            <div class="toolbar-item-icon-container">
                <i class="toolbar-item-icon fa-solid fa-plus"></i>
            </div>
            <p class="toolbar-item-label">Media</p>
        </div>
        <div class="toolbar-item" @click="selectTool('text')"
            :class="{ 'selected': videoEditor.selectedToolIcon === 'text' }">
            <div class="toolbar-item-icon-container">
                <i class="toolbar-item-icon fa-solid fa-t"></i>
            </div>
            <p class="toolbar-item-label">Text</p>
        </div>

        <div class="toolbar-item" @click="selectTool('projects')"
            :class="{ 'selected': videoEditor.selectedToolIcon === 'projects' }">
            <div class="toolbar-item-icon-container">
                <i class="toolbar-item-icon fa-solid fa-p"></i>
            </div>
            <p class="toolbar-item-label">Projects</p>
        </div>
        

        <div style="flex: 1"></div>
        <div v-if="authStore.isLoggedIn" class="user-profile">
            <div class="user-info">
                <span class="username">{{ authStore.getUsername }}</span>              
            </div>
            <button class="logout-btn" @click="logout">Logout</button>
        </div>
        
    </div>
</template>


<script setup>
import { ref, onMounted } from 'vue'
import { useVideoEditor } from '@/stores/videoEditor'
import { useAuthStore } from '@/stores/authStore.js'
import { useRouter } from 'vue-router'

const videoEditor = useVideoEditor()
const router = useRouter()
const authStore = useAuthStore()

function selectTool(tool) {
    if (tool != null) {
        videoEditor.selectedTool = tool
        videoEditor.selectedToolIcon = tool
    }
}

onMounted(() => {
    selectTool('media')
})


const logout = async () => {
    
    await authStore.logout()
    router.push('/login')
}
</script>


<style scoped>
.toolbar-container {
    display: flex;
    flex-direction: column;
    gap: 30px;
    border-right: 1px solid rgb(228, 229, 231);
    padding: 10px;
    background-color: white;
}

.toolbar-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: center;
    cursor: pointer;
}

.toolbar-item-icon-container {
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    transition: 0.2s;
}

.toolbar-item-icon-container:hover {
    background-color: rgb(237, 237, 237);
}

.toolbar-item-icon-container:hover .toolbar-item-icon {
    background-color: rgb(165, 167, 170);
}

.toolbar-item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    font-size: 15px;
    color: white;
    border-radius: 20%;
    background-color: rgb(194, 196, 200);
    transition: 0.2s;
}

.toolbar-item-label {
    text-align: center;
    font-size: small;
    color: #505257;
    transition: 0.2s;
}

.toolbar-item.selected .toolbar-item-icon-container {
    background-color: #67a6e534;
}

.toolbar-item.selected .toolbar-item-icon {
    background-color: #007bff;
    color: white;
}

.toolbar-item.selected .toolbar-item-label {
    color: #007bff;
}

.user-info {
  padding: 1rem;
  background: #f5f8ff;
  border-bottom: 1px solid #dde4f0;
  text-align: center;
  font-size: 14px;
}
.user-info strong {
  color: #1a73e8;
}
.logout-btn {
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  border: none;
  background: #e84545;
  color: white;
  border-radius: 4px;
  cursor: pointer;
}
.logout-btn:hover {
  background: #d63434;
}
</style>