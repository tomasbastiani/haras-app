import { ref } from 'vue'
import api from '@/axios'

/**
 * Contador de mensajes sin leer para el badge del navbar.
 *
 * Separado de useMensajeria a propósito. Ese composable es el estado completo del
 * módulo (canales, hilos, directorio, presencia) y sólo vive mientras el chat
 * está abierto; esto es un número que tiene que estar disponible en CUALQUIER
 * pantalla del portal.
 *
 * ── El costo, que es lo que hay que cuidar ──────────────────────────────────
 * Esto corre en todas las pantallas, así que es mucho más lento que el polling
 * de adentro del módulo: un minuto (configurable desde el .env) en lugar de
 * cuatro segundos. Y se detiene solo en los tres casos en los que no sirve:
 *
 *   - con la pestaña oculta (nadie está mirando el navbar);
 *   - mientras el módulo está abierto (ahí el /sync ya trae los no leídos, y
 *     además el navbar no se dibuja: la ruta usa layout completo);
 *   - si el usuario no tiene acceso al chat, en cuyo caso nunca arranca.
 *
 * El estado es de módulo para que el navbar tenga uno solo aunque se monte más
 * de una vez.
 */

const totalNoLeidos = ref(0)

let timer = null
let corriendo = false
let pausado = false
let enVuelo = false
let listenerVisibilidad = null
let intervalo = 60000

/** Ajusta la cadencia con lo que informó el backend en /mensajeria/acceso. */
function configurar(ms) {
  if (ms && Number(ms) > 0) intervalo = Number(ms)
}

async function refrescar() {
  if (enVuelo || pausado) return

  enVuelo = true
  try {
    const { data } = await api.get('/mensajeria/no-leidos')
    totalNoLeidos.value = Number(data?.total || 0)
  } catch (e) {
    // Silencio: esto corre en segundo plano en todas las pantallas y un corte de
    // red no tiene que ensuciar nada. Un 403 (le quitaron el acceso) deja el
    // contador como está; el menú se reacomoda en la próxima carga de página.
  } finally {
    enVuelo = false
  }
}

function agendar() {
  if (!corriendo || pausado) return
  if (typeof document !== 'undefined' && document.hidden) return

  timer = setTimeout(async () => {
    await refrescar()
    agendar()
  }, intervalo)
}

function limpiarTimer() {
  if (timer) clearTimeout(timer)
  timer = null
}

/** Arranca el seguimiento. Idempotente: llamarlo dos veces no duplica el timer. */
function iniciar() {
  if (corriendo) return
  corriendo = true
  pausado = false

  if (typeof document !== 'undefined' && !listenerVisibilidad) {
    listenerVisibilidad = () => {
      if (document.hidden) {
        limpiarTimer()
      } else {
        // Al volver a la app, el número se actualiza en el acto: esperar hasta un
        // minuto para enterarse de que hay mensajes nuevos sería raro.
        refrescar().then(agendar)
      }
    }
    document.addEventListener('visibilitychange', listenerVisibilidad)
  }

  refrescar().then(agendar)
}

function detener() {
  corriendo = false
  limpiarTimer()

  if (listenerVisibilidad && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', listenerVisibilidad)
    listenerVisibilidad = null
  }

  totalNoLeidos.value = 0
}

/**
 * Pausa mientras el módulo de mensajería está abierto.
 *
 * Adentro del chat este contador no aporta nada —el /sync ya trae los no leídos
 * por canal, y el navbar ni se dibuja— así que seguir consultando sería gastar
 * requests al doble.
 */
function pausar() {
  pausado = true
  limpiarTimer()
}

/** Reanuda al salir del módulo, refrescando en el acto. */
function reanudar() {
  if (!pausado) return

  pausado = false
  if (corriendo) refrescar().then(agendar)
}

export function useMensajeriaAvisos() {
  return {
    totalNoLeidos,
    configurar,
    iniciar,
    detener,
    pausar,
    reanudar,
    refrescar,
  }
}
