<template>
  <!-- ── Imagen ─────────────────────────────────────────────────── -->
  <div v-if="adjunto.imagen" class="adj-img" :style="marco">
    <img
      v-if="estado.url"
      :src="estado.url"
      :alt="adjunto.nombre"
      class="adj-img__foto"
      @click="$emit('ampliar', adjunto)"
    />

    <div v-else-if="estado.error" class="adj-img__hueco">
      <span>No se pudo cargar la imagen</span>
    </div>

    <div v-else class="adj-img__hueco adj-img__hueco--carga">
      <div class="spinner"></div>
    </div>
  </div>

  <!-- ── Archivo ────────────────────────────────────────────────── -->
  <button v-else class="adj-file" :disabled="bajando" @click="bajar">
    <span class="adj-file__icono">{{ icono }}</span>
    <span class="adj-file__datos">
      <span class="adj-file__nombre">{{ adjunto.nombre }}</span>
      <span class="adj-file__peso">{{ pesoLegible(adjunto.tamano) }}</span>
    </span>
    <span class="adj-file__accion">{{ bajando ? '…' : '↓' }}</span>
  </button>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAdjuntos, pesoLegible } from '@/composables/useAdjuntos'

const props = defineProps({
  adjunto: { type: Object, required: true },
})

defineEmits(['ampliar'])

const { cargar, descargar } = useAdjuntos()

const estado = ref({ url: null, cargando: false, error: false })
const bajando = ref(false)

/**
 * Marco con la proporción real de la imagen antes de que cargue.
 *
 * Es lo que evita que el hilo salte: sin reservar el lugar, cada foto que
 * termina de bajar empuja los mensajes de abajo y te mueve el texto que estabas
 * leyendo. El ancho y el alto vienen del backend justamente para esto.
 */
const marco = computed(() => {
  const { ancho, alto } = props.adjunto

  if (!ancho || !alto) return {}

  const anchoMostrado = Math.min(ancho, 320)
  const altoMostrado = Math.round((alto / ancho) * anchoMostrado)

  return { width: anchoMostrado + 'px', height: altoMostrado + 'px' }
})

const icono = computed(() => {
  const m = props.adjunto.mime || ''

  if (m.includes('pdf')) return '📄'
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv')) return '📊'
  if (m.includes('word') || m.includes('document')) return '📝'

  return '📎'
})

async function bajar() {
  bajando.value = true
  try {
    await descargar(props.adjunto.id, props.adjunto.nombre)
  } catch (e) {
    // Sin cartel: el botón vuelve a habilitarse y se puede reintentar.
  } finally {
    bajando.value = false
  }
}

onMounted(() => {
  if (props.adjunto.imagen) {
    estado.value = cargar(props.adjunto.id)
  }
})
</script>

<style scoped>
.adj-img {
  margin-top: 5px;
  max-width: 320px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--m-borde);
  background: var(--m-panel);
}

.adj-img__foto {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: zoom-in;
}

.adj-img__hueco {
  width: 100%;
  height: 100%;
  min-height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--m-texto-debil);
  text-align: center;
  padding: 8px;
}

.adj-file {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 5px;
  width: 100%;
  max-width: 320px;
  background: var(--m-panel-alto);
  border: 1px solid var(--m-borde);
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--m-texto-suave);
}

.adj-file:hover {
  border-color: var(--m-acento);
}

.adj-file:disabled {
  opacity: 0.6;
  cursor: default;
}

.adj-file__icono {
  font-size: 18px;
  flex: 0 0 auto;
}

.adj-file__datos {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.adj-file__nombre {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.adj-file__peso {
  font-size: 10px;
  color: var(--m-texto-debil);
}

.adj-file__accion {
  flex: 0 0 auto;
  font-size: 14px;
  color: var(--m-texto-debil);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--m-borde);
  border-top-color: var(--m-acento);
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}
</style>
