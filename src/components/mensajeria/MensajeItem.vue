<template>
  <!-- Aviso generado por la app: centrado y discreto, no es de nadie. -->
  <div v-if="mensaje.tipo === 'sistema'" class="sistema">
    <span>{{ mensaje.cuerpo }}</span>
  </div>

  <div
    v-else
    :class="['msg', { 'msg--agrupado': !mostrarCabecera, 'msg--pendiente': mensaje.pendiente, 'msg--fallo': mensaje.fallo }]"
  >
    <!-- El avatar sólo aparece en el primer mensaje de la tanda; en los
         siguientes va un hueco del mismo ancho para que el texto no se corra. -->
    <div class="msg__avatar">
      <div v-if="mostrarCabecera" class="avatar" :style="{ background: colorAvatar }">
        {{ iniciales }}
      </div>
      <span v-else class="msg__hora-hover">{{ hora }}</span>
    </div>

    <div class="msg__cuerpo">
      <div v-if="mostrarCabecera" class="msg__cabecera">
        <span class="msg__autor">{{ nombreAutor }}</span>
        <span class="msg__hora">{{ hora }}</span>
      </div>

      <!-- Lápida: el backend no manda el texto, así que acá no hay nada que ocultar. -->
      <p v-if="mensaje.eliminado" class="msg__eliminado">Mensaje eliminado</p>

      <template v-else-if="editando">
        <textarea
          ref="areaEdicion"
          v-model="borrador"
          class="msg__editor"
          rows="2"
          @keydown.enter.exact.prevent="confirmarEdicion"
          @keydown.esc="cancelarEdicion"
        ></textarea>
        <div class="msg__editor-acciones">
          <button class="mini" @click="confirmarEdicion">Guardar</button>
          <button class="mini mini--plano" @click="cancelarEdicion">Cancelar</button>
          <span class="msg__ayuda">Enter guarda · Esc cancela</span>
        </div>
      </template>

      <template v-else>
        <!-- Un mensaje puede ser sólo una foto, sin texto: de ahí el v-if. -->
        <p v-if="mensaje.cuerpo" class="msg__texto">{{ mensaje.cuerpo }}</p>
        <span v-if="mensaje.editado" class="msg__editado">(editado)</span>

        <!-- Adjuntos ya confirmados por el servidor -->
        <div v-if="mensaje.adjuntos?.length" class="msg__adjuntos">
          <MensajeAdjunto
            v-for="a in mensaje.adjuntos"
            :key="a.id"
            :adjunto="a"
            @ampliar="$emit('ampliar', $event)"
          />
        </div>

        <!--
          Vista previa local mientras el mensaje está en vuelo. Son los mismos
          archivos que el usuario acaba de elegir, así que se ven al instante sin
          esperar al servidor: es lo que hace que adjuntar una foto no se sienta
          como que la app se colgó.
        -->
        <div v-if="mensaje.previas?.length" class="msg__adjuntos">
          <div v-for="(p, i) in mensaje.previas" :key="i" class="msg__previa">
            <img v-if="p.url" :src="p.url" :alt="p.nombre" class="msg__previa-img" />
            <span v-else class="msg__previa-file">📎 {{ p.nombre }}</span>
          </div>
        </div>
      </template>

      <!-- Envío fallido: el texto NO se pierde, queda para reintentar. -->
      <div v-if="mensaje.fallo" class="msg__fallo">
        <span>{{ mensaje.motivo || 'No se pudo enviar.' }}</span>
        <button class="mini" @click="$emit('reintentar', mensaje.id)">Reintentar</button>
        <button class="mini mini--plano" @click="$emit('descartar', mensaje.id)">Descartar</button>
      </div>

      <span v-else-if="mensaje.pendiente" class="msg__pendiente">Enviando…</span>
    </div>

    <!-- Acciones sobre mensajes propios. Aparecen al pasar el mouse; en touch
         quedan siempre visibles porque no hay hover. -->
    <div v-if="puedeModificar && !editando && !mensaje.pendiente" class="msg__acciones">
      <button class="icono" title="Editar" @click="empezarEdicion">✎</button>
      <button class="icono" title="Eliminar" @click="$emit('borrar', mensaje.id)">🗑</button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import MensajeAdjunto from './MensajeAdjunto.vue'

const props = defineProps({
  mensaje: { type: Object, required: true },
  nombreAutor: { type: String, default: 'Alguien' },
  mostrarCabecera: { type: Boolean, default: true },
  puedeModificar: { type: Boolean, default: false },
})

const emit = defineEmits(['editar', 'borrar', 'reintentar', 'descartar', 'ampliar'])

const editando = ref(false)
const borrador = ref('')
const areaEdicion = ref(null)

const hora = computed(() => {
  if (!props.mensaje.created_at) return ''
  return new Date(props.mensaje.created_at).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
})

const iniciales = computed(() => {
  const partes = (props.nombreAutor || '?').trim().split(/\s+/).slice(0, 2)
  return partes.map((p) => p.charAt(0).toUpperCase()).join('') || '?'
})

/**
 * Color del avatar derivado del nombre.
 *
 * Determinista a propósito: la misma persona tiene siempre el mismo color, que es
 * lo que permite reconocerla de un vistazo sin leer el nombre. Con un color al
 * azar por render, el hilo parpadearía de colores en cada actualización.
 */
const colorAvatar = computed(() => {
  const nombre = props.nombreAutor || '?'
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h} 45% 38%), hsl(${(h + 28) % 360} 45% 26%))`
})

async function empezarEdicion() {
  borrador.value = props.mensaje.cuerpo || ''
  editando.value = true
  await nextTick()
  areaEdicion.value?.focus()
}

function cancelarEdicion() {
  editando.value = false
  borrador.value = ''
}

function confirmarEdicion() {
  const texto = borrador.value.trim()

  if (!texto || texto === props.mensaje.cuerpo) {
    cancelarEdicion()
    return
  }

  emit('editar', { id: props.mensaje.id, cuerpo: texto })
  editando.value = false
}
</script>

<style scoped>
.sistema {
  text-align: center;
  margin: 10px 0;
  font-size: 12px;
  color: var(--m-texto-debil);
}

.sistema span {
  background: var(--m-panel);
  border: 1px solid var(--m-borde);
  border-radius: 999px;
  padding: 3px 12px;
}

.msg {
  display: flex;
  gap: 10px;
  padding: 4px 16px;
  position: relative;
}

.msg:hover {
  background: var(--m-hover);
}

/* Mensajes consecutivos del mismo autor: sin avatar ni nombre repetidos. Es lo
   que hace que una conversación se lea como una conversación y no como una
   lista de fichas. */
.msg--agrupado {
  padding-top: 1px;
  padding-bottom: 1px;
}

.msg--pendiente {
  opacity: 0.55;
}

.msg--fallo {
  background: rgba(229, 83, 75, 0.08);
  border-left: 2px solid var(--m-error);
}

.msg__avatar {
  width: 36px;
  flex: 0 0 36px;
  display: flex;
  justify-content: center;
  padding-top: 2px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

/* La hora de los mensajes agrupados sólo se ve al pasar el mouse: tenerla
   siempre visible ensucia la columna. */
.msg__hora-hover {
  font-size: 10px;
  color: var(--m-texto-debil);
  opacity: 0;
  transition: opacity 0.12s;
  padding-top: 3px;
}

.msg:hover .msg__hora-hover {
  opacity: 1;
}

.msg__cuerpo {
  flex: 1;
  min-width: 0;
}

.msg__cabecera {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 1px;
}

.msg__autor {
  font-weight: 600;
  font-size: 14px;
  color: var(--m-texto);
}

.msg__hora {
  font-size: 11px;
  color: var(--m-texto-debil);
}

.msg__texto {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--m-texto-suave);
  /* pre-wrap conserva los saltos de línea que el usuario escribió con
     Shift+Enter, y break-word evita que una URL larga rompa el layout. */
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.msg__editado,
.msg__pendiente {
  font-size: 10px;
  color: var(--m-texto-debil);
  margin-left: 4px;
}

.msg__eliminado {
  margin: 0;
  font-size: 13px;
  font-style: italic;
  color: var(--m-texto-debil);
}

.msg__adjuntos {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.msg__previa {
  margin-top: 5px;
  max-width: 200px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px dashed var(--m-borde);
}

.msg__previa-img {
  display: block;
  width: 100%;
  opacity: 0.7;
}

.msg__previa-file {
  display: block;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--m-texto-debil);
}

.msg__editor {
  width: 100%;
  background: var(--m-fondo);
  border: 1px solid var(--m-acento);
  border-radius: 6px;
  color: var(--m-texto);
  font: inherit;
  font-size: 14px;
  padding: 8px;
  resize: vertical;
}

.msg__editor-acciones {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.msg__ayuda {
  font-size: 10px;
  color: var(--m-texto-debil);
}

.msg__fallo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
  font-size: 12px;
  color: var(--m-error);
}

.msg__acciones {
  position: absolute;
  top: -8px;
  right: 12px;
  display: none;
  gap: 2px;
  background: var(--m-panel);
  border: 1px solid var(--m-borde);
  border-radius: 6px;
  padding: 2px;
}

.msg:hover .msg__acciones {
  display: flex;
}

.icono {
  background: transparent;
  border: none;
  color: var(--m-texto-debil);
  cursor: pointer;
  font-size: 13px;
  padding: 3px 6px;
  border-radius: 4px;
  line-height: 1;
}

.icono:hover {
  background: var(--m-hover);
  color: var(--m-texto);
}

.mini {
  background: var(--m-acento);
  border: none;
  color: #06220f;
  font-weight: 600;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 5px;
  cursor: pointer;
}

.mini--plano {
  background: transparent;
  border: 1px solid var(--m-borde);
  color: var(--m-texto-debil);
  font-weight: 500;
}

/* Sin hover (celular/tablet): las acciones quedan visibles, porque si no no hay
   forma de llegar a ellas. */
@media (hover: none) {
  .msg__acciones {
    display: flex;
    position: static;
    background: transparent;
    border: none;
    align-self: flex-start;
  }

  .msg__hora-hover {
    opacity: 1;
  }
}
</style>
