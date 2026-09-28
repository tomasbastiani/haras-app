<template>
  <aside class="side">
    <header class="side__header">
      <div class="side__marca">
        <span class="side__logo">HSM</span>
        <div>
          <div class="side__titulo">Mensajería interna</div>
          <div class="side__yo">
            <span :class="['punto', 'punto--on']"></span>
            {{ yo?.nombre || '—' }}
            <span v-if="yo?.puesto" class="side__puesto">· {{ yo.puesto }}</span>
          </div>
        </div>
      </div>
      <button class="icono" title="Volver al menú de la app" @click="$emit('salir')">⎋</button>
    </header>

    <div class="side__buscador">
      <input
        v-model="filtro"
        type="search"
        class="side__input"
        placeholder="Buscar persona o canal…"
      />
    </div>

    <nav class="side__lista">
      <!-- ── Canales ────────────────────────────────────────────── -->
      <div v-if="gruposFiltrados.length" class="grupo">
        <div class="grupo__titulo">Canales</div>
        <button
          v-for="c in gruposFiltrados"
          :key="c.id"
          :class="filaClase(c)"
          @click="$emit('seleccionar', c.id)"
        >
          <span class="fila__icono">#</span>
          <span class="fila__nombre">{{ c.nombre }}</span>
          <span v-if="c.silenciado" class="fila__mudo">🔕</span>
          <span v-if="c.no_leidos" class="badge">{{ c.no_leidos > 99 ? '99+' : c.no_leidos }}</span>
        </button>
      </div>

      <!-- ── Directos ───────────────────────────────────────────── -->
      <div v-if="directosFiltrados.length" class="grupo">
        <div class="grupo__titulo">Mensajes directos</div>
        <button
          v-for="c in directosFiltrados"
          :key="c.id"
          :class="filaClase(c)"
          @click="$emit('seleccionar', c.id)"
        >
          <span :class="['punto', { 'punto--on': enLinea(c.contraparte_id) }]"></span>
          <span class="fila__nombre">{{ c.nombre }}</span>
          <span v-if="c.silenciado" class="fila__mudo">🔕</span>
          <span v-if="c.no_leidos" class="badge">{{ c.no_leidos > 99 ? '99+' : c.no_leidos }}</span>
        </button>
      </div>

      <!--
        ── Iniciar conversación ─────────────────────────────────────
        Gente del directorio con la que todavía no hay un chat abierto. Aparece
        al buscar, así que abrir una conversación nueva es escribir el nombre y
        tocar: no hace falta ir a buscar un botón de "nuevo mensaje".
      -->
      <div v-if="sinChatFiltrados.length" class="grupo">
        <div class="grupo__titulo">Iniciar conversación</div>
        <button
          v-for="m in sinChatFiltrados"
          :key="m.user_id"
          class="fila fila--tenue"
          @click="$emit('nuevo-directo', m.user_id)"
        >
          <span :class="['punto', { 'punto--on': m.en_linea }]"></span>
          <span class="fila__nombre">{{ m.nombre }}</span>
          <span v-if="m.puesto" class="fila__puesto">{{ m.puesto }}</span>
        </button>
      </div>

      <!--
        ── Supervisión ──────────────────────────────────────────────
        Sólo para admins, y sólo grupos. Va en su propia sección y no mezclada
        con los canales propios para que quede claro que es otra cosa: mirar el
        trabajo del equipo, no participar. Los chats directos no están acá ni
        pueden estarlo.
      -->
      <div v-if="supervisionFiltrados.length" class="grupo">
        <div class="grupo__titulo">
          Supervisión
          <span class="grupo__nota">sólo lectura</span>
        </div>
        <button
          v-for="c in supervisionFiltrados"
          :key="c.id"
          :class="filaClase(c)"
          @click="$emit('seleccionar', c.id)"
        >
          <span class="fila__icono">#</span>
          <span class="fila__nombre">{{ c.nombre }}</span>
          <span class="fila__ojo">👁</span>
        </button>
      </div>

      <!-- ── Archivados ─────────────────────────────────────────── -->
      <div v-if="archivadosFiltrados.length" class="grupo">
        <button class="grupo__titulo grupo__titulo--click" @click="verArchivados = !verArchivados">
          {{ verArchivados ? '▾' : '▸' }} Archivados ({{ archivadosFiltrados.length }})
        </button>
        <template v-if="verArchivados">
          <button
            v-for="c in archivadosFiltrados"
            :key="c.id"
            :class="filaClase(c)"
            @click="$emit('seleccionar', c.id)"
          >
            <span class="fila__icono">#</span>
            <span class="fila__nombre">{{ c.nombre }}</span>
          </button>
        </template>
      </div>

      <p v-if="nadaQueMostrar" class="side__vacio">
        {{ filtro
          ? 'Nada coincide con esa búsqueda.'
          : 'Todavía no tenés conversaciones. Tocá «Nuevo mensaje» abajo para escribirle a alguien.' }}
      </p>
    </nav>

    <footer class="side__footer">
      <!--
        El inicio de conversación también está en el buscador de arriba, pero esto
        es lo descubrible: sin un botón explícito, la única pista de cómo escribirle
        a alguien nuevo era una línea de texto en el estado vacío.
      -->
      <button class="btn" :disabled="!esMiembro" @click="$emit('nuevo-directo-dialogo')">
        + Nuevo mensaje
      </button>
      <button
        class="btn btn--plano"
        :disabled="!esMiembro"
        title="Crear un canal de grupo"
        @click="$emit('nuevo-grupo')"
      >
        # Canal
      </button>
      <button v-if="esAdmin" class="btn btn--plano" title="Administrar accesos" @click="$emit('administrar')">
        ⚙
      </button>
    </footer>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  yo: { type: Object, default: null },
  canales: { type: Array, default: () => [] },
  directorio: { type: Array, default: () => [] },
  canalActivoId: { type: Number, default: null },
})

defineEmits([
  'seleccionar',
  'nuevo-grupo',
  // Desde el buscador (ya hay una persona elegida) vs. desde el botón del pie
  // (abre el diálogo para elegirla).
  'nuevo-directo',
  'nuevo-directo-dialogo',
  'salir',
  'administrar',
])

const filtro = ref('')
const verArchivados = ref(false)

const esMiembro = computed(() => !!props.yo?.miembro)
const esAdmin = computed(() => !!props.yo?.admin)

function coincide(texto) {
  const q = filtro.value.trim().toLowerCase()
  if (!q) return true
  return (texto || '').toLowerCase().includes(q)
}

const gruposFiltrados = computed(() =>
  props.canales.filter(
    (c) => c.tipo === 'grupo' && !c.archivado && !c.supervision && coincide(c.nombre)
  )
)

const directosFiltrados = computed(() =>
  props.canales.filter((c) => c.tipo === 'directo' && coincide(c.nombre))
)

const supervisionFiltrados = computed(() =>
  props.canales.filter((c) => c.supervision && !c.archivado && coincide(c.nombre))
)

const archivadosFiltrados = computed(() =>
  props.canales.filter((c) => c.archivado && coincide(c.nombre))
)

/**
 * Compañeros sin chat abierto. Sólo se listan al buscar: mostrar el directorio
 * entero de arranque convertiría el sidebar en una guía telefónica y taparía las
 * conversaciones reales.
 */
const sinChatFiltrados = computed(() => {
  if (!filtro.value.trim() || !esMiembro.value) return []

  const conChat = new Set(
    props.canales.filter((c) => c.tipo === 'directo').map((c) => c.contraparte_id)
  )

  return props.directorio.filter(
    (m) => m.user_id !== props.yo?.user_id && !conChat.has(m.user_id) && coincide(m.nombre)
  )
})

const nadaQueMostrar = computed(
  () =>
    !gruposFiltrados.value.length &&
    !directosFiltrados.value.length &&
    !sinChatFiltrados.value.length &&
    !supervisionFiltrados.value.length &&
    !archivadosFiltrados.value.length
)

function enLinea(userId) {
  return !!props.directorio.find((m) => m.user_id === userId)?.en_linea
}

function filaClase(c) {
  return [
    'fila',
    {
      'fila--activa': c.id === props.canalActivoId,
      // Negrita cuando hay algo sin leer: el badge dice cuántos, la negrita dice
      // "acá hay algo" sin tener que leer el número.
      'fila--nuevo': c.no_leidos > 0,
    },
  ]
}
</script>

<style scoped>
.side {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 280px;
  flex: 0 0 280px;
  background: var(--m-side);
  border-right: 1px solid var(--m-borde);
}

.side__header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 12px 10px;
  border-bottom: 1px solid var(--m-borde);
}

.side__marca {
  display: flex;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.side__logo {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--m-acento), #1e8449);
  color: #06220f;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.side__titulo {
  font-size: 13px;
  font-weight: 600;
  color: var(--m-texto);
}

.side__yo {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--m-texto-debil);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.side__puesto {
  overflow: hidden;
  text-overflow: ellipsis;
}

.side__buscador {
  padding: 10px 12px;
}

.side__input {
  width: 100%;
  background: var(--m-fondo);
  border: 1px solid var(--m-borde);
  border-radius: 8px;
  color: var(--m-texto);
  font: inherit;
  font-size: 13px;
  padding: 7px 10px;
  outline: none;
}

.side__input:focus {
  border-color: var(--m-acento);
}

.side__input::placeholder {
  color: var(--m-texto-debil);
}

.side__lista {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 8px;
}

.grupo {
  margin-bottom: 12px;
}

.grupo__titulo {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: var(--m-texto-debil);
  padding: 4px 14px;
  font-weight: 600;
}

.grupo__titulo--click {
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  font-family: inherit;
}

.grupo__nota {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
  opacity: 0.7;
}

.fila {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  color: var(--m-texto-suave);
  font: inherit;
  font-size: 13px;
  text-align: left;
  padding: 6px 12px 6px 12px;
  cursor: pointer;
}

.fila:hover {
  background: var(--m-hover);
}

.fila--activa {
  background: var(--m-activo);
  border-left-color: var(--m-acento);
  color: #fff;
}

.fila--nuevo .fila__nombre {
  font-weight: 700;
  color: #fff;
}

.fila--tenue {
  color: var(--m-texto-debil);
}

.fila__icono {
  color: var(--m-texto-debil);
  flex: 0 0 auto;
}

.fila__nombre {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fila__puesto,
.fila__mudo,
.fila__ojo {
  font-size: 10px;
  color: var(--m-texto-debil);
  flex: 0 0 auto;
}

.badge {
  flex: 0 0 auto;
  background: var(--m-error);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
  padding: 1px 5px;
  border-radius: 999px;
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

.side__vacio {
  font-size: 12px;
  color: var(--m-texto-debil);
  padding: 16px 14px;
  line-height: 1.5;
}

.side__footer {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--m-borde);
  flex: 0 0 auto;
}

.btn {
  flex: 1;
  background: var(--m-acento);
  border: none;
  border-radius: 8px;
  color: #06220f;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 8px;
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
  flex: 0 0 auto;
  padding: 8px 12px;
}

.icono {
  background: transparent;
  border: none;
  color: var(--m-texto-debil);
  cursor: pointer;
  font-size: 16px;
  padding: 4px 6px;
  border-radius: 6px;
  line-height: 1;
}

.icono:hover {
  background: var(--m-hover);
  color: var(--m-texto);
}

/* En celular el sidebar es una pantalla completa, no una columna. */
@media (max-width: 860px) {
  .side {
    width: 100%;
    flex: 1 1 auto;
    border-right: none;
  }
}
</style>
