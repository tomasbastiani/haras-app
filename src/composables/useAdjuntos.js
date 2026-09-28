import { reactive } from 'vue'
import api from '@/axios'

/**
 * Caché de adjuntos descargados.
 *
 * ── Por qué no se puede usar <img src="/api/mensajeria/adjuntos/5"> ─────────
 * Porque el navegador pide esa URL por su cuenta, sin el header Authorization
 * que agrega el interceptor de axios: el request llegaría sin token y el backend
 * respondería 401. Los archivos están en el disco `local` justamente para que no
 * exista una URL pública, así que la única forma es bajarlos con axios y armar
 * un blob local. Es el mismo patrón que ya usa Paqueteria.vue con la foto del
 * paquete, sólo que acá hay muchas imágenes en pantalla y conviene cachearlas.
 *
 * El estado es de módulo: el mismo adjunto aparece en el hilo y en el visor a
 * pantalla completa, y no tiene sentido bajarlo dos veces.
 */

// { [adjuntoId]: { url, cargando, error } }
const cache = reactive({})

function entrada(id) {
  if (!cache[id]) {
    cache[id] = { url: null, cargando: false, error: false }
  }
  return cache[id]
}

/**
 * Baja el adjunto (si hace falta) y devuelve su entrada reactiva.
 *
 * Devuelve la entrada y no una promesa para que el template pueda mostrar el
 * placeholder mientras carga sin que el componente maneje estados a mano.
 */
function cargar(id) {
  const e = entrada(id)

  if (e.url || e.cargando) return e

  e.cargando = true
  e.error = false

  api
    .get(`/mensajeria/adjuntos/${id}`, { responseType: 'blob' })
    .then(({ data }) => {
      e.url = URL.createObjectURL(data)
    })
    .catch(() => {
      // 403 (perdiste el acceso al canal) o 404 (el mensaje se borró). En los dos
      // casos lo correcto es mostrar el hueco, no un cartel de error de red.
      e.error = true
    })
    .finally(() => {
      e.cargando = false
    })

  return e
}

/**
 * Fuerza la descarga de un adjunto al disco del usuario.
 *
 * Tiene que pasar por axios por lo mismo que las imágenes (el token), así que no
 * se puede usar un <a href> directo: se baja el blob y se dispara un click sobre
 * un enlace temporal.
 */
async function descargar(id, nombre) {
  const { data } = await api.get(`/mensajeria/adjuntos/${id}`, {
    params: { descarga: 1 },
    responseType: 'blob',
  })

  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre || 'archivo'
  document.body.appendChild(a)
  a.click()
  a.remove()

  // Sin el revoke, cada descarga deja el archivo entero retenido en memoria. El
  // timeout es porque revocar en el mismo tick cancela la descarga en Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/** Libera todos los blobs. Se llama al salir del módulo. */
function limpiarAdjuntos() {
  Object.keys(cache).forEach((id) => {
    if (cache[id].url) URL.revokeObjectURL(cache[id].url)
    delete cache[id]
  })
}

/** Tamaño legible: 1.2 MB, 340 KB. */
export function pesoLegible(bytes) {
  const n = Number(bytes) || 0

  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`

  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function useAdjuntos() {
  return { cargar, descargar, limpiarAdjuntos }
}
