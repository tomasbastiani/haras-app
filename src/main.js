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

// 👉 Crear instancia de Vuetify
const vuetify = createVuetify({
  components,
  directives,
})

// 👉 Crear app y usar router + vuetify
const app = createApp(App)
app.use(router)
app.use(vuetify)
app.mount('#app')
