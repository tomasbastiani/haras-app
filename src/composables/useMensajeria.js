import { computed, reactive, ref } from 'vue'
import api from '@/axios'
import { useAdjuntos } from '@/composables/useAdjuntos'

const { limpiarAdjuntos } = useAdjuntos()

/**
 * Estado de la mensajería interna.
 *
 * El estado es de módulo (fuera de la función) igual que en useMenuItems: el
 * sidebar, el hilo y el badge del menú tienen que ver exactamente los mismos
 * datos, y cada componente que monte no puede arrancar su propio polling.
 *
 * ── Por qué polling y no websockets ─────────────────────────────────────────
 * El backend corre PHP 8.0 + Laravel 9 en hosting compartido, donde no se puede
 * levantar un demonio (Reverb pide PHP 8.2 y Laravel 11) ni hay worker de colas.
 * Así que el tiempo real es un GET /mensajeria/sync con cursor.
 *
 * Todo el transporte está encerrado acá a propósito: los componentes no saben
 * que hay polling. Si en algún momento se pasa a Pusher, se reemplaza este
 * archivo y no se toca ni una vista.
 */

// ── Estado compartido ───────────────────────────────────────────────────────
const yo = ref(null)
const canales = ref([])
const directorio = ref([])
const canalActivoId = ref(null)
const cargandoInicial = ref(false)
const error = ref('')

// Hilos cargados, por canal: { [canalId]: { lista, hayMas, cargado, cargando } }
const hilos = reactive({})

// Nombres de autores (incluye gente que ya no está en el directorio activo pero
// dejó mensajes en los canales).
const autores = reactive({})

// Cursores del sync.
let cursor = 0
let servidorTs = null

// Control del polling.
let timer = null
let corriendo = false
let syncEnVuelo = false
let ultimaInteraccion = Date.now()
let listenerVisibilidad = null

// Cadencias por defecto. El backend las manda en /bootstrap (config.sync) para
// poder ajustarlas sin volver a desplegar la PWA, que es lo que más cuesta.
let cadencias = { activo_ms: 4000, fondo_ms: 15000, inactivo_ms: 45000 }
let largoMax = 4000
let porPagina = 50
// Límites de adjuntos. Los manda el backend para poder avisar antes de subir.
let limitesAdjuntos = { max_kb: 8192, max_por_mensaje: 5 }

// Contador para los ids temporales del envío optimista.
let seqTemporal = 0

/**
 * Archivos de los envíos en vuelo, para poder reintentar sin pedirle al usuario
 * que los vuelva a elegir.
 *
 * Van en un Map aparte y NO como propiedad del mensaje: `hilos` es reactive, y
 * todo lo que se guarda ahí adentro lo envuelve Vue en proxies. Un File
 * proxificado es exactamente el tipo de objeto que FormData.append puede
 * rechazar, y sería un bug imposible de encontrar —el envío normal funciona y
 * sólo falla el reintento—. Acá quedan crudos.
 */
const archivosEnVuelo = new Map()

// ── Derivados ───────────────────────────────────────────────────────────────
const canalActivo = computed(
  () => canales.value.find((c) => c.id === canalActivoId.value) || null
)

const totalNoLeidos = computed(() =>
  canales.value.reduce((t, c) => t + (c.no_leidos || 0), 0)
)

const grupos = computed(() =>
  canales.value.filter((c) => c.tipo === 'grupo' && !c.archivado)
)

const directos = computed(() => canales.value.filter((c) => c.tipo === 'directo'))

const archivados = computed(() => canales.value.filter((c) => c.archivado))

// ── Helpers ─────────────────────────────────────────────────────────────────

function hiloDe(canalId) {
  if (!hilos[canalId]) {
    hilos[canalId] = { lista: [], hayMas: false, cargado: false, cargando: false }
  }
  return hilos[canalId]
}

function registrarAutores(mapa) {
  Object.entries(mapa || {}).forEach(([id, nombre]) => {
    autores[Number(id)] = nombre
  })
}

export function nombreDeAutor(userId) {
  return autores[Number(userId)] || 'Alguien'
}

/**
 * Inserta o actualiza mensajes en un hilo, manteniéndolo ordenado por id.
 *
 * Upsert y no push: el mismo mensaje puede llegar dos veces (el POST lo devuelve
 * y el sync siguiente lo vuelve a traer, porque el cursor de tiempo se toma
 * antes de la consulta y se solapa a propósito). Sin esto se verían duplicados.
 */
function fusionarMensajes(canalId, mensajes) {
  if (!mensajes?.length) return

  const hilo = hiloDe(canalId)
  const indice = new Map(hilo.lista.map((m, i) => [m.id, i]))

  mensajes.forEach((m) => {
    if (indice.has(m.id)) {
      // Reemplaza en el lugar: así llegan las ediciones y los borrados hechos
      // por otra persona sobre un mensaje que ya estaba en pantalla.
      hilo.lista[indice.get(m.id)] = m
    } else {
      hilo.lista.push(m)
    }
  })

  // Los pendientes (envío optimista) van al final: todavía no tienen id real.
  hilo.lista.sort((a, b) => {
    if (a.pendiente && !b.pendiente) return 1
    if (!a.pendiente && b.pendiente) return -1
    return a.id > b.id ? 1 : a.id < b.id ? -1 : 0
  })
}

/** Marca actividad del usuario: acelera el polling. */
function tocarInteraccion() {
  ultimaInteraccion = Date.now()
}

/**
 * Cadencia según lo que esté pasando.
 *
 * La pestaña oculta no consulta nada: es lo que hace que veinte empleados con la
 * app abierta en el celular no sean veinte requests cada cuatro segundos contra
 * un hosting compartido. Cuando vuelve a verse, sincroniza al instante.
 */
function proximoIntervalo() {
  if (typeof document !== 'undefined' && document.hidden) return null

  const quieto = Date.now() - ultimaInteraccion

  if (quieto < 2 * 60 * 1000) return cadencias.activo_ms
  if (quieto < 10 * 60 * 1000) return cadencias.fondo_ms
  return cadencias.inactivo_ms
}

// ── API pública ─────────────────────────────────────────────────────────────

/** Carga inicial del módulo: todo en un solo request. */
async function cargar() {
  cargandoInicial.value = true
  error.value = ''

  try {
    const { data } = await api.get('/mensajeria/bootstrap')

    yo.value = data.yo
    canales.value = data.canales || []
    directorio.value = data.directorio || []
    cursor = data.cursor || 0
    servidorTs = data.servidor_ts || null

    if (data.config?.sync) cadencias = { ...cadencias, ...data.config.sync }
    if (data.config?.largo_max) largoMax = data.config.largo_max
    if (data.config?.pagina) porPagina = data.config.pagina
    if (data.config?.adjuntos) limitesAdjuntos = { ...limitesAdjuntos, ...data.config.adjuntos }

    // El directorio alcanza para casi todos los nombres; los que falten los
    // completa el propio hilo al cargarse.
    registrarAutores(
      Object.fromEntries(directorio.value.map((m) => [m.user_id, m.nombre]))
    )

    return true
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo cargar la mensajería.'
    return false
  } finally {
    cargandoInicial.value = false
  }
}

/** Un ciclo de sincronización. */
async function sincronizar() {
  if (syncEnVuelo) return
  syncEnVuelo = true

  try {
    const params = { desde: cursor }
    if (servidorTs) params.desde_ts = servidorTs

    const { data } = await api.get('/mensajeria/sync', { params })

    cursor = data.cursor ?? cursor
    servidorTs = data.servidor_ts ?? servidorTs

    if (data.canales) canales.value = data.canales
    if (data.directorio) {
      directorio.value = data.directorio
      registrarAutores(
        Object.fromEntries(data.directorio.map((m) => [m.user_id, m.nombre]))
      )
    }

    // Los mensajes se reparten a los hilos YA cargados. A un canal que el
    // usuario nunca abrió no le armamos el hilo acá: su badge ya salió en
    // `canales`, y el historial se carga cuando lo abra.
    const porCanal = {}
    ;(data.mensajes || []).forEach((m) => {
      if (!hilos[m.canal_id]) return
      if (!porCanal[m.canal_id]) porCanal[m.canal_id] = []
      porCanal[m.canal_id].push(m)
    })

    Object.entries(porCanal).forEach(([canalId, lista]) => {
      fusionarMensajes(Number(canalId), lista)
    })

    // Si el canal abierto recibió algo de otra persona, se marca leído solo:
    // el usuario lo está mirando.
    const activos = porCanal[canalActivoId.value]
    if (activos?.length) {
      const ultimo = Math.max(...activos.map((m) => m.id))
      marcarLeido(canalActivoId.value, ultimo)
    }
  } catch (e) {
    // Silencio deliberado: esto corre cada pocos segundos y un corte de red
    // momentáneo no tiene que pintar un cartel de error. El 401 ya lo maneja el
    // interceptor de axios (desloguea), y el 403 lo levanta el siguiente ciclo.
  } finally {
    syncEnVuelo = false
  }
}

function agendar() {
  if (!corriendo) return

  const espera = proximoIntervalo()

  // Pestaña oculta: no se agenda nada. El listener de visibilidad reanuda.
  if (espera === null) return

  timer = setTimeout(async () => {
    await sincronizar()
    agendar()
  }, espera)
}

/** Arranca el polling. Idempotente. */
function iniciarSync() {
  if (corriendo) return
  corriendo = true
  tocarInteraccion()

  if (typeof document !== 'undefined') {
    listenerVisibilidad = () => {
      if (document.hidden) {
        if (timer) clearTimeout(timer)
        timer = null
      } else {
        // Volvió a la app: sincroniza ya, sin esperar el próximo tick.
        tocarInteraccion()
        sincronizar().then(agendar)
      }
    }
    document.addEventListener('visibilitychange', listenerVisibilidad)
  }

  agendar()
}

/** Detiene el polling al salir del módulo. */
function detenerSync() {
  corriendo = false

  if (timer) clearTimeout(timer)
  timer = null

  if (listenerVisibilidad && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', listenerVisibilidad)
    listenerVisibilidad = null
  }
}

/** Abre un canal y carga su historial la primera vez. */
async function abrirCanal(canalId) {
  canalActivoId.value = canalId
  tocarInteraccion()

  const hilo = hiloDe(canalId)

  if (!hilo.cargado && !hilo.cargando) {
    hilo.cargando = true
    try {
      const { data } = await api.get(`/mensajeria/canales/${canalId}/mensajes`, {
        params: { limite: porPagina },
      })
      hilo.lista = data.mensajes || []
      hilo.hayMas = !!data.hay_mas
      hilo.cargado = true
      registrarAutores(data.autores)
    } catch (e) {
      error.value = e.response?.data?.message || 'No se pudo abrir la conversación.'
    } finally {
      hilo.cargando = false
    }
  }

  const ultimo = [...hilo.lista].reverse().find((m) => !m.pendiente)
  if (ultimo) marcarLeido(canalId, ultimo.id)
}

/** Carga la página anterior del hilo (scroll hacia arriba). */
async function cargarMas(canalId) {
  const hilo = hiloDe(canalId)
  if (!hilo.hayMas || hilo.cargando) return

  const masViejo = hilo.lista.find((m) => !m.pendiente)
  if (!masViejo) return

  hilo.cargando = true
  try {
    const { data } = await api.get(`/mensajeria/canales/${canalId}/mensajes`, {
      params: { antes: masViejo.id, limite: porPagina },
    })
    hilo.lista = [...(data.mensajes || []), ...hilo.lista]
    hilo.hayMas = !!data.hay_mas
    registrarAutores(data.autores)
  } catch (e) {
    // Sin cartel: el usuario puede volver a intentar scrolleando.
  } finally {
    hilo.cargando = false
  }
}

/**
 * Envía un mensaje de forma optimista.
 *
 * Aparece en pantalla antes de que el servidor conteste, y es lo que hace que el
 * chat se sienta instantáneo aunque el transporte sea polling: sin esto, escribir
 * y esperar hasta cuatro segundos a que el mensaje aparezca se siente roto.
 *
 * Si el envío falla, el mensaje NO se borra: queda marcado con error para poder
 * reintentarlo. Hacerlo desaparecer perdería lo que la persona escribió.
 */
async function enviar(canalId, payload, respondeA = null) {
  // Acepta un string suelto o el objeto que manda el composer, para que quien
  // sólo necesita mandar texto no tenga que armar el objeto.
  const { cuerpo = '', archivos = [], previas = [] } =
    typeof payload === 'string' ? { cuerpo: payload } : (payload || {})

  const texto = (cuerpo || '').trim()
  if (!texto && !archivos.length) return null

  tocarInteraccion()

  const hilo = hiloDe(canalId)
  const temporal = {
    id: `tmp-${++seqTemporal}`,
    canal_id: canalId,
    user_id: yo.value?.user_id,
    tipo: archivos.length ? 'archivo' : 'texto',
    cuerpo: texto,
    eliminado: false,
    editado: false,
    responde_a_id: respondeA,
    adjuntos: [],
    // Vistas previas locales, para verse mientras el mensaje está en vuelo.
    previas,
    created_at: new Date().toISOString(),
    pendiente: true,
    fallo: false,
  }

  if (archivos.length) {
    archivosEnVuelo.set(temporal.id, archivos)
  }

  hilo.lista.push(temporal)

  try {
    let data

    if (archivos.length) {
      // multipart: axios pone el Content-Type y el boundary solo. Poner
      // 'multipart/form-data' a mano rompe el envío (queda sin boundary).
      const form = new FormData()
      if (texto) form.append('cuerpo', texto)
      if (respondeA) form.append('responde_a_id', respondeA)
      archivos.forEach((f) => form.append('archivos[]', f))

      ;({ data } = await api.post(`/mensajeria/canales/${canalId}/mensajes`, form))
    } else {
      ;({ data } = await api.post(`/mensajeria/canales/${canalId}/mensajes`, {
        cuerpo: texto,
        responde_a_id: respondeA,
      }))
    }

    // Reemplaza el temporal por el real, en el mismo lugar. No hace falta
    // reordenar: el temporal estaba al final y el id que vuelve es el más alto.
    const i = hilo.lista.findIndex((m) => m.id === temporal.id)
    if (i !== -1) hilo.lista.splice(i, 1, data)

    // Ya está el adjunto real: las previas locales y los File no se usan más.
    liberarPrevias(previas)
    archivosEnVuelo.delete(temporal.id)

    if (cursor < data.id) cursor = data.id

    const canal = canales.value.find((c) => c.id === canalId)
    if (canal) canal.ultimo_mensaje_at = data.created_at

    return data
  } catch (e) {
    // Las previas NO se liberan acá: el mensaje queda en pantalla para
    // reintentar, y sin ellas el usuario no vería qué estaba mandando.
    const i = hilo.lista.findIndex((m) => m.id === temporal.id)
    if (i !== -1) {
      hilo.lista[i] = {
        ...hilo.lista[i],
        pendiente: false,
        fallo: true,
        motivo: e.response?.data?.message || 'No se pudo enviar.',
      }
    }
    return null
  }
}

/** Libera los object URL de las vistas previas locales. */
function liberarPrevias(previas) {
  ;(previas || []).forEach((p) => {
    if (p?.url) URL.revokeObjectURL(p.url)
  })
}

/** Reintenta un envío fallido, con sus archivos incluidos. */
async function reintentar(canalId, mensajeTemporalId) {
  const hilo = hiloDe(canalId)
  const i = hilo.lista.findIndex((m) => m.id === mensajeTemporalId)
  if (i === -1) return

  const { cuerpo, responde_a_id, previas } = hilo.lista[i]
  const archivos = archivosEnVuelo.get(mensajeTemporalId) || []

  archivosEnVuelo.delete(mensajeTemporalId)
  hilo.lista.splice(i, 1)

  // `previas` sale del árbol reactivo, así que se copia a objetos planos: son
  // sólo {url, nombre} y el nuevo mensaje temporal los vuelve a registrar.
  return enviar(
    canalId,
    {
      cuerpo,
      archivos,
      previas: (previas || []).map((p) => ({ url: p.url, nombre: p.nombre })),
    },
    responde_a_id
  )
}

/** Descarta un envío fallido. */
function descartar(canalId, mensajeTemporalId) {
  const hilo = hiloDe(canalId)
  const i = hilo.lista.findIndex((m) => m.id === mensajeTemporalId)

  if (i !== -1) {
    liberarPrevias(hilo.lista[i].previas)
    archivosEnVuelo.delete(mensajeTemporalId)
    hilo.lista.splice(i, 1)
  }
}

/**
 * Apaga el badge de un canal.
 *
 * Baja el contador local de una vez en lugar de esperar el próximo sync: si no,
 * el badge se queda prendido unos segundos después de haber leído y parece que
 * la app no registró la lectura.
 */
async function marcarLeido(canalId, mensajeId) {
  const canal = canales.value.find((c) => c.id === canalId)

  if (canal) {
    if ((canal.ultimo_leido_id || 0) >= mensajeId && canal.no_leidos === 0) return
    canal.no_leidos = 0
    canal.ultimo_leido_id = Math.max(canal.ultimo_leido_id || 0, mensajeId)
  }

  try {
    await api.post(`/mensajeria/canales/${canalId}/leido`, { mensaje_id: mensajeId })
  } catch (e) {
    // El próximo sync recalcula los no leídos con el cursor real del backend.
  }
}

async function editarMensaje(canalId, mensajeId, cuerpo) {
  tocarInteraccion()
  const { data } = await api.patch(`/mensajeria/mensajes/${mensajeId}`, { cuerpo })
  fusionarMensajes(canalId, [data])
  return data
}

async function borrarMensaje(canalId, mensajeId) {
  tocarInteraccion()
  const { data } = await api.delete(`/mensajeria/mensajes/${mensajeId}`)
  fusionarMensajes(canalId, [data])
  return data
}

/** Abre (o reusa) el directo con alguien y lo deja activo. */
async function abrirDirecto(userId) {
  tocarInteraccion()
  const { data } = await api.post('/mensajeria/canales/directo', { user_id: userId })

  // Hay que sincronizar no sólo si el canal es nuevo, sino también si ya existía
  // pero todavía no está en la lista local: pasa cuando la otra persona abrió el
  // directo y este cliente aún no lo vio. Sin esto, canalActivo quedaría en null
  // y la pantalla mostraría la bienvenida en lugar de la conversación.
  const existe = canales.value.some((c) => c.id === data.canal_id)
  if (data.creado || !existe) await sincronizar()

  await abrirCanal(data.canal_id)
  return data.canal_id
}

async function crearGrupo({ nombre, descripcion, miembros }) {
  tocarInteraccion()
  const { data } = await api.post('/mensajeria/canales', {
    nombre,
    descripcion,
    miembros,
  })

  await sincronizar()
  await abrirCanal(data.canal_id)
  return data.canal_id
}

async function detalleCanal(canalId) {
  const { data } = await api.get(`/mensajeria/canales/${canalId}`)
  return data
}

async function agregarMiembros(canalId, miembros) {
  await api.post(`/mensajeria/canales/${canalId}/miembros`, { miembros })
  await sincronizar()
}

async function quitarMiembro(canalId, userId) {
  await api.delete(`/mensajeria/canales/${canalId}/miembros/${userId}`)

  // Si me saqué a mí mismo, el canal deja de existir para mí.
  if (userId === yo.value?.user_id && canalActivoId.value === canalId) {
    canalActivoId.value = null
    delete hilos[canalId]
  }

  await sincronizar()
}

async function silenciar(canalId, silenciado) {
  await api.post(`/mensajeria/canales/${canalId}/silenciar`, { silenciado })
  const canal = canales.value.find((c) => c.id === canalId)
  if (canal) canal.silenciado = silenciado
}

async function archivar(canalId, archivado) {
  await api.post(`/mensajeria/canales/${canalId}/archivar`, { archivado })
  await sincronizar()
}

/** Reinicia el estado al salir del módulo o al cambiar de usuario. */
function limpiar() {
  detenerSync()

  // Los object URL no los libera el recolector de basura: si no se revocan, cada
  // imagen vista queda retenida en memoria hasta que se recargue la página.
  Object.keys(hilos).forEach((k) => {
    hilos[k].lista.forEach((m) => liberarPrevias(m.previas))
    delete hilos[k]
  })
  limpiarAdjuntos()
  archivosEnVuelo.clear()

  yo.value = null
  canales.value = []
  directorio.value = []
  canalActivoId.value = null
  cursor = 0
  servidorTs = null
}

export function useMensajeria() {
  return {
    // estado
    yo,
    canales,
    directorio,
    canalActivo,
    canalActivoId,
    hilos,
    autores,
    cargandoInicial,
    error,

    // derivados
    grupos,
    directos,
    archivados,
    totalNoLeidos,

    // acciones
    cargar,
    iniciarSync,
    detenerSync,
    sincronizar,
    abrirCanal,
    cargarMas,
    enviar,
    reintentar,
    descartar,
    marcarLeido,
    editarMensaje,
    borrarMensaje,
    abrirDirecto,
    crearGrupo,
    detalleCanal,
    agregarMiembros,
    quitarMiembro,
    silenciar,
    archivar,
    limpiar,

    // helpers
    hiloDe,
    nombreDeAutor,
    largoMax: () => largoMax,
    limitesAdjuntos: () => limitesAdjuntos,
  }
}
