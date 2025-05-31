import { defineStore } from 'pinia'
import { useVideoEditor } from '@/stores/videoEditor'
import { useBackendStore } from '@/stores/backend'
import axios from 'axios';

const LS_KEY = 'myapp_users'
const LS_PROJECTS = 'myapp_projects'

export const useAuthStore = defineStore('auth', {
  state: () => {
    // tentar carregar do localStorage, ou inicializar com 2 users de exemplo
    const savedUsers = JSON.parse(localStorage.getItem(LS_KEY) || 'null')
    const savedCurrentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
    return {
      users: savedUsers || [
        { email: 'user1@mail.pt', password: '123', username: 'user1', projects: [] },
        { email: 'user2@mail.pt', password: '123', username: 'user2', projects: [] }
      ],
      currentUser: savedCurrentUser || null
    }
  },
  getters: {
    isLoggedIn: (state) => !!state.currentUser,
    getUsername: (state) => state.currentUser?.username || '',
    getProjects: (state) => state.currentUser?.projects || []
  },
  actions: {
    _save() {
      localStorage.setItem(LS_KEY, JSON.stringify(this.users))
      this._saveCurrentUser()
    },
    login(email, password) {
      const user = this.users.find(u => u.email === email && u.password === password)
      if (user) {
        this.currentUser = user
        localStorage.setItem('currentUser', JSON.stringify(user))
        return true
      }
      return false
    },
    register(email, password) {
      const exists = this.users.find((u) => u.email === email)
      if (exists) return false

      const newUser = { email, password, username: email.split('@')[0], projects: [] }
      this.users.push(newUser)
      this.currentUser = newUser
      this._save()
      return true
    },
    logout() {
      this.currentUser = null
      localStorage.removeItem('currentUser')
    },
    addProject(project) {
      if (this.currentUser) {
        this.currentUser.projects.push(project)
        this._save()
      }
    },
    _saveCurrentUser() {
      if (this.currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser))
        localStorage.setItem(LS_PROJECTS, JSON.stringify(this.currentUser.projects))

        const index = this.users.findIndex(u => u.email === this.currentUser.email)
        if (index !== -1) {
          this.users[index] = this.currentUser
          localStorage.setItem(LS_KEY, JSON.stringify(this.users))
        }
      }
    },
    async _generateThumbnail() {
      try {
        const videoEditor = useVideoEditor()
        const videos = videoEditor.getVideos() 
        if (videos.length === 0) return null
        return 'thumbail-placeholder'
      } catch (error) {
        console.error('Error generating thumbnail:', error)
        return null
      }
    },
    async saveProject(projectName) {
      if (!this.currentUser) return false
      const videoEditor = useVideoEditor()
      const projectData = videoEditor.exportProject() 
      const thumbnail = await this._generateThumbnail()

      const newProject = {
        name: projectName,
        user_email: this.currentUser.email, 
        data: JSON.stringify(projectData), // dados do projeto
        thumbnail // miniatura do projeto
      }
      try{
        const response = await axios.post('http://localhost:5175/projects', newProject)
        const savedProject = response.data
        this.currentUser.projects.push(savedProject) // adiciona o projeto ao user atual
        this._saveCurrentUser() // guarda no LocalStorage
        return savedProject
      } catch (error) {
        console.error('Error saving project:', error)
        return null
      }
    },
    async loadProject(projectId) {
      const project = this.currentUser.projects.find(p => p.id === projectId)
      if (!project) {
        console.error('Project not found:', projectId)
        return null
      }

      const videoEditor = useVideoEditor()
      const success = await videoEditor.importProject(project.data)
      return success
    },


    async deleteProject(projectId) {
      if (!this.currentUser) return false

      // remove o projeto pelo Id
      this.currentUser.projects = this.currentUser.projects.filter(p => p.id !== projectId)
      this._saveCurrentUser() // guarda no LocalStorage
      return true
    },

    async fetchProjectById(projectId) {
      try {
        const backend = useBackendStore()
        const response = await backend.get(`/projects/${projectId}`)
            return response.data
      } catch(error) {
        console.error('Error fetching project by ID:', error)
        return null
      }
    }
  }
})
