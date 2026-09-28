<template>
  <!--
    v-theme-provider envuelve el módulo para que los componentes de Vuetify que
    aparezcan acá adentro salgan oscuros. El layout propio se maneja con las
    variables CSS de .mens (abajo), que es más directo que pelear con los
    utilitarios de Vuetify para una pantalla de altura fija.
  -->
  <v-theme-provider theme="mensajeria" with-background>
    <div class="mens">
      <!-- ── Carga / error ─────────────────────────────────────────── -->
      <div v-if="cargandoInicial" class="mens__centro">
        <div class="spinner"></div>
        <p>Abriendo la mensajería…</p>
      </div>

      <div v-else-if="error" class="mens__centro">
        <p class="mens__error">{{ error }}</p>
        <button class="btn" @click="reintentarCarga">Reintentar</button>
        <button class="btn btn--plano" @click="volverAlMenu">Volver al menú</button>
      </div>

      <!-- ── Módulo ────────────────────────────────────────────────── -->
      <div v-else class="mens__cuerpo">
        <!--
          Panel doble. En escritorio los dos se ven a la vez; en celular se
          muestra uno solo y se navega entre ellos (lista → conversación), que es
          lo único que funciona en 360px de ancho.
        -->
        <CanalesSidebar
          v-show="!esMobile || vista === 'lista'"
          :yo="yo"
          :canales="canales"
          :directorio="directorio"
          :canal-activo-id="canalActivoId"
          @seleccionar="seleccionar"
          @nuevo-directo="iniciarDirecto"
          @nuevo-directo-dialogo="dialogo = 'directo'"
          @nuevo-grupo="dialogo = 'crear'"
          @salir="volverAlMenu"
          @administrar="irAAdministrar"
        />

        <main v-show="!esMobile || vista === 'canal'" class="mens__main">
          <Conversacion
            v-if="canalActivo"
            :canal="canalActivo"
            :hilo="hiloActivo"
            :mi-user-id="yo?.user_id"
            :directorio="directorio"
            :nombre-de-autor="nombreDeAutor"
            :largo-max="largoMax()"
            :limites-adjuntos="limitesAdjuntos()"
            :marca-nuevos="marcaNuevos"
            @ampliar="ampliar"
            @enviar="alEnviar"
            @editar="alEditar"
            @borrar="alBorrar"
            @reintentar="reintentar(canalActivo.id, $event)"
            @descartar="descartar(canalActivo.id, $event)"
            @cargar-mas="cargarMas(canalActivo.id)"
            @volver="vista = 'lista'"
            @silenciar="silenciar(canalActivo.id, $event)"
            @ver-miembros="abrirMiembros"
          />

          <div v-else class="mens__centro mens__centro--suave">
            <div class="mens__bienvenida">
              <span class="mens__logo">HSM</span>
              <h2>Mensajería interna</h2>
              <p v-if="yo?.miembro">
                Elegí una conversación de la izquierda, o buscá a un compañero
                para escribirle.
              </p>
              <p v-else>
                Entrás como administrador. Podés leer los canales del personal
                desde la sección «Supervisión»; los chats directos entre
                empleados son privados y no se muestran.
              </p>
            </div>
          </div>
        </main>
      </div>

      <!-- ── Diálogos ──────────────────────────────────────────────── -->
      <!-- Nuevo mensaje directo: elegir persona y listo. -->
      <NuevoCanalDialog
        v-if="dialogo === 'directo'"
        ref="dlgDirecto"
        modo="directo"
        :directorio="directorio"
        :mi-user-id="yo?.user_id"
        @cerrar="dialogo = null"
        @confirmar="confirmarDirecto"
      />

      <NuevoCanalDialog
        v-if="dialogo === 'crear'"
        ref="dlgCrear"
        modo="crear"
        :directorio="directorio"
        :mi-user-id="yo?.user_id"
        @cerrar="dialogo = null"
        @confirmar="confirmarCrear"
      />

      <NuevoCanalDialog
        v-if="dialogo === 'agregar' && canalActivo"
        ref="dlgAgregar"
        modo="agregar"
        :directorio="directorio"
        :mi-user-id="yo?.user_id"
        :ya-en-canal="canalActivo.miembros"
        @cerrar="dialogo = null"
        @confirmar="confirmarAgregar"
      />

      <!--
        Visor de imagen a pantalla completa. El blob ya está en la caché de
        useAdjuntos porque la miniatura del hilo lo bajó, así que abrir la imagen
        grande no vuelve a pedir nada al servidor.
      -->
      <div v-if="imagenAmpliada" class="visor" @click="cerrarVisor">
        <button class="visor__cerrar" @click="cerrarVisor">✕</button>
        <img :src="visorUrl" :alt="imagenAmpliada.nombre" class="visor__img" @click.stop />
        <div class="visor__pie" @click.stop>
          <span class="visor__nombre">{{ imagenAmpliada.nombre }}</span>
          <button class="visor__bajar" @click="bajarAmpliada">Descargar</button>
        </div>
      </div>

      <!-- Panel de integrantes de un grupo -->
      <div v-if="dialogo === 'miembros' && detalle" class="modal" @click.self="dialogo = null">
        <div class="modal__caja">
          <header class="modal__header">
            <h3># {{ detalle.nombre }}</h3>
            <button class="icono" @click="dialogo = null">✕</button>
          </header>

          <div class="modal__cuerpo">
            <p v-if="detalle.descripcion" class="detalle__desc">{{ detalle.descripcion }}</p>

            <div class="detalle__label">
              {{ detalle.miembros.length }} {{ detalle.miembros.length === 1 ? 'integrante' : 'integrantes' }}
            </div>

            <ul class="gente">
              <li v-for="m in detalle.miembros" :key="m.user_id" class="persona">
                <span :class="['punto', { 'punto--on': m.en_linea }]"></span>
                <span class="persona__nombre">
                  {{ m.nombre }}
                  <span v-if="m.user_id === yo?.user_id" class="persona__yo">(vos)</span>
                </span>
                <span v-if="m.rol === 'owner'" class="persona__rol">creador</span>
                <span v-else-if="m.puesto" class="persona__puesto">{{ m.puesto }}</span>
                <button
                  v-if="puedeQuitar(m)"
                  class="icono icono--peligro"
                  :title="m.user_id === yo?.user_id ? 'Salir del canal' : 'Quitar del canal'"
                  @click="quitar(m)"
                >
                  {{ m.user_id === yo?.user_id ? '⎋' : '✕' }}
                </button>
              </li>
            </ul>

            <p v-if="avisoMiembros" class="alerta">{{ avisoMiembros }}</p>
          </div>

          <footer class="modal__footer">
            <button
              v-if="!canalActivo?.supervision"
              class="btn btn--plano"
              @click="dialogo = 'agregar'"
            >
              + Agregar gente
            </button>
            <button class="btn" @click="dialogo = null">Listo</button>
          </footer>
        </div>
      </div>
    </div>
  </v-theme-provider>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CanalesSidebar from './CanalesSidebar.vue'
import Conversacion from './Conversacion.vue'
import NuevoCanalDialog from './NuevoCanalDialog.vue'
import { useMensajeria } from '@/composables/useMensajeria'
import { useAdjuntos } from '@/composables/useAdjuntos'
import { useMensajeriaAvisos } from '@/composables/useMensajeriaAvisos'

const router = useRouter()

const {
  yo, canales, directorio, canalActivo, canalActivoId, hilos,
  cargandoInicial, error,
  cargar, iniciarSync, abrirCanal, cargarMas,
  enviar, reintentar, descartar, editarMensaje, borrarMensaje,
  abrirDirecto, crearGrupo, detalleCanal, agregarMiembros, quitarMiembro,
  silenciar, limpiar, nombreDeAutor, largoMax, limitesAdjuntos,
} = useMensajeria()

const { cargar: cargarAdjunto, descargar: descargarAdjunto } = useAdjuntos()
const { pausar: pausarAvisos, reanudar: reanudarAvisos } = useMensajeriaAvisos()

// Identidad estable para el hilo todavía inexistente: si se devolviera un objeto
// nuevo en cada evaluación, la Conversación se re-renderizaría de más.
const HILO_VACIO = Object.freeze({ lista: [], hayMas: false, cargado: false, cargando: false })

/**
 * Hilo del canal abierto.
 *
 * Computed y no una llamada a hiloDe() en el template: hiloDe() crea la entrada
 * si no existe, y mutar estado reactivo durante el render es justo lo que hace
 * que Vue vuelva a renderizar mientras renderiza.
 */
const hiloActivo = computed(() => {
  const id = canalActivoId.value
  return (id && hilos[id]) || HILO_VACIO
})

const vista = ref('lista')      // sólo aplica en celular: 'lista' | 'canal'
const esMobile = ref(false)
const dialogo = ref(null)       // null | 'crear' | 'agregar' | 'miembros'
const detalle = ref(null)
const avisoMiembros = ref('')
const marcaNuevos = ref(0)
const dlgCrear = ref(null)
const dlgAgregar = ref(null)
const dlgDirecto = ref(null)
const imagenAmpliada = ref(null)
// Entrada de la caché de la imagen abierta. Se resuelve al abrir el visor y no
// en un computed: cargar() crea la entrada y puede disparar la descarga, y eso
// no puede pasar durante el render.
const visorEntrada = ref(null)

const visorUrl = computed(() => visorEntrada.value?.url || null)

function ampliar(adjunto) {
  // La miniatura del hilo ya bajó el blob, así que esto lo saca de la caché sin
  // pedir nada al servidor.
  visorEntrada.value = cargarAdjunto(adjunto.id)
  imagenAmpliada.value = adjunto
}

function cerrarVisor() {
  imagenAmpliada.value = null
  // La entrada NO se saca de la caché: la miniatura del hilo sigue usando ese
  // mismo blob. Los revoca limpiar() al salir del módulo.
  visorEntrada.value = null
}

async function bajarAmpliada() {
  try {
    await descargarAdjunto(imagenAmpliada.value.id, imagenAmpliada.value.nombre)
  } catch (e) {
    error.value = 'No se pudo descargar el archivo.'
  }
}

let mql = null

onMounted(async () => {
  mql = window.matchMedia('(max-width: 860px)')
  esMobile.value = mql.matches
  mql.addEventListener('change', alCambiarAncho)

  // Mientras el chat está abierto, el contador del navbar no aporta nada: el
  // /sync ya trae los no leídos por canal, y el navbar ni se dibuja (esta ruta
  // usa layout completo). Dejarlo corriendo sería consultar al doble.
  pausarAvisos()

  const ok = await cargar()
  if (ok) iniciarSync()
})

onBeforeUnmount(() => {
  mql?.removeEventListener('change', alCambiarAncho)
  // Cortar el polling al salir del módulo es lo que evita que la app siga
  // consultando el backend cada pocos segundos desde cualquier otra pantalla.
  limpiar()
  // Y devolverle el contador al navbar, ya actualizado.
  reanudarAvisos()
})

function alCambiarAncho(e) {
  esMobile.value = e.matches
}

async function reintentarCarga() {
  const ok = await cargar()
  if (ok) iniciarSync()
}

function volverAlMenu() {
  router.push('/menu')
}

function irAAdministrar() {
  router.push('/mensajeria-usuarios')
}

/**
 * Abre un canal.
 *
 * La marca de "mensajes nuevos" se toma ANTES de abrir, porque abrirCanal
 * adelanta el cursor de lectura: después ya no habría con qué ubicar la línea.
 */
async function seleccionar(canalId) {
  const canal = canales.value.find((c) => c.id === canalId)
  marcaNuevos.value = canal?.no_leidos ? canal.ultimo_leido_id || 0 : 0

  vista.value = 'canal'
  await abrirCanal(canalId)
}

async function iniciarDirecto(userId) {
  try {
    marcaNuevos.value = 0
    vista.value = 'canal'
    await abrirDirecto(userId)
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo abrir la conversación.'
  }
}

/** Desde el diálogo de "Nuevo mensaje". */
async function confirmarDirecto({ userId }) {
  try {
    marcaNuevos.value = 0
    vista.value = 'canal'
    await abrirDirecto(userId)
    dialogo.value = null
  } catch (e) {
    dlgDirecto.value?.mostrarError(
      e.response?.data?.message || 'No se pudo abrir la conversación.'
    )
  }
}

// El composer manda { cuerpo, archivos, previas }.
function alEnviar(payload) {
  if (!canalActivo.value) return
  // La línea de "nuevos" deja de tener sentido cuando uno mismo escribe.
  marcaNuevos.value = 0
  enviar(canalActivo.value.id, payload)
}

async function alEditar({ id, cuerpo }) {
  try {
    await editarMensaje(canalActivo.value.id, id, cuerpo)
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo editar el mensaje.'
  }
}

async function alBorrar(id) {
  if (!window.confirm('¿Eliminar este mensaje? Queda como «mensaje eliminado» para los demás.')) {
    return
  }

  try {
    await borrarMensaje(canalActivo.value.id, id)
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo eliminar el mensaje.'
  }
}

async function confirmarCrear(datos) {
  try {
    await crearGrupo(datos)
    dialogo.value = null
    vista.value = 'canal'
  } catch (e) {
    dlgCrear.value?.mostrarError(
      e.response?.data?.message || 'No se pudo crear el canal.'
    )
  }
}

async function confirmarAgregar({ miembros }) {
  try {
    await agregarMiembros(canalActivo.value.id, miembros)
    dialogo.value = null
    await abrirMiembros()
  } catch (e) {
    dlgAgregar.value?.mostrarError(
      e.response?.data?.message || 'No se pudo agregar a esa gente.'
    )
  }
}

async function abrirMiembros() {
  avisoMiembros.value = ''
  try {
    detalle.value = await detalleCanal(canalActivo.value.id)
    dialogo.value = 'miembros'
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo ver el canal.'
  }
}

/** Sacar a otro requiere administrar; salir uno mismo siempre se puede. */
function puedeQuitar(m) {
  if (canalActivo.value?.supervision) return false
  if (m.user_id === yo.value?.user_id) return true
  return yo.value?.admin || canalActivo.value?.mi_rol === 'owner'
}

async function quitar(m) {
  const propio = m.user_id === yo.value?.user_id

  const texto = propio
    ? '¿Salir de este canal? Vas a dejar de ver sus mensajes.'
    : `¿Quitar a ${m.nombre} del canal?`

  if (!window.confirm(texto)) return

  try {
    await quitarMiembro(canalActivo.value.id, m.user_id)

    if (propio) {
      dialogo.value = null
      vista.value = 'lista'
    } else {
      await abrirMiembros()
    }
  } catch (e) {
    avisoMiembros.value = e.response?.data?.message || 'No se pudo hacer el cambio.'
  }
}
</script>

<style scoped>
/*
  Paleta del módulo.
  Oscura a propósito —el pedido era que se sintiera una app aparte del portal—,
  pero con el verde de marca (#27AE60, el mismo que usa el resto de la app) como
  acento: distinto, no ajeno.

  Va como variables CSS y no como clases utilitarias de Vuetify porque acá hay
  una pantalla de altura fija con dos paneles, y eso se controla mejor a mano.
*/
.mens {
  --m-fondo: #14161c;
  --m-panel: #1b1f27;
  --m-panel-alto: #242a35;
  --m-side: #191d24;
  --m-borde: #2c333f;
  --m-hover: rgba(255, 255, 255, 0.045);
  --m-activo: rgba(39, 174, 96, 0.14);
  --m-texto: #eef1f5;
  --m-texto-suave: #c8cfd9;
  --m-texto-debil: #8b95a3;
  --m-acento: #27ae60;
  --m-error: #e5534b;
  --m-ok: #3fb950;

  /*
    100dvh y no 100vh: en los navegadores de celular, vh incluye la barra de
    direcciones y deja el composer escondido abajo de la pantalla. Se deja vh
    como fallback para los que no soportan dvh.
  */
  height: 100vh;
  height: 100dvh;
  background: var(--m-fondo);
  color: var(--m-texto);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Oswald', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.mens__cuerpo {
  flex: 1;
  min-height: 0;
  display: flex;
}

.mens__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.mens__centro {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  color: var(--m-texto-debil);
  font-size: 13px;
}

.mens__centro--suave {
  background: var(--m-fondo);
}

.mens__bienvenida {
  max-width: 340px;
}

.mens__bienvenida h2 {
  margin: 12px 0 6px;
  font-size: 18px;
  font-weight: 600;
  color: var(--m-texto);
}

.mens__bienvenida p {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--m-texto-debil);
}

.mens__logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--m-acento), #1e8449);
  color: #06220f;
  font-weight: 700;
  font-size: 15px;
}

.mens__error {
  color: #ff9d96;
  font-size: 14px;
  max-width: 380px;
}

.spinner {
  width: 26px;
  height: 26px;
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

/* ── Visor de imagen ────────────────────────────────────────────── */
.visor {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px 16px;
  z-index: 60;
}

.visor__img {
  max-width: 100%;
  max-height: calc(100% - 60px);
  object-fit: contain;
  border-radius: 6px;
}

.visor__cerrar {
  position: absolute;
  top: 14px;
  right: 16px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  font-size: 16px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  cursor: pointer;
}

.visor__pie {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
}

.visor__nombre {
  font-size: 12px;
  color: #cbd5e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.visor__bajar {
  background: var(--m-acento);
  border: none;
  border-radius: 6px;
  color: #06220f;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  cursor: pointer;
  flex: 0 0 auto;
}

/* ── Modal de integrantes ───────────────────────────────────────── */
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
  max-width: 420px;
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

.detalle__desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--m-texto-suave);
  line-height: 1.5;
}

.detalle__label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--m-texto-debil);
  font-weight: 600;
  margin-bottom: 6px;
}

.gente {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--m-borde);
  border-radius: 8px;
  overflow: hidden;
}

.persona {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 13px;
  color: var(--m-texto-suave);
}

.persona + .persona {
  border-top: 1px solid var(--m-borde);
}

.persona__nombre {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.persona__yo,
.persona__rol,
.persona__puesto {
  font-size: 10px;
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
  margin: 12px 0 0;
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
  font-size: 14px;
  padding: 4px 6px;
  border-radius: 6px;
  line-height: 1;
}

.icono:hover {
  background: var(--m-hover);
  color: var(--m-texto);
}

.icono--peligro:hover {
  color: var(--m-error);
}
</style>
