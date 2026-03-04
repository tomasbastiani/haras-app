import { ref } from 'vue'
import { useRouter } from 'vue-router'

const user = ref(localStorage.getItem('user'))
const admin = ref(localStorage.getItem('admin'))

let logoutTimer = null

export function useAuth() {
  const router = useRouter()

  const login = (userEmail, isAdmin) => {
    const now = Date.now()
    const sessionDuration = 30 * 60 * 1000

    localStorage.setItem('user', userEmail)
    localStorage.setItem('loginTime', now)
    localStorage.setItem('sessionDuration', sessionDuration)

    if (isAdmin) {
      localStorage.setItem('admin', '1')
      admin.value = '1'
    } else {
      localStorage.removeItem('admin')
      admin.value = null
    }

    user.value = userEmail

    startAutoLogout(sessionDuration)
  }

  const startAutoLogout = (duration) => {
    if (logoutTimer) clearTimeout(logoutTimer)

    logoutTimer = setTimeout(() => {
      logout()
    }, duration)
  }

  const logout = () => {
    localStorage.clear()
    user.value = null
    admin.value = null
    router.push('/login')
  }

  const isLoggedIn = () => !!user.value
  const isAdmin = () => !!admin.value

  return {
    user,
    login,
    logout,
    isLoggedIn,
    isAdmin
  }
}