import { defineStore } from 'pinia'
import { useVideoEditor } from '@/stores/videoEditor'

const LS_KEY = 'myapp_users'

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
    },



    login(email, password) {
      const user = this.users.find(
        (u) => u.email === email && u.password === password)
      if (user) {
        this.currentUser = user

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
    saveProject(projectName) {
      if (!this.currentUser) return false

      const videoEditor = useVideoEditor()  
      const projectData = videoEditor.exportProject() // Método que você precisa implementar

      const project = {
        id: Date.now(),
        name: projectName,
        createdAt: new Date().toISOString(),
        videoData: projectData,
        humbnail: this._generateThumbnail() // 
      }

      this.currentUser.projects.push(project)
      this._saveCurrentUser()

      return project
    },


    loadProject(projectId) {
      if (!this.currentUser) return null

      const projects = JSON.parse(localStorage.getItem(LS_KEY)) || []
      const project = projects.find(p => p.id === projectId)
      if (!project) return false

      const videoEditor = useVideoEditor()
      videoEditor.importProject(project.videoData) // Método a implementar
      return true
    }
  }

})
