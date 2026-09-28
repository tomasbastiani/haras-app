import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 👉 Vuetify imports
import { createVuetify } from 'vuetify'
import 'vuetify/styles' // Vuetify base styles
import '@mdi/font/css/materialdesignicons.css' // Iconos opcionales (usados por Vuetify)

// 👉 Componentes y directivas de Vuetify
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

//SW
import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true,
  onRegistered(r) {
    // opcional: logs
    // console.log('Service Worker registrado', r)
  },
  onRegisterError(error) {
    console.error('Error al registrar el Service Worker', error)
  }
})

/**
 * Tema de la mensajería interna.
 *
 * Hasta ahora Vuetify se creaba sin ninguna config de theme, así que agregar
 * temas nombrados no puede cambiarle el aspecto a nada de lo que ya existe: el
 * resto de la app sigue corriendo con el tema por defecto, que acá se deja
 * declarado explícitamente como `light` para que siga siendo el default.
 *
 * El módulo del chat es el único que usa `mensajeria`, y lo aplica envolviéndose
 * en un <v-theme-provider>. Es oscuro a propósito —el pedido era que se sintiera
 * una app aparte— pero conserva el verde de marca como color de acento, así que
 * sigue leyéndose como la misma empresa y no como un sitio ajeno.
 */
const temaMensajeria = {
  dark: true,
  colors: {
    background: '#14161C',   // fondo del hilo
    surface: '#1B1F27',      // paneles, tarjetas, composer
    'surface-bright': '#242A35',
    'surface-variant': '#2C333F',
    primary: '#27AE60',      // verde de marca, ya usado en el resto de la app
    secondary: '#4DA3FF',    // links y menciones
    error: '#E5534B',
    warning: '#E3B341',
    success: '#3FB950',
    info: '#4DA3FF',
  },
  variables: {
    'border-color': '#2C333F',
  },
}

// 👉 Crear instancia de Vuetify
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      mensajeria: temaMensajeria,
    },
  },
})

// 👉 Crear app y usar router + vuetify
const app = createApp(App)
app.use(router)
app.use(vuetify)
app.mount('#app')
