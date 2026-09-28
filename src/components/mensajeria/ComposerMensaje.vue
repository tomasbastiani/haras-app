<template>
  <div class="composer">
    <!-- Motivo por el que no se puede escribir, en lugar de una caja inerte. -->
    <div v-if="!habilitado" class="composer__bloqueado">
      {{ motivoBloqueo }}
    </div>

    <template v-else>
      <!-- Cola de adjuntos elegidos, antes de enviar -->
      <div v-if="archivos.length" class="cola">
        <div v-for="(a, i) in archivos" :key="i" class="cola__item">
          <img v-if="a.previa" :src="a.previa" :alt="a.archivo.name" class="cola__img" />
          <span v-else class="cola__icono">📎</span>
          <span class="cola__nombre">{{ a.archivo.name }}</span>
          <span class="cola__peso">{{ pesoLegible(a.archivo.size) }}</span>
          <button class="cola__quitar" title="Quitar" @click="quitar(i)">✕</button>
        </div>
      </div>

      <p v-if="avisoArchivos" class="composer__aviso">{{ avisoArchivos }}</p>

      <div class="composer__caja">
        <button class="composer__clip" title="Adjuntar archivo" @click="abrirSelector">
          📎
        </button>

        <input
          ref="inputArchivo"
          type="file"
          multiple
          class="composer__file"
          :accept="accept"
          @change="alElegir"
        />

        <textarea
          ref="area"
          v-model="texto"
          class="composer__area"
          :placeholder="placeholder"
          :maxlength="largoMax"
          rows="1"
          @input="ajustarAlto"
          @keydown="alTeclear"
          @paste="alPegar"
        ></textarea>

        <button
          class="composer__enviar"
          :disabled="!puedeEnviar"
          title="Enviar (Enter)"
          @click="enviar"
        >
          ➤
        </button>
      </div>

      <div class="composer__pie">
        <span class="composer__ayuda">Enter envía · Shift+Enter salta de línea</span>
        <!-- El contador aparece sólo cerca del límite: tenerlo siempre a la
             vista sugiere un límite que en la práctica nadie roza. -->
        <span v-if="cerca" class="composer__contador">
          {{ texto.length }} / {{ largoMax }}
        </span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { pesoLegible } from '@/composables/useAdjuntos'

const props = defineProps({
  habilitado: { type: Boolean, default: true },
  motivoBloqueo: { type: String, default: 'No podés escribir en esta conversación.' },
  placeholder: { type: String, default: 'Escribí un mensaje…' },
  largoMax: { type: Number, default: 4000 },
  // Cambia al cambiar de canal: sirve para limpiar el borrador y reenfocar.
  canalId: { type: [Number, String], default: null },
  maxArchivos: { type: Number, default: 5 },
  maxKb: { type: Number, default: 8192 },
})

const emit = defineEmits(['enviar'])

const texto = ref('')
const area = ref(null)
const inputArchivo = ref(null)
// [{ archivo: File, previa: string|null }]
const archivos = ref([])
const avisoArchivos = ref('')

// Debe coincidir con la lista blanca de config/mensajeria.php. El backend valida
// igual: esto sólo evita que el selector de archivos ofrezca lo que va a ser
// rechazado.
const accept = 'image/jpeg,image/png,image/gif,image/webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx'

// Se puede enviar con texto O con archivos: un mensaje puede ser sólo una foto.
const puedeEnviar = computed(() => texto.value.trim().length > 0 || archivos.value.length > 0)
const cerca = computed(() => texto.value.length > props.largoMax * 0.8)

function abrirSelector() {
  inputArchivo.value?.click()
}

function alElegir(e) {
  agregar(Array.from(e.target.files || []))
  // Se limpia para que elegir el mismo archivo dos veces vuelva a disparar change.
  e.target.value = ''
}

/**
 * Pegar una imagen desde el portapapeles.
 *
 * Es el gesto que más se usa para mandar una captura de pantalla, y sin esto
 * habría que guardarla en un archivo primero. Sólo intercepta el paste cuando
 * hay imágenes: pegar texto sigue funcionando normal.
 */
function alPegar(e) {
  const items = Array.from(e.clipboardData?.items || [])
  const imagenes = items
    .filter((i) => i.kind === 'file' && i.type.startsWith('image/'))
    .map((i) => i.getAsFile())
    .filter(Boolean)

  if (!imagenes.length) return

  e.preventDefault()
  agregar(imagenes)
}

/** Valida contra los mismos límites del backend y arma las vistas previas. */
function agregar(nuevos) {
  avisoArchivos.value = ''

  for (const archivo of nuevos) {
    if (archivos.value.length >= props.maxArchivos) {
      avisoArchivos.value = `Como máximo ${props.maxArchivos} archivos por mensaje.`
      break
    }

    if (archivo.size > props.maxKb * 1024) {
      avisoArchivos.value = `"${archivo.name}" supera los ${Math.round(props.maxKb / 1024)} MB.`
      continue
    }

    archivos.value.push({
      archivo,
      // Object URL local para la vista previa. Se libera en quitar()/limpiar().
      previa: archivo.type.startsWith('image/') ? URL.createObjectURL(archivo) : null,
    })
  }
}

function quitar(i) {
  const [fuera] = archivos.value.splice(i, 1)
  if (fuera?.previa) URL.revokeObjectURL(fuera.previa)
}

function limpiarArchivos({ revocar = true } = {}) {
  if (revocar) {
    archivos.value.forEach((a) => a.previa && URL.revokeObjectURL(a.previa))
  }
  archivos.value = []
  avisoArchivos.value = ''
}

/**
 * Enter envía, Shift+Enter hace salto de línea.
 *
 * Es la convención de Slack/WhatsApp y la que la gente espera. Se excluye el
 * caso de composición (acentos, teclados predictivos): en medio de una tecla
 * muerta, Enter confirma el carácter y no tiene que enviar el mensaje.
 */
function alTeclear(e) {
  if (e.key !== 'Enter') return
  if (e.shiftKey || e.isComposing) return

  e.preventDefault()
  enviar()
}

function enviar() {
  const valor = texto.value.trim()
  if (!valor && !archivos.value.length) return

  emit('enviar', {
    cuerpo: valor,
    archivos: archivos.value.map((a) => a.archivo),
    // Las vistas previas viajan con el mensaje para poder mostrarlo mientras
    // está en vuelo. Se entregan SIN revocar: quien las revoca es el composable,
    // cuando el servidor confirma el mensaje (o cuando se descarta). Revocarlas
    // acá dejaría la previa en gris justo durante el envío, que es el único
    // momento en que sirve.
    previas: archivos.value.map((a) => ({ url: a.previa, nombre: a.archivo.name })),
  })

  texto.value = ''
  limpiarArchivos({ revocar: false })
  nextTick(ajustarAlto)
}

/** Textarea que crece con el contenido, hasta un tope. */
function ajustarAlto() {
  const el = area.value
  if (!el) return

  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function enfocar() {
  area.value?.focus()
}

// Al cambiar de canal el borrador no se arrastra: escribir medio mensaje en un
// canal y que aparezca en otro es de los errores más incómodos posibles.
watch(
  () => props.canalId,
  () => {
    texto.value = ''
    // Los adjuntos elegidos tampoco se arrastran de un canal a otro: mandar una
    // foto a la conversación equivocada no se puede deshacer.
    limpiarArchivos()
    nextTick(() => {
      ajustarAlto()
      // En pantallas táctiles no se enfoca solo: abriría el teclado y taparía
      // la conversación que la persona acaba de abrir para leer.
      if (window.matchMedia('(hover: hover)').matches) enfocar()
    })
  }
)

defineExpose({ enfocar })
</script>

<style scoped>
.composer {
  border-top: 1px solid var(--m-borde);
  background: var(--m-panel);
  padding: 10px 16px;
  /* Barra de gestos de iOS en PWA instalada: sin esto el input queda debajo y no
     se puede tocar. */
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  flex: 0 0 auto;
}

.cola {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.cola__item {
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--m-panel-alto);
  border: 1px solid var(--m-borde);
  border-radius: 8px;
  padding: 4px 6px 4px 4px;
  max-width: 230px;
}

.cola__img {
  width: 30px;
  height: 30px;
  border-radius: 5px;
  object-fit: cover;
  flex: 0 0 auto;
}

.cola__icono {
  width: 30px;
  text-align: center;
  font-size: 15px;
  flex: 0 0 auto;
}

.cola__nombre {
  font-size: 11px;
  color: var(--m-texto-suave);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.cola__peso {
  font-size: 10px;
  color: var(--m-texto-debil);
  flex: 0 0 auto;
}

.cola__quitar {
  background: transparent;
  border: none;
  color: var(--m-texto-debil);
  cursor: pointer;
  font-size: 11px;
  padding: 2px 3px;
  line-height: 1;
  flex: 0 0 auto;
}

.cola__quitar:hover {
  color: var(--m-error);
}

.composer__aviso {
  margin: 0 0 6px;
  font-size: 11px;
  color: var(--m-warning, #e3b341);
}

.composer__clip {
  flex: 0 0 auto;
  background: transparent;
  border: none;
  color: var(--m-texto-debil);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 2px;
  line-height: 1;
  align-self: flex-end;
}

.composer__clip:hover {
  color: var(--m-texto);
}

.composer__file {
  display: none;
}

.composer__caja {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--m-fondo);
  border: 1px solid var(--m-borde);
  border-radius: 10px;
  padding: 8px 8px 8px 12px;
}

.composer__caja:focus-within {
  border-color: var(--m-acento);
}

.composer__area {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: var(--m-texto);
  font: inherit;
  /* 16px real: abajo de eso, Safari en iOS hace zoom al enfocar el campo y
     descuadra toda la pantalla. */
  font-size: 16px;
  line-height: 1.4;
  max-height: 160px;
  overflow-y: auto;
}

.composer__area::placeholder {
  color: var(--m-texto-debil);
}

.composer__enviar {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: var(--m-acento);
  color: #06220f;
  font-size: 15px;
  cursor: pointer;
  transition: opacity 0.12s;
}

.composer__enviar:disabled {
  opacity: 0.3;
  cursor: default;
}

.composer__pie {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 5px;
  min-height: 13px;
}

.composer__ayuda,
.composer__contador {
  font-size: 10px;
  color: var(--m-texto-debil);
}

.composer__bloqueado {
  font-size: 13px;
  color: var(--m-texto-debil);
  text-align: center;
  padding: 10px 4px;
  font-style: italic;
}

/* La ayuda de teclado no aplica en touch y sólo ocupa lugar. */
@media (max-width: 860px) {
  .composer__ayuda {
    display: none;
  }
}
</style>
