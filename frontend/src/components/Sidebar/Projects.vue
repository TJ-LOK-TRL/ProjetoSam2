<template>
    <div>
        <StickyHeader>Projects of {{ authStore.getUsername }}</StickyHeader>
        <div v-if="videoEditor.selectedTool === 'projects'" class="projects-list">
            <div v-if="authStore.getProjects.length === 0" class="no-projects">
                Sem projetos disponíveis
            </div>

            <div v-for="project in authStore.getProjects" :key="project.id" class="project-item">
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

        videoEditor.isLoading = true // Set loading state to true
        console.log('Loading project:', project)

        if (!project.data) {
            throw new Error('Project data is empty')
        }

        const parsedData = typeof project.data === 'string'
            ? JSON.parse(project.data)
            : project.data;
        console.log('Parsed project data:', parsedData)

        // importar para o videoEditor
        const importedProject = await videoEditor.importProject(parsedData)
        if (!importedProject) {
            throw new Error('Failed to import project to video editor')
        }

        router.push({path: '/', query: { projectId: project.id} })
    } catch (error) {
        console.error('Error loading project:', error)
    }
    finally {
        videoEditor.isLoading = false // Set loading state to false
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