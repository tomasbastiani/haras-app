<template>
  <div class="mcp-token">
    <div class="header">
      <button class="back-button" @click="router.push('/menu')">←</button>
      <h2>Asistente Claude</h2>
    </div>

    <p class="intro">
      Conectá Claude Desktop con el sistema para hacerle preguntas sobre lotes, morosos, reclamos,
      paquetes y envíos de mail. Es <strong>sólo de consulta</strong>: con este token no se puede
      modificar ni enviar nada.
    </p>

    <div class="spinner-container" v-if="cargando">
      <span class="spinner-grande"></span>
    </div>

    <template v-else>
      <div class="estado" :class="{ activo: estado.activo }">
        <template v-if="estado.activo">
          Token activo · vence el {{ fecha(estado.vence_at) }}
          <span v-if="estado.ultimo_uso_at"> · último uso {{ fecha(estado.ultimo_uso_at, true) }}</span>
        </template>
        <template v-else>No hay un token activo.</template>
      </div>

      <div v-if="tokenNuevo" class="token-nuevo">
        <p><strong>Copialo ahora:</strong> no se vuelve a mostrar. Pegalo en la configuración de la extensión de Claude Desktop.</p>
        <div class="token-fila">
          <code>{{ tokenNuevo }}</code>
          <button class="btn" @click="copiar">{{ copiado ? 'Copiado ✔' : 'Copiar' }}</button>
        </div>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>

      <div class="acciones">
        <button class="btn primario" :disabled="trabajando" @click="emitir">
          {{ estado.activo ? 'Generar uno nuevo (revoca el actual)' : 'Generar token' }}
        </button>
        <button v-if="estado.activo" class="btn peligro" :disabled="trabajando" @click="revocar">
          Revocar
        </button>
      </div>

      <p class="nota">
        Si perdés la PC o creés que el token se filtró, revocalo acá: deja de funcionar al instante.
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/axios'

const router = useRouter()

const estado = ref({ activo: false })
const tokenNuevo = ref('')
const cargando = ref(true)
const trabajando = ref(false)
const copiado = ref(false)
const error = ref('')

const fecha = (iso, conHora = false) =>
  iso ? new Date(iso).toLocaleString('es-AR', conHora ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'long' }) : ''

const cargar = async () => {
  try {
    estado.value = (await axios.get('/admin/mcp-token')).data
  } catch (e) {
    error.value = 'No se pudo consultar el estado del token.'
  } finally {
    cargando.value = false
  }
}

const emitir = async () => {
  if (estado.value.activo && !confirm('El token actual deja de funcionar. ¿Generar uno nuevo?')) return
  trabajando.value = true
  error.value = ''
  copiado.value = false
  try {
    const { data } = await axios.post('/admin/mcp-token')
    tokenNuevo.value = data.token
    await cargar()
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo generar el token.'
  } finally {
    trabajando.value = false
  }
}

const revocar = async () => {
  if (!confirm('Claude Desktop va a dejar de poder consultar el sistema. ¿Revocar?')) return
  trabajando.value = true
  error.value = ''
  try {
    estado.value = (await axios.delete('/admin/mcp-token')).data
    tokenNuevo.value = ''
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo revocar el token.'
  } finally {
    trabajando.value = false
  }
}

const copiar = async () => {
  try {
    await navigator.clipboard.writeText(tokenNuevo.value)
    copiado.value = true
  } catch {
    error.value = 'No se pudo copiar: seleccioná el texto y copialo a mano.'
  }
}

onMounted(cargar)
</script>

<style scoped>
.mcp-token {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 16px 40px;
  text-align: center;
}

.header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.header h2 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
}

.back-button {
  background: transparent;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #2c3e50;
}

.intro,
.nota {
  color: #555;
  line-height: 1.5;
}

.nota {
  font-size: 0.85rem;
  margin-top: 1.5rem;
}

.estado {
  margin: 1.5rem auto;
  padding: 0.8rem;
  border-radius: 8px;
  background: #f0f0f0;
  color: #555;
}

.estado.activo {
  background: #d1e7dd;
  color: #0f5132;
}

.token-nuevo {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeeba;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.token-fila {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.token-fila code {
  background: #fff;
  color: #111;
  padding: 0.5rem;
  border-radius: 6px;
  word-break: break-all;
  user-select: all;
}

.acciones {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: #e0e0e0;
}

.btn.primario {
  background: #27ae60;
  color: #fff;
}

.btn.peligro {
  background: #c0392b;
  color: #fff;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  background-color: #f8d7da;
  color: #842029;
  padding: 0.8rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.spinner-container {
  display: flex;
  justify-content: center;
}

.spinner-grande {
  border: 3px solid #fff;
  border-top: 3px solid #2c3e50;
  border-radius: 50%;
  width: 55px;
  height: 55px;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
