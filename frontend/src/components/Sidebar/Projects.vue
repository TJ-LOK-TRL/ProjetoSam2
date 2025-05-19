<template>
    <div>
        <StickyHeader>Projects of {{ authStore.getUsername }}</StickyHeader>
        <div v-if="videoEditor.selectedTool === 'projects'" class="projects-list">
            <div v-if="authStore.getProjects.length === 0" class="no-projects">
                Sem projetos disponíveis
            </div>

            <div v-for="project in authStore.getProjects" :key="project.id" class="project-item"
                >
                <div class="project-info" @click="loadProject(project)">
                    <span class="project-name">{{ project.name }}</span>
                
                </div>
                <button class="delete-project-btn" @click.stop="deleteProject(project.id)">
                    <i class="fas fa-trash"></i>
                </button>

            </div>
        </div>


    </div>

</template>

<script setup>
import { useVideoEditor } from '@/stores/videoEditor'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'
import StickyHeader from '@/components/Sidebar/StickyHeader.vue'

const videoEditor = useVideoEditor()
const authStore = useAuthStore()
const router = useRouter()

function selectTool(tool) {
    videoEditor.selectedTool = tool
    videoEditor.selectedToolIcon = tool
}

async function loadProject(project) {
    try {
        // 1. Primeiro redireciona para o editor
        router.push('/')  // Ou a rota correta do seu editor
        
        // 2. Espera um pouco para garantir que o editor está pronto
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // 3. Agora carrega o projeto
        const success = await authStore.loadProject(project.id)
        
        if (!success) {
            alert('Failed to load project')
            router.push('/')  // Volta se falhar
        }
    } catch (error) {
        console.error('Error loading project:', error)
        alert('Error loading project')
        router.push('/')
    }
}

async function deleteProject(projectId) {
    if (confirm('Are you sure you want to delete this project?')) {
        const success = await authStore.deleteProject(projectId)
        if (!success) {
            alert('Failed to delete project')
        }
    }
}

const logout = () => {
    // Clear the local storage
    localStorage.clear()
    // Clear the video editor store
    videoEditor.$reset()
    // Clear the auth store
    authStore.logout()
    router.push('/login')
}
</script>

<style scoped>
.projects-list {
    padding: 1rem;
    border-top: 1px solid #eee;
    background: #f9fafe;
}

.projects-list h4 {
    margin: 0 0 0.5rem;
    font-size: 0.9rem;
    color: #333;
}

.projects-list ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.project-item {
    padding: 0.3rem 0;
    font-size: 0.85rem;
    color: #555;
    cursor: pointer;
    transition: background 0.2s;
}

.project-item:hover {
    background: #e1ecff;
}

.no-projects {
    padding: 0.3rem 0;
    font-size: 0.85rem;
    color: #999;
    font-style: italic;
}
</style>