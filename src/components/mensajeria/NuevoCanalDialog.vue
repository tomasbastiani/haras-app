<template>
  <div class="modal" @click.self="$emit('cerrar')">
    <div class="modal__caja" role="dialog" aria-modal="true">
      <header class="modal__header">
        <h3>{{ titulo }}</h3>
        <button class="icono" @click="$emit('cerrar')">✕</button>
      </header>

      <div class="modal__cuerpo">
        <p v-if="errorMsg" class="alerta">{{ errorMsg }}</p>

        <!--
          Modo directo: un clic y listo. Sin checkboxes ni botón de confirmar,
          porque un chat privado es con una sola persona y pedir dos pasos para
          eso es puro trámite.
        -->
        <template v-if="modo === 'directo'">
          <label class="campo">
            <span class="campo__label">Buscar persona</span>
            <input
              ref="inputBusqueda"
              v-model="busqueda"
              type="search"
              class="campo__input"
              placeholder="Nombre o puesto…"
            />
          </label>

          <ul class="gente">
            <li v-for="p in candidatosFiltrados" :key="p.user_id">
              <button class="persona persona--click" @click="elegirDirecto(p)">
                <span :class="['punto', { 'punto--on': p.en_linea }]"></span>
                <span class="persona__nombre">{{ p.nombre }}</span>
                <span v-if="p.puesto" class="persona__puesto">{{ p.puesto }}</span>
                <span class="persona__flecha">›</span>
              </button>
            </li>

            <li v-if="!candidatosFiltrados.length" class="gente__vacio">
              {{ busqueda
                ? 'Nadie coincide con esa búsqueda.'
                : 'No hay nadie más habilitado en la mensajería.' }}
            </li>
          </ul>
        </template>

        <template v-if="modo === 'crear'">
          <label class="campo">
            <span class="campo__label">Nombre del canal</span>
            <input
              ref="inputNombre"
              v-model="nombre"
              type="text"
              class="campo__input"
              maxlength="80"
              placeholder="turno-noche"
            />
          </label>

          <label class="campo">
            <span class="campo__label">Para qué es <span class="opt">(opcional)</span></span>
            <input
              v-model="descripcion"
              type="text"
              class="campo__input"
              maxlength="255"
              placeholder="Coordinación del turno de la noche"
            />
          </label>
        </template>

        <div v-if="modo !== 'directo'" class="campo">
          <span class="campo__label">
            Integrantes
            <span v-if="seleccionados.length" class="contador">{{ seleccionados.length }} elegidos</span>
          </span>

          <input
            v-model="busqueda"
            type="search"
            class="campo__input"
            placeholder="Buscar por nombre o puesto…"
          />

          <ul class="gente">
            <li v-for="p in candidatosFiltrados" :key="p.user_id">
              <label class="persona">
                <input
                  type="checkbox"
                  :value="p.user_id"
                  :checked="seleccionados.includes(p.user_id)"
                  @change="alternar(p.user_id)"
                />
                <span :class="['punto', { 'punto--on': p.en_linea }]"></span>
                <span class="persona__nombre">{{ p.nombre }}</span>
                <span v-if="p.puesto" class="persona__puesto">{{ p.puesto }}</span>
              </label>
            </li>

            <li v-if="!candidatosFiltrados.length" class="gente__vacio">
              {{ busqueda
                ? 'Nadie coincide con esa búsqueda.'
                : 'No hay más gente habilitada para agregar.' }}
            </li>
          </ul>
        </div>
      </div>

      <footer class="modal__footer">
        <button class="btn btn--plano" @click="$emit('cerrar')">
          {{ modo === 'directo' ? 'Cerrar' : 'Cancelar' }}
        </button>
        <button v-if="modo !== 'directo'" class="btn" :disabled="!valido || guardando" @click="confirmar">
          {{ guardando ? 'Guardando…' : (modo === 'crear' ? 'Crear canal' : 'Agregar') }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'

const props = defineProps({
  modo: { type: String, default: 'crear' }, // 'crear' | 'agregar' | 'directo'
  directorio: { type: Array, default: () => [] },
  miUserId: { type: Number, default: null },
  // En modo 'agregar': quiénes ya están, para no ofrecerlos de nuevo.
  yaEnCanal: { type: Array, default: () => [] },
})

const emit = defineEmits(['cerrar', 'confirmar'])

const nombre = ref('')
const descripcion = ref('')
const busqueda = ref('')
const seleccionados = ref([])
const guardando = ref(false)
const errorMsg = ref('')
const inputNombre = ref(null)
const inputBusqueda = ref(null)

const titulo = computed(() => {
  if (props.modo === 'directo') return 'Nuevo mensaje'
  if (props.modo === 'agregar') return 'Agregar integrantes'
  return 'Nuevo canal'
})

/** Modo directo: se elige a una persona y se abre la conversación, sin más pasos. */
function elegirDirecto(persona) {
  guardando.value = true
  errorMsg.value = ''
  emit('confirmar', { userId: persona.user_id })
}

const candidatos = computed(() =>
  props.directorio.filter(
    (p) => p.user_id !== props.miUserId && !props.yaEnCanal.includes(p.user_id)
  )
)

const candidatosFiltrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase()
  if (!q) return candidatos.value

  return candidatos.value.filter(
    (p) =>
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.puesto || '').toLowerCase().includes(q)
  )
})

const valido = computed(() => {
  if (props.modo === 'crear') return nombre.value.trim().length >= 2
  return seleccionados.value.length > 0
})

function alternar(userId) {
  const i = seleccionados.value.indexOf(userId)
  if (i === -1) seleccionados.value.push(userId)
  else seleccionados.value.splice(i, 1)
}

/**
 * Avisa al padre y queda en estado "guardando".
 *
 * No espera nada acá: `emit` no devuelve promesa. El padre cierra el diálogo si
 * salió bien, o llama a mostrarError() si el backend rechazó —así el error se ve
 * sobre el formulario, con lo que la persona escribió todavía en pantalla.
 */
function confirmar() {
  if (!valido.value) return

  guardando.value = true
  errorMsg.value = ''

  emit('confirmar', {
    nombre: nombre.value.trim(),
    descripcion: descripcion.value.trim() || null,
    miembros: [...seleccionados.value],
  })
}

/** Mensaje de error que el padre puede empujar si el backend rechaza. */
function mostrarError(msg) {
  errorMsg.value = msg
  guardando.value = false
}

defineExpose({ mostrarError })

onMounted(() => {
  nextTick(() => (inputNombre.value || inputBusqueda.value)?.focus())
})
</script>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 50;
}

.modal__caja {
  background: var(--m-panel);
  border: 1px solid var(--m-borde);
  border-radius: 12px;
  width: 100%;
  max-width: 440px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--m-borde);
}

.modal__header h3 {
  margin: 0;
  font-size: 15px;
  color: var(--m-texto);
}

.modal__cuerpo {
  padding: 14px 16px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--m-borde);
}

.campo {
  display: block;
  margin-bottom: 14px;
}

.campo__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--m-texto-debil);
  margin-bottom: 5px;
  font-weight: 600;
}

.opt,
.contador {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
  opacity: 0.75;
}

.campo__input {
  width: 100%;
  background: var(--m-fondo);
  border: 1px solid var(--m-borde);
  border-radius: 8px;
  color: var(--m-texto);
  font: inherit;
  /* 16px: abajo de eso iOS hace zoom al enfocar. */
  font-size: 16px;
  padding: 8px 10px;
  outline: none;
}

.campo__input:focus {
  border-color: var(--m-acento);
}

.campo__input::placeholder {
  color: var(--m-texto-debil);
}

.gente {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  max-height: 210px;
  overflow-y: auto;
  border: 1px solid var(--m-borde);
  border-radius: 8px;
}

.persona {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  font-size: 13px;
  color: var(--m-texto-suave);
  cursor: pointer;
}

.persona:hover {
  background: var(--m-hover);
}

/* Modo directo: la fila entera es el botón. */
.persona--click {
  width: 100%;
  background: transparent;
  border: none;
  font: inherit;
  text-align: left;
  color: var(--m-texto-suave);
}

.persona--click + .persona--click {
  border-top: 1px solid var(--m-borde);
}

.persona__flecha {
  margin-left: auto;
  color: var(--m-texto-debil);
  font-size: 15px;
}

.persona__nombre {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.persona__puesto {
  font-size: 10px;
  color: var(--m-texto-debil);
}

.gente__vacio {
  padding: 12px 10px;
  font-size: 12px;
  color: var(--m-texto-debil);
}

.punto {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--m-borde);
  flex: 0 0 auto;
}

.punto--on {
  background: var(--m-ok);
}

.alerta {
  background: rgba(229, 83, 75, 0.12);
  border: 1px solid rgba(229, 83, 75, 0.3);
  color: #ff9d96;
  font-size: 12px;
  border-radius: 8px;
  padding: 8px 10px;
  margin: 0 0 12px;
}

.btn {
  background: var(--m-acento);
  border: none;
  border-radius: 8px;
  color: #06220f;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.btn--plano {
  background: transparent;
  border: 1px solid var(--m-borde);
  color: var(--m-texto-suave);
}

.icono {
  background: transparent;
  border: none;
  color: var(--m-texto-debil);
  cursor: pointer;
  font-size: 15px;
  padding: 4px 6px;
  border-radius: 6px;
}

.icono:hover {
  background: var(--m-hover);
  color: var(--m-texto);
}
</style>
