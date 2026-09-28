import { ref } from 'vue'
import router from '@/router'

const user = ref(localStorage.getItem('user'))
const userName = ref(localStorage.getItem('userName'))
const admin = ref(localStorage.getItem('admin'))
// Cuenta dedicada de portería: sólo ve la oficina de paquetería. Se guarda en
// localStorage igual que `admin` porque el guard del router corre antes de que
// haya cualquier request al backend.
const paqueteria = ref(localStorage.getItem('paqueteria'))
// Acceso a la mensajería interna (chat del personal). Igual que los de arriba:
// vive en localStorage porque el guard del router corre antes de cualquier
// request. Es UX —mostrar el ítem del menú y no dejar entrar por URL a quien no
// corresponde—, NO el permiso: eso lo chequea el middleware `mensajeria` del
// backend en cada endpoint, así que este flag congelado no habilita nada.
const mensajeria = ref(localStorage.getItem('mensajeria'))

// Sesión persistente estilo app mobile: el usuario queda logueado hasta que
// cierra sesión manualmente o el backend rechaza el token/cookie (401).
export function useAuth() {
  const login = (userEmail, isAdmin, mustChangePassword = false, name = '', token = '', esPaqueteria = false, accesoMensajeria = false) => {
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

    if (esPaqueteria) {
      localStorage.setItem('paqueteria', '1')
      paqueteria.value = '1'
    } else {
      localStorage.removeItem('paqueteria')
      paqueteria.value = null
    }

    if (accesoMensajeria) {
      localStorage.setItem('mensajeria', '1')
      mensajeria.value = '1'
    } else {
      localStorage.removeItem('mensajeria')
      mensajeria.value = null
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
    localStorage.removeItem('paqueteria')
    localStorage.removeItem('mensajeria')
    localStorage.removeItem('mustChangePassword')
    localStorage.removeItem('token')
    user.value = null
    userName.value = null
    admin.value = null
    paqueteria.value = null
    mensajeria.value = null
    router.push('/login')
  }

  const isLoggedIn = () => !!user.value
  const isAdmin = () => !!admin.value
  // Cuenta de portería. Un admin nunca lo es (el backend lo impide al asignarlo),
  // así que los dos roles no se pisan.
  const isPaqueteria = () => !!paqueteria.value
  // Acceso a la mensajería interna. Los admin también lo tienen (supervisan
  // grupos), así que esto no implica estar en el directorio del módulo: eso lo
  // responde /mensajeria/bootstrap con `yo.miembro`.
  const tieneMensajeria = () => !!mensajeria.value

  /**
   * Sincroniza el flag de mensajería con lo que dice el backend.
   *
   * Hace falta porque la sesión no expira: si el acceso se otorga (o se quita)
   * después del login, el flag guardado quedaría desactualizado para siempre. Lo
   * llama useMenuItems al armar el menú, con /mensajeria/acceso.
   */
  const setMensajeria = (tiene) => {
    if (tiene) {
      localStorage.setItem('mensajeria', '1')
      mensajeria.value = '1'
    } else {
      localStorage.removeItem('mensajeria')
      mensajeria.value = null
    }
  }

  return {
    user,
    userName,
    login,
    logout,
    isLoggedIn,
    isAdmin,
    isPaqueteria,
    tieneMensajeria,
    setMensajeria
  }
}