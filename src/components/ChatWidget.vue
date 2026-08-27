<template>
  <!-- Solo para propietarios logueados -->
  <div v-if="user" class="chat-widget">
    <!-- Panel -->
    <transition name="chat-pop">
      <div v-if="abierto" class="chat-panel" role="dialog" aria-label="Asistente de reclamos">
        <header class="chat-header">
          <div class="chat-header-icon">
            <v-icon color="white" size="20">mdi-headset</v-icon>
          </div>
          <div class="chat-header-text">
            <div class="chat-title">Asistente de reclamos</div>
            <div class="chat-subtitle">Contame qué pasó y lo derivo</div>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            class="chat-header-btn"
            title="Empezar de nuevo"
            @click="reiniciar"
          >
            <v-icon color="white" size="20">mdi-refresh</v-icon>
          </v-btn>
          <v-btn
            icon
            variant="text"
            size="small"
            class="chat-header-btn"
            title="Cerrar"
            @click="abierto = false"
          >
            <v-icon color="white" size="20">mdi-close</v-icon>
          </v-btn>
        </header>

        <div ref="scroller" class="chat-body">
          <div v-if="!mensajes.length && !cargando" class="chat-intro">
            <v-icon color="#27ae60" size="34">mdi-message-text-outline</v-icon>
            <p class="chat-intro-title">¿Tenés un reclamo?</p>
            <p class="chat-intro-text">
              Escribime qué pasó y a dónde. Te hago un par de preguntas y lo derivo
              al área que corresponde.
            </p>
            <div class="chat-chips">
              <button
                v-for="ejemplo in ejemplos"
                :key="ejemplo"
                class="chat-chip"
                @click="enviar(ejemplo)"
              >
                {{ ejemplo }}
              </button>
            </div>
          </div>

          <div
            v-for="(m, i) in mensajes"
            :key="i"
            class="chat-msg"
            :class="m.rol === 'user' ? 'chat-msg-user' : 'chat-msg-bot'"
          >
            <div class="chat-bubble">{{ m.texto }}</div>
          </div>

          <div v-if="cargando" class="chat-msg chat-msg-bot">
            <div class="chat-bubble chat-typing">
              <span></span><span></span><span></span>
            </div>
          </div>

          <div v-if="ultimoReclamo" class="chat-ticket">
            <v-icon color="#27ae60" size="18" class="mr-2">mdi-check-circle</v-icon>
            Reclamo <strong>#{{ ultimoReclamo.id }}</strong> derivado a
            {{ ultimoReclamo.derivado_a }}
          </div>
        </div>

        <footer class="chat-footer">
          <textarea
            ref="input"
            v-model="borrador"
            class="chat-input"
            rows="1"
            placeholder="Escribí tu mensaje..."
            :disabled="cargando"
            @keydown.enter.exact.prevent="enviar()"
            @input="autoAlto"
          ></textarea>
          <button
            class="chat-send"
            :disabled="cargando || !borrador.trim()"
            title="Enviar"
            @click="enviar()"
          >
            <v-icon size="20">mdi-send</v-icon>
          </button>
        </footer>
      </div>
    </transition>

    <!-- Botón flotante -->
    <button
      class="chat-fab"
      :class="{ 'chat-fab-abierto': abierto }"
      :aria-label="abierto ? 'Cerrar asistente' : 'Abrir asistente de reclamos'"
      @click="alternar"
    >
      <v-icon color="white" size="26">
        {{ abierto ? 'mdi-close' : 'mdi-chat-processing' }}
      </v-icon>
    </button>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue';
import api from '@/axios';
import { useAuth } from '@/composables/useAuth';

const { user } = useAuth();

const abierto = ref(false);
const cargando = ref(false);
const borrador = ref('');
const mensajes = ref([]);
const ultimoReclamo = ref(null);
const historialCargado = ref(false);
const scroller = ref(null);
const input = ref(null);

const ejemplos = [
  'No anda una luz de la calle',
  'Hay una pérdida de agua',
  'Ruidos molestos',
];

function alternar() {
  abierto.value = !abierto.value;
}

watch(abierto, async (estaAbierto) => {
  if (!estaAbierto) return;

  if (!historialCargado.value) {
    await cargarHistorial();
  }

  await nextTick();
  bajar();
  input.value?.focus();
});

async function cargarHistorial() {
  try {
    const { data } = await api.get('/chat/historial');
    mensajes.value = data.mensajes || [];
  } catch (e) {
    // Sin historial no se rompe nada: se arranca una conversación nueva.
    mensajes.value = [];
  } finally {
    historialCargado.value = true;
  }
}

async function enviar(texto) {
  const contenido = (texto ?? borrador.value).trim();
  if (!contenido || cargando.value) return;

  mensajes.value.push({ rol: 'user', texto: contenido });
  borrador.value = '';
  resetAlto();
  cargando.value = true;
  await nextTick();
  bajar();

  try {
    const { data } = await api.post('/chat/mensaje', { mensaje: contenido });

    mensajes.value.push({ rol: 'bot', texto: data.respuesta });

    if (data.reclamo) {
      ultimoReclamo.value = data.reclamo;
    }
  } catch (e) {
    mensajes.value.push({
      rol: 'bot',
      texto:
        e.response?.data?.respuesta ||
        'No pude conectarme con el asistente. Probá de nuevo en un momento.',
    });
  } finally {
    cargando.value = false;
    await nextTick();
    bajar();
    input.value?.focus();
  }
}

async function reiniciar() {
  try {
    await api.post('/chat/reiniciar');
  } catch (e) {
    // Si falla la baja en el backend igual limpiamos la vista: el timeout
    // de inactividad termina cerrando la conversación vieja.
  }

  mensajes.value = [];
  ultimoReclamo.value = null;
  borrador.value = '';
  resetAlto();
  input.value?.focus();
}

function bajar() {
  if (scroller.value) {
    scroller.value.scrollTop = scroller.value.scrollHeight;
  }
}

function autoAlto(e) {
  e.target.style.height = 'auto';
  e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`;
}

function resetAlto() {
  if (input.value) {
    input.value.style.height = 'auto';
  }
}
</script>

<style scoped>
.chat-widget {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2000;
  font-family: 'Oswald', sans-serif;
}

/* --- Botón flotante --- */
.chat-fab {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: #27ae60;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  transition: transform 0.18s ease, background 0.18s ease;
}

.chat-fab:hover {
  transform: scale(1.06);
}

.chat-fab-abierto {
  background: #2c3e50;
}

/* --- Panel --- */
.chat-panel {
  width: 370px;
  height: 540px;
  max-height: calc(100vh - 120px);
  margin-bottom: 14px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  background: #2c3e50;
  color: #fff;
  padding: 12px 8px 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-header-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #27ae60;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chat-header-text {
  flex: 1;
  min-width: 0;
}

.chat-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
}

.chat-subtitle {
  font-size: 11.5px;
  opacity: 0.75;
  line-height: 1.2;
}

.chat-header-btn {
  flex-shrink: 0;
}

/* --- Cuerpo --- */
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 14px;
  background: #f5f7f6;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-intro {
  text-align: center;
  padding: 18px 10px;
  color: #2c3e50;
}

.chat-intro-title {
  font-size: 16px;
  font-weight: 600;
  margin: 10px 0 4px;
}

.chat-intro-text {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  margin: 0 0 14px;
}

.chat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.chat-chip {
  background: #fff;
  border: 1px solid #d7dee2;
  color: #2c3e50;
  border-radius: 14px;
  padding: 6px 11px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.chat-chip:hover {
  border-color: #27ae60;
  color: #27ae60;
}

.chat-msg {
  display: flex;
  max-width: 85%;
}

.chat-msg-user {
  align-self: flex-end;
  justify-content: flex-end;
}

.chat-msg-bot {
  align-self: flex-start;
}

.chat-bubble {
  padding: 9px 13px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-msg-user .chat-bubble {
  background: #27ae60;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.chat-msg-bot .chat-bubble {
  background: #fff;
  color: #1a2733;
  border: 1px solid #e5e9ec;
  border-bottom-left-radius: 4px;
}

.chat-ticket {
  display: flex;
  align-items: center;
  background: #f0f7f4;
  border: 1px solid #27ae60;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 12.5px;
  color: #2c3e50;
}

/* Indicador de "escribiendo" */
.chat-typing {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 13px;
}

.chat-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9aa5ad;
  animation: chat-blink 1.3s infinite;
}

.chat-typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.chat-typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes chat-blink {
  0%, 60%, 100% { opacity: 0.25; }
  30% { opacity: 1; }
}

/* --- Footer --- */
.chat-footer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px;
  background: #fff;
  border-top: 1px solid #e5e9ec;
}

.chat-input {
  flex: 1;
  resize: none;
  border: 1px solid #d7dee2;
  border-radius: 18px;
  padding: 9px 13px;
  font-size: 13.5px;
  font-family: inherit;
  line-height: 1.4;
  max-height: 110px;
  outline: none;
  color: #111;
  background: #fff;
}

.chat-input:focus {
  border-color: #27ae60;
}

.chat-send {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: #27ae60;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.15s ease;
}

.chat-send:disabled {
  opacity: 0.4;
  cursor: default;
}

/* --- Animación --- */
.chat-pop-enter-active,
.chat-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
  transform-origin: bottom right;
}

.chat-pop-enter-from,
.chat-pop-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(10px);
}

/* --- Mobile: pantalla completa --- */
@media (max-width: 480px) {
  .chat-widget {
    right: 14px;
    bottom: 14px;
  }

  .chat-panel {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    max-height: 100%;
    margin: 0;
    border-radius: 0;
  }

  .chat-fab {
    width: 54px;
    height: 54px;
  }
}
</style>
