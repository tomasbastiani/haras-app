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
