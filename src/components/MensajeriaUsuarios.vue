<template>
  <div class="mens-usuarios">
    <div class="header">
      <button class="back-button" @click="goBack">←</button>
      <h2>Acceso a la Mensajería Interna</h2>
    </div>

    <p class="intro">
      Quién puede usar el chat privado del personal. El acceso es aditivo: a un
      empleado que además es propietario no le cambia nada del resto de la app.
      Las cuentas tienen que ser <strong>personales</strong> — la cuenta compartida
      de portería no sirve acá, porque los mensajes quedarían sin autor.
    </p>

    <div v-if="mensajeError" class="alerta error">{{ mensajeError }}</div>
    <div v-if="mensajeOk" class="alerta ok">{{ mensajeOk }}</div>

    <div class="tabs">
      <button :class="['tab', { activo: tab === 'listado' }]" @click="tab = 'listado'">
        Habilitados
        <span v-if="activos.length" class="tab-badge">{{ activos.length }}</span>
      </button>
      <button :class="['tab', { activo: tab === 'crear' }]" @click="tab = 'crear'">
        Crear cuenta
      </button>
      <button :class="['tab', { activo: tab === 'habilitar' }]" @click="tab = 'habilitar'">
        Habilitar existente
      </button>
    </div>

    <!-- ============ LISTADO ============ -->
    <div v-if="tab === 'listado'" class="card">
      <div v-if="cargando" class="vacio">Cargando…</div>
      <div v-else-if="!miembros.length" class="vacio">
        Todavía no hay nadie habilitado. Creá una cuenta o habilitá una existente.
      </div>
      <table v-else class="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Puesto</th>
            <th>Estado</th>
            <th class="acciones-col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in miembros" :key="m.user_id" :class="{ inactivo: !m.activo }">
            <td>
              <span :class="['punto', { on: m.en_linea }]"></span>
              {{ m.nombre || '—' }}
              <span v-if="m.rol === 'moderador'" class="etiqueta">moderador</span>
              <span v-if="m.es_admin" class="etiqueta etiqueta--admin">admin</span>
              <!--
                Permiso inerte: la membresía quedó sobre una fila de `users` que
                no es la que autentica, así que está guardada y no hace nada.
              -->
              <div v-if="m.activo && !m.es_cuenta_de_login" class="alerta-fila">
                ⚠ Este acceso no funciona: quedó sobre la cuenta
                <strong>#{{ m.user_id }}</strong>, pero este email inicia sesión con la
                <strong>#{{ m.id_de_login }}</strong>.
                <button class="btn-mini" @click="corregir(m)">Corregir</button>
              </div>
            </td>
            <td class="email-cell">{{ m.email }}</td>
            <td>{{ m.puesto || '—' }}</td>
            <td>
              <span :class="['estado', m.activo ? 'estado--ok' : 'estado--off']">
                {{ m.activo ? 'Activo' : 'Sin acceso' }}
              </span>
            </td>
            <td class="acciones-col">
              <button class="btn-mini" @click="abrirEditar(m)">Editar</button>
              <button class="btn-mini" @click="abrirReset(m)">Contraseña</button>
              <button
                v-if="m.activo"
                class="btn-mini peligro"
                @click="cambiarAcceso(m, false)"
              >
                Quitar acceso
              </button>
              <button v-else class="btn-mini" @click="cambiarAcceso(m, true)">
                Rehabilitar
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p class="nota">
        Quitar el acceso es inmediato: la persona pierde el chat en el próximo
        request, sin tener que cerrar sesión. Sus mensajes quedan en los canales
        donde participó.
      </p>
    </div>

    <!-- ============ CREAR ============ -->
    <form v-if="tab === 'crear'" class="card" @submit.prevent="crear">
      <p class="ayuda">
        Para personal que todavía no tiene usuario en la app. Si ya tiene uno
        (porque además es propietario), usá «Habilitar existente».
      </p>

      <label>
        Nombre y apellido
        <input v-model="nuevo.nombre" type="text" maxlength="150" required />
      </label>

      <label>
        Email
        <input v-model="nuevo.email" type="email" maxlength="255" required />
      </label>

      <label>
        Puesto <span class="opt">(opcional, se ve en el directorio)</span>
        <input v-model="nuevo.puesto" type="text" maxlength="80" placeholder="Portería, Administración…" />
      </label>

      <label>
        Contraseña
        <input v-model="nuevo.password" type="text" minlength="8" required />
        <small>Mínimo 8 caracteres, con al menos una mayúscula y un número.</small>
      </label>

      <button class="btn" type="submit" :disabled="guardando">
        {{ guardando ? 'Creando…' : 'Crear y habilitar' }}
      </button>
    </form>

    <!-- ============ HABILITAR EXISTENTE ============ -->
    <div v-if="tab === 'habilitar'" class="card">
      <p class="ayuda">
        Buscá por nombre o email a alguien que ya tenga cuenta en la app.
      </p>

      <div class="buscador">
        <input
          v-model="consulta"
          type="search"
          placeholder="Nombre o email (mínimo 3 letras)"
          @keyup.enter="buscar"
        />
        <button class="btn" :disabled="consulta.trim().length < 3 || buscando" @click="buscar">
          {{ buscando ? 'Buscando…' : 'Buscar' }}
        </button>
      </div>

      <div v-if="buscoAlgo && !resultados.length" class="vacio">
        No se encontró ninguna cuenta con ese dato.
      </div>

      <table v-if="resultados.length" class="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th class="acciones-col">Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in resultados" :key="u.id">
            <td>
              {{ u.nombre || '—' }}
              <span v-if="u.es_admin" class="etiqueta etiqueta--admin">admin</span>
              <span class="id-cell">#{{ u.id }}</span>

              <!--
                Aviso de datos, no de error: este email tiene más de una fila en
                `users`. Se muestra siempre que haya duplicados porque explica por
                qué se ofrece una sola y cuál.
              -->
              <div v-if="u.duplicados" class="nota-fila">
                Este email tiene <strong>{{ u.duplicados + 1 }} cuentas</strong> en la base
                (#{{ u.ids.join(', #') }}). Se habilita la <strong>#{{ u.id }}</strong>,
                que es la que se usa al iniciar sesión.
              </div>

              <div v-if="u.habilitado_en_otra" class="alerta-fila">
                ⚠ Ya hay un acceso dado sobre la cuenta
                <strong>#{{ u.habilitado_en_otra }}</strong>, que no autentica, así que no
                funciona.
                <button class="btn-mini" @click="corregir({ user_id: u.habilitado_en_otra })">
                  Corregir
                </button>
              </div>
            </td>
            <td class="email-cell">{{ u.email }}</td>
            <td class="acciones-col">
              <span v-if="u.habilitado" class="estado estado--ok">Ya tiene acceso</span>
              <span v-else-if="u.compartida" class="motivo" :title="MOTIVO_COMPARTIDA">
                Cuenta compartida
              </span>
              <button v-else class="btn-mini" @click="habilitar(u)">Habilitar</button>
            </td>
          </tr>
        </tbody>
      </table>

      <p class="nota">
        Los resultados se agrupan por email: si un email tiene varias cuentas en la
        base, se ofrece sólo la que realmente inicia sesión. Habilitar cualquier otra
        guardaría el permiso sin efecto —la persona se loguearía y no vería el módulo—.
      </p>
      <p class="nota" style="border-top: none; padding-top: 0">
        {{ MOTIVO_COMPARTIDA }}
      </p>
    </div>

    <!-- ============ MODAL EDITAR ============ -->
    <div v-if="editando" class="modal" @click.self="editando = null">
      <div class="modal-caja">
        <h3>{{ editando.nombre || editando.email }}</h3>

        <label>
          Puesto
          <input v-model="edicion.puesto" type="text" maxlength="80" />
        </label>

        <label>
          Rol
          <select v-model="edicion.rol">
            <option value="miembro">Miembro</option>
            <option value="moderador">Moderador (puede administrar canales)</option>
          </select>
        </label>

        <p class="ayuda">
          El rol no da acceso a leer conversaciones ajenas. Un moderador puede
          crear canales y administrar sus integrantes.
        </p>

        <div class="modal-acciones">
          <button class="btn-mini" @click="editando = null">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="guardarEdicion">
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ============ MODAL RESET ============ -->
    <div v-if="reseteando" class="modal" @click.self="reseteando = null">
      <div class="modal-caja">
        <h3>Contraseña de {{ reseteando.nombre || reseteando.email }}</h3>

        <label>
          Nueva contraseña
          <input v-model="passwordNueva" type="text" minlength="8" />
          <small>Mínimo 8 caracteres, con al menos una mayúscula y un número.</small>
        </label>

        <div class="modal-acciones">
          <button class="btn-mini" @click="reseteando = null">Cancelar</button>
          <button class="btn" :disabled="guardando" @click="guardarPassword">
            {{ guardando ? 'Guardando…' : 'Cambiar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/axios'

const router = useRouter()

const MOTIVO_COMPARTIDA =
  'La cuenta de portería es compartida por el personal de turno, así que no puede usarse en el chat: los mensajes quedarían sin autor identificable. A cada empleado, cuenta personal.'

const tab = ref('listado')
const miembros = ref([])
const cargando = ref(false)
const guardando = ref(false)
const mensajeOk = ref('')
const mensajeError = ref('')

const nuevo = reactive({ nombre: '', email: '', puesto: '', password: '' })

const consulta = ref('')
const resultados = ref([])
const buscando = ref(false)
const buscoAlgo = ref(false)

const editando = ref(null)
const edicion = reactive({ puesto: '', rol: 'miembro' })

const reseteando = ref(null)
const passwordNueva = ref('')

const activos = computed(() => miembros.value.filter((m) => m.activo))

function goBack() {
  router.push('/menu')
}

function avisar(ok, error = '') {
  mensajeOk.value = ok
  mensajeError.value = error
  if (ok) setTimeout(() => (mensajeOk.value = ''), 4000)
}

async function cargar() {
  cargando.value = true
  try {
    const { data } = await api.get('/admin/mensajeria/miembros')
    miembros.value = data
  } catch (e) {
    avisar('', e.response?.data?.message || 'No se pudo cargar el listado.')
  } finally {
    cargando.value = false
  }
}

async function crear() {
  guardando.value = true
  mensajeError.value = ''
  try {
    await api.post('/admin/mensajeria/miembros', { ...nuevo })
    avisar('Cuenta creada y habilitada.')
    Object.assign(nuevo, { nombre: '', email: '', puesto: '', password: '' })
    tab.value = 'listado'
    await cargar()
  } catch (e) {
    avisar('', e.response?.data?.message || 'No se pudo crear la cuenta.')
  } finally {
    guardando.value = false
  }
}

async function buscar() {
  if (consulta.value.trim().length < 3) return

  buscando.value = true
  mensajeError.value = ''
  try {
    const { data } = await api.get('/admin/mensajeria/miembros/buscar', {
      params: { q: consulta.value.trim() },
    })
    resultados.value = data
    buscoAlgo.value = true
  } catch (e) {
    avisar('', e.response?.data?.message || 'No se pudo buscar.')
  } finally {
    buscando.value = false
  }
}

async function habilitar(u) {
  try {
    await api.patch(`/admin/mensajeria/miembros/${u.id}`, { activo: true })
    avisar(`${u.nombre || u.email} ya tiene acceso al chat.`)
    u.habilitado = true
    await cargar()
  } catch (e) {
    avisar('', e.response?.data?.message || 'No se pudo habilitar.')
  }
}

/**
 * Mueve el acceso a la cuenta que realmente inicia sesión.
 *
 * Resuelve el caso del email con varias filas en `users`: el permiso quedó sobre
 * una fila que ninguna sesión va a tener, así que estaba guardado y no hacía nada.
 */
async function corregir(m) {
  try {
    const { data } = await api.post(`/admin/mensajeria/miembros/${m.user_id}/mover-a-login`)
    avisar(data.message)
    await cargar()
    if (tab.value === 'habilitar' && consulta.value.trim().length >= 3) await buscar()
  } catch (e) {
    avisar('', e.response?.data?.message || 'No se pudo corregir el acceso.')
  }
}

async function cambiarAcceso(m, activo) {
  if (!activo && !window.confirm(`¿Quitarle el acceso al chat a ${m.nombre || m.email}?`)) {
    return
  }

  try {
    await api.patch(`/admin/mensajeria/miembros/${m.user_id}`, { activo })
    avisar(activo ? 'Acceso restituido.' : 'Acceso quitado.')
    await cargar()
  } catch (e) {
    avisar('', e.response?.data?.message || 'No se pudo hacer el cambio.')
  }
}

function abrirEditar(m) {
  editando.value = m
  edicion.puesto = m.puesto || ''
  edicion.rol = m.rol || 'miembro'
}

async function guardarEdicion() {
  guardando.value = true
  try {
    await api.patch(`/admin/mensajeria/miembros/${editando.value.user_id}`, {
      activo: editando.value.activo,
      puesto: edicion.puesto || null,
      rol: edicion.rol,
    })
    avisar('Datos actualizados.')
    editando.value = null
    await cargar()
  } catch (e) {
    avisar('', e.response?.data?.message || 'No se pudo guardar.')
  } finally {
    guardando.value = false
  }
}

function abrirReset(m) {
  reseteando.value = m
  passwordNueva.value = ''
}

async function guardarPassword() {
  guardando.value = true
  try {
    await api.post(`/admin/mensajeria/miembros/${reseteando.value.user_id}/password`, {
      password: passwordNueva.value,
    })
    avisar('Contraseña actualizada.')
    reseteando.value = null
  } catch (e) {
    avisar('', e.response?.data?.message || 'No se pudo cambiar la contraseña.')
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>

<style scoped>
.mens-usuarios {
  max-width: 980px;
  margin: 0 auto;
  padding: 16px 16px 40px;
}

.header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.header h2 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
}

.back-button {
  background: transparent;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #2c3e50;
}

.intro {
  font-size: 13px;
  color: #4a5568;
  line-height: 1.55;
  margin: 0 0 14px;
}

.alerta {
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13px;
  margin-bottom: 12px;
}

.alerta.ok {
  background: #e8f8ef;
  color: #1e8449;
  border: 1px solid #a9dfbf;
}

.alerta.error {
  background: #fdeceb;
  color: #a93226;
  border: 1px solid #f5b7b1;
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tab {
  background: #fff;
  border: 1px solid #d6dbe1;
  border-radius: 8px 8px 0 0;
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  color: #4a5568;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab.activo {
  background: #2c3e50;
  color: #fff;
  border-color: #2c3e50;
}

.tab-badge {
  background: #27ae60;
  color: #fff;
  border-radius: 999px;
  font-size: 10px;
  padding: 1px 6px;
}

.card {
  background: #fff;
  border: 1px solid #d6dbe1;
  border-radius: 10px;
  padding: 16px;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tabla th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #718096;
  border-bottom: 1px solid #e2e8ed;
  padding: 6px 8px;
}

.tabla td {
  border-bottom: 1px solid #eef1f4;
  padding: 8px;
  color: #2d3748;
  vertical-align: middle;
}

.tabla tr.inactivo td {
  opacity: 0.55;
}

.email-cell {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}

.acciones-col {
  white-space: nowrap;
}

.punto {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #cbd5e0;
  margin-right: 5px;
}

.punto.on {
  background: #27ae60;
}

.etiqueta {
  display: inline-block;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  background: #edf2f7;
  color: #4a5568;
  border-radius: 4px;
  padding: 1px 5px;
  margin-left: 5px;
}

.etiqueta--admin {
  background: #2c3e50;
  color: #fff;
}

.id-cell {
  font-family: monospace;
  font-size: 10px;
  color: #a0aec0;
  margin-left: 5px;
}

/* Aviso de datos: informativo, no bloquea nada. */
.nota-fila {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.45;
  color: #4a5568;
  background: #f7fafc;
  border-left: 2px solid #cbd5e0;
  padding: 5px 8px;
  border-radius: 0 4px 4px 0;
}

/* Permiso que no funciona: hay que actuar. */
.alerta-fila {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.45;
  color: #9c4221;
  background: #fffaf0;
  border-left: 2px solid #dd6b20;
  padding: 5px 8px;
  border-radius: 0 4px 4px 0;
}

.alerta-fila .btn-mini {
  margin-top: 4px;
  margin-right: 0;
}

.estado {
  font-size: 11px;
  font-weight: 600;
}

.estado--ok {
  color: #1e8449;
}

.estado--off {
  color: #a0aec0;
}

.motivo {
  font-size: 11px;
  color: #b7791f;
  cursor: help;
  border-bottom: 1px dotted #b7791f;
}

.btn {
  background: #27ae60;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 16px;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn-mini {
  background: #edf2f7;
  border: 1px solid #d6dbe1;
  border-radius: 6px;
  font-size: 11px;
  padding: 4px 9px;
  cursor: pointer;
  color: #2d3748;
  margin-right: 4px;
}

.btn-mini.peligro {
  background: #fdeceb;
  border-color: #f5b7b1;
  color: #a93226;
}

label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 12px;
}

label input,
label select {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 8px 10px;
  border: 1px solid #d6dbe1;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 400;
  color: #1a202c;
  background: #fff;
}

label small {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  font-weight: 400;
  color: #718096;
}

.opt {
  font-weight: 400;
  color: #718096;
}

.ayuda,
.nota {
  font-size: 12px;
  color: #718096;
  line-height: 1.5;
}

.nota {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px solid #eef1f4;
}

.vacio {
  text-align: center;
  color: #718096;
  font-size: 13px;
  padding: 18px 8px;
}

.buscador {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.buscador input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #d6dbe1;
  border-radius: 8px;
  font-size: 14px;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 60;
}

.modal-caja {
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  width: 100%;
  max-width: 400px;
}

.modal-caja h3 {
  margin: 0 0 14px;
  font-size: 16px;
  color: #2c3e50;
}

.modal-acciones {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

@media (max-width: 640px) {
  .tabla thead {
    display: none;
  }

  .tabla,
  .tabla tbody,
  .tabla tr,
  .tabla td {
    display: block;
    width: 100%;
  }

  .tabla tr {
    border: 1px solid #e2e8ed;
    border-radius: 8px;
    margin-bottom: 10px;
    padding: 6px;
  }

  .tabla td {
    border: none;
    padding: 4px 6px;
  }

  .acciones-col {
    white-space: normal;
  }
}
</style>
