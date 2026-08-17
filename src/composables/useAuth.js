import { ref } from 'vue'
import router from '@/router'

const user = ref(localStorage.getItem('user'))
const userName = ref(localStorage.getItem('userName'))
const admin = ref(localStorage.getItem('admin'))

// Sesión persistente estilo app mobile: el usuario queda logueado hasta que
// cierra sesión manualmente o el backend rechaza el token/cookie (401).
export function useAuth() {
  const login = (userEmail, isAdmin, mustChangePassword = false, name = '', token = '') => {
    localStorage.setItem('user', userEmail)

    if (token) {
      localStorage.setItem('token', token)
    }

    if (name) {
      localStorage.setItem('userName', name)
    } else {
      localStorage.removeItem('userName')
    }
    userName.value = name || null

    if (mustChangePassword) {
      localStorage.setItem('mustChangePassword', '1')
    } else {
      localStorage.removeItem('mustChangePassword')
    }

    if (isAdmin) {
      localStorage.setItem('admin', '1')
      admin.value = '1'
    } else {
      localStorage.removeItem('admin')
      admin.value = null
    }

    user.value = userEmail
  }

  const logout = () => {
    // Revoca el token en el backend en segundo plano (best-effort). Import
    // dinámico para evitar el ciclo axios.js <-> useAuth.js.
    if (localStorage.getItem('token')) {
      import('@/axios').then(({ default: api }) => {
        api.post('/logout').catch(() => {})
      })
    }

    localStorage.removeItem('user')
    localStorage.removeItem('userName')
    localStorage.removeItem('admin')
    localStorage.removeItem('mustChangePassword')
    localStorage.removeItem('token')
    user.value = null
    userName.value = null
    admin.value = null
    router.push('/login')
  }

  const isLoggedIn = () => !!user.value
  const isAdmin = () => !!admin.value

  return {
    user,
    userName,
    login,
    logout,
    isLoggedIn,
    isAdmin
  }
}