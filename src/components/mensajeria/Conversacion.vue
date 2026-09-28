<template>
  <section class="conv">
    <!-- ── Encabezado ─────────────────────────────────────────────── -->
    <header class="conv__header">
      <button class="conv__volver" title="Volver" @click="$emit('volver')">←</button>

      <div class="conv__titulo">
        <div class="conv__nombre">
          <span class="conv__icono">{{ canal.tipo === 'grupo' ? '#' : '' }}</span>
          <span v-if="canal.tipo === 'directo'" :class="['punto', { 'punto--on': contraparteEnLinea }]"></span>
          {{ canal.nombre }}
        </div>
        <div class="conv__sub">
          <template v-if="canal.tipo === 'grupo'">
            {{ canal.miembros.length }} {{ canal.miembros.length === 1 ? 'integrante' : 'integrantes' }}
            <template v-if="canal.descripcion"> · {{ canal.descripcion }}</template>
          </template>
          <template v-else>
            {{ contraparteEnLinea ? 'En línea' : puestoContraparte || 'Chat directo' }}
          </template>
        </div>
      </div>

      <div class="conv__acciones">
        <button
          v-if="!canal.supervision"
          class="icono"
          :title="canal.silenciado ? 'Reactivar avisos' : 'Silenciar'"
          @click="$emit('silenciar', !canal.silenciado)"
        >
          {{ canal.silenciado ? '🔕' : '🔔' }}
        </button>
        <button
          v-if="canal.tipo === 'grupo'"
          class="icono"
          title="Integrantes"
          @click="$emit('ver-miembros')"
        >
          ⓘ
        </button>
      </div>
    </header>

    <!-- Aviso para el admin que entra por supervisión y no participa. Sin esto,
         una caja de texto ausente parecería un bug. -->
    <div v-if="canal.supervision" class="conv__aviso">
      Estás viendo este canal como administrador. Podés leerlo, pero no escribir.
      Los chats directos entre empleados no son visibles para nadie más.
    </div>

    <!-- ── Hilo ───────────────────────────────────────────────────── -->
    <div ref="scroller" class="conv__hilo" @scroll="alScrollear">
      <!-- El margin-top:auto de .conv__stream es lo que empuja los mensajes al
           fondo cuando son pocos. Se hace así y no con justify-content:flex-end
           en el contenedor con scroll, porque eso deja el contenido de arriba
           inalcanzable al scrollear en varios navegadores. -->
      <div class="conv__stream">
        <div v-if="hilo.cargando && !hilo.lista.length" class="conv__estado">Cargando…</div>

        <button v-else-if="hilo.hayMas" class="conv__mas" @click="$emit('cargar-mas')">
          {{ hilo.cargando ? 'Cargando…' : 'Ver mensajes anteriores' }}
        </button>

        <div v-else-if="hilo.cargado && !hilo.lista.length" class="conv__vacio">
          <p class="conv__vacio-titulo">Todavía no hay mensajes</p>
          <p class="conv__vacio-texto">
            {{ canal.tipo === 'grupo'
              ? 'Escribí el primero para arrancar la conversación del canal.'
              : 'Escribile para arrancar la conversación.' }}
          </p>
        </div>

        <template v-for="item in items" :key="item.mensaje.id">
          <div v-if="item.separadorDia" class="separador">
            <span>{{ item.separadorDia }}</span>
          </div>

          <div v-if="item.primerNoLeido" class="separador separador--nuevos">
            <span>Mensajes nuevos</span>
          </div>

          <MensajeItem
            :mensaje="item.mensaje"
            :nombre-autor="nombreDeAutor(item.mensaje.user_id)"
            :mostrar-cabecera="item.mostrarCabecera"
            :puede-modificar="esMio(item.mensaje) && !item.mensaje.eliminado"
            @editar="$emit('editar', $event)"
            @borrar="$emit('borrar', $event)"
            @reintentar="$emit('reintentar', $event)"
            @descartar="$emit('descartar', $event)"
            @ampliar="$emit('ampliar', $event)"
          />
        </template>
      </div>
    </div>

    <!-- Aparece sólo si el usuario se fue para arriba: si no, es ruido. -->
    <button v-if="!pegadoAbajo" class="conv__bajar" @click="irAlFinal(true)">
      ↓ Últimos mensajes
    </button>

    <!-- ── Composer ───────────────────────────────────────────────── -->
    <ComposerMensaje
      :canal-id="canal.id"
      :habilitado="puedeEscribir"
      :motivo-bloqueo="motivoBloqueo"
      :largo-max="largoMax"
      :max-archivos="limitesAdjuntos.max_por_mensaje"
      :max-kb="limitesAdjuntos.max_kb"
      :placeholder="canal.tipo === 'grupo' ? `Mensaje a #${canal.nombre}` : `Mensaje a ${canal.nombre}`"
      @enviar="$emit('enviar', $event)"
    />
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import MensajeItem from './MensajeItem.vue'
import ComposerMensaje from './ComposerMensaje.vue'

const props = defineProps({
  canal: { type: Object, required: true },
  hilo: { type: Object, required: true },
  miUserId: { type: Number, default: null },
  directorio: { type: Array, default: () => [] },
  nombreDeAutor: { type: Function, required: true },
  largoMax: { type: Number, default: 4000 },
  limitesAdjuntos: {
    type: Object,
    default: () => ({ max_kb: 8192, max_por_mensaje: 5 }),
  },
  // Cursor de lectura tomado ANTES de abrir el canal: es lo que ubica la línea
  // de "mensajes nuevos". Se recibe por prop porque al abrir el canal el cursor
  // ya se adelantó y el dato original se perdería.
  marcaNuevos: { type: Number, default: 0 },
})

defineEmits([
  'enviar', 'editar', 'borrar', 'reintentar', 'descartar', 'ampliar',
  'cargar-mas', 'volver', 'silenciar', 'ver-miembros',
])

const scroller = ref(null)
const pegadoAbajo = ref(true)

const puedeEscribir = computed(() => !props.canal.supervision && !props.canal.archivado)

const motivoBloqueo = computed(() => {
  if (props.canal.supervision) return 'Sólo lectura: no participás de este canal.'
  if (props.canal.archivado) return 'Este canal está archivado.'
  return 'No podés escribir en esta conversación.'
})

const fichaContraparte = computed(() =>
  props.directorio.find((m) => m.user_id === props.canal.contraparte_id)
)

const contraparteEnLinea = computed(() => !!fichaContraparte.value?.en_linea)
const puestoContraparte = computed(() => fichaContraparte.value?.puesto || '')

function esMio(m) {
  return m.user_id === props.miUserId
}

/** "Hoy" / "Ayer" / fecha, para el separador de días. */
function etiquetaDia(fecha) {
  const hoy = new Date()
  const ayer = new Date()
  ayer.setDate(hoy.getDate() - 1)

  const mismoDia = (a, b) => a.toDateString() === b.toDateString()

  if (mismoDia(fecha, hoy)) return 'Hoy'
  if (mismoDia(fecha, ayer)) return 'Ayer'

  return fecha.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/**
 * Prepara el hilo para pintarlo: separadores de día, agrupado por autor y la
 * línea de mensajes nuevos.
 *
 * Se agrupan los mensajes consecutivos del mismo autor dentro de 5 minutos. Es el
 * detalle que más cambia la lectura: sin eso, cinco mensajes cortos seguidos se
 * ven como cinco fichas con el mismo nombre y la misma foto repetidos.
 */
const items = computed(() => {
  const VENTANA_MS = 5 * 60 * 1000
  const salida = []
  let anterior = null
  let yaMarcoNuevos = false

  props.hilo.lista.forEach((mensaje) => {
    const fecha = mensaje.created_at ? new Date(mensaje.created_at) : new Date()
    const fechaAnterior = anterior?.created_at ? new Date(anterior.created_at) : null

    const cambioDeDia =
      !fechaAnterior || fechaAnterior.toDateString() !== fecha.toDateString()

    // Los avisos de sistema cortan la tanda: si no, el mensaje que viene después
    // de "X se sumó al canal" perdería el nombre del autor.
    const mostrarCabecera =
      mensaje.tipo === 'sistema' ||
      !anterior ||
      anterior.tipo === 'sistema' ||
      anterior.user_id !== mensaje.user_id ||
      cambioDeDia ||
      (fechaAnterior && fecha - fechaAnterior > VENTANA_MS)

    // Primer mensaje que el usuario no había leído, y que no sea propio.
    const primerNoLeido =
      !yaMarcoNuevos &&
      props.marcaNuevos > 0 &&
      typeof mensaje.id === 'number' &&
      mensaje.id > props.marcaNuevos &&
      mensaje.user_id !== props.miUserId

    if (primerNoLeido) yaMarcoNuevos = true

    salida.push({
      mensaje,
      mostrarCabecera,
      separadorDia: cambioDeDia ? etiquetaDia(fecha) : null,
      primerNoLeido,
    })

    anterior = mensaje
  })

  return salida
})

function alScrollear() {
  const el = scroller.value
  if (!el) return

  // 80px de tolerancia: con el ancla exacta, un scroll de un pixel haría
  // desaparecer el botón de "últimos mensajes" y cortaría el autoscroll.
  pegadoAbajo.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

function irAlFinal(suave = false) {
  const el = scroller.value
  if (!el) return

  el.scrollTo({ top: el.scrollHeight, behavior: suave ? 'smooth' : 'auto' })
  pegadoAbajo.value = true
}

/**
 * Autoscroll condicionado.
 *
 * Sólo baja si el usuario ya estaba abajo. Arrastrarlo al final mientras está
 * leyendo algo más arriba es la forma más rápida de volver inusable un chat
 * activo.
 */
watch(
  () => props.hilo.lista.length,
  (nuevo, viejo) => {
    if (nuevo > (viejo || 0) && pegadoAbajo.value) nextTick(() => irAlFinal())
  }
)

// Al cambiar de canal: al final, sin animación.
watch(
  () => props.canal.id,
  () => {
    pegadoAbajo.value = true
    nextTick(() => irAlFinal())
  },
  { immediate: true }
)

// Primera carga del historial de un canal recién abierto.
watch(
  () => props.hilo.cargado,
  (listo) => {
    if (listo && pegadoAbajo.value) nextTick(() => irAlFinal())
  }
)
</script>

<style scoped>
.conv {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--m-fondo);
  position: relative;
}

.conv__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--m-borde);
  background: var(--m-panel);
  flex: 0 0 auto;
}

/* El botón de volver es la navegación del panel doble en celular; en escritorio
   los dos paneles están a la vista y no hace falta. */
.conv__volver {
  display: none;
  background: transparent;
  border: none;
  color: var(--m-texto);
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
}

.conv__titulo {
  flex: 1;
  min-width: 0;
}

.conv__nombre {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--m-texto);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv__icono {
  color: var(--m-texto-debil);
}

.conv__sub {
  font-size: 11px;
  color: var(--m-texto-debil);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  box-shadow: 0 0 0 2px rgba(63, 185, 80, 0.18);
}

.conv__acciones {
  display: flex;
  gap: 2px;
}

.icono {
  background: transparent;
  border: none;
  color: var(--m-texto-debil);
  cursor: pointer;
  font-size: 15px;
  padding: 5px 7px;
  border-radius: 6px;
  line-height: 1;
}

.icono:hover {
  background: var(--m-hover);
  color: var(--m-texto);
}

.conv__aviso {
  background: rgba(227, 179, 65, 0.1);
  border-bottom: 1px solid rgba(227, 179, 65, 0.25);
  color: #e3b341;
  font-size: 12px;
  padding: 8px 16px;
  flex: 0 0 auto;
}

.conv__hilo {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
}

/* Con pocos mensajes quedan abajo, contra el composer, como en cualquier chat.
   Con muchos, el auto no hace nada y el scroll funciona normal. */
.conv__stream {
  margin-top: auto;
}

.conv__estado,
.conv__mas {
  text-align: center;
  font-size: 12px;
  color: var(--m-texto-debil);
  padding: 10px;
}

.conv__mas {
  background: transparent;
  border: none;
  cursor: pointer;
  text-decoration: underline;
}

.conv__vacio {
  text-align: center;
  padding: 28px 20px;
}

.conv__vacio-titulo {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--m-texto);
}

.conv__vacio-texto {
  margin: 0;
  font-size: 12px;
  color: var(--m-texto-debil);
}

.separador {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 16px 8px;
  font-size: 11px;
  color: var(--m-texto-debil);
}

.separador::before,
.separador::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--m-borde);
}

.separador span {
  text-transform: capitalize;
  white-space: nowrap;
}

/* La línea roja de "mensajes nuevos": el ancla que dice dónde quedaste. */
.separador--nuevos {
  color: var(--m-error);
  font-weight: 600;
}

.separador--nuevos::before,
.separador--nuevos::after {
  background: var(--m-error);
  opacity: 0.5;
}

.conv__bajar {
  position: absolute;
  bottom: 84px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--m-panel-alto);
  color: var(--m-texto);
  border: 1px solid var(--m-borde);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  z-index: 2;
}

@media (max-width: 860px) {
  .conv__volver {
    display: block;
  }
}
</style>
