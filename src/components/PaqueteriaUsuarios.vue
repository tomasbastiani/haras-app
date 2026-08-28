<template>
  <div class="paq-usuarios">
    <div class="header">
      <button class="back-button" @click="goBack">←</button>
      <h2>Cuentas de Paquetería</h2>
    </div>

    <p class="intro">
      Estas cuentas entran directo a la oficina de paquetería. No ven gastos comunes,
      lotes, turnero ni archivos. Son para el personal de portería.
    </p>

    <div v-if="mensajeError" class="alerta error">{{ mensajeError }}</div>
    <div v-if="mensajeOk" class="alerta ok">{{ mensajeOk }}</div>

    <div class="tabs">
      <button :class="['tab', { activo: tab === 'listado' }]" @click="tab = 'listado'">
        Cuentas activas
        <span v-if="usuarios.length" class="tab-badge">{{ usuarios.length }}</span>
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
      <div v-else-if="!usuarios.length" class="vacio">
        Todavía no hay cuentas de paquetería. Creá una desde la pestaña «Crear cuenta».
      </div>
      <table v-else class="tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th class="acciones-col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id">
            <td>{{ u.nombre || '—' }}</td>
            <td class="email-cell">{{ u.email }}</td>
            <td class="acciones-col">
              <button class="btn-mini" @click="abrirReset(u)">Contraseña</button>
              <button class="btn-mini peligro" @click="quitarAcceso(u)">Quitar acceso</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ============ CREAR ============ -->
    <form v-if="tab === 'crear'" class="card" @submit.prevent="crear">
      <p class="ayuda">
        Para personal que todavía no tiene usuario en la app. Si ya tiene uno
        (porque además es propietario), usá «Habilitar existente».
      </p>

      <div class="campo">
        <label>Nombre *</label>
        <input v-model="nuevo.nombre" type="text" maxlength="150" required placeholder="Ej: Portería turno mañana" />
      </div>

      <div class="campo">
        <label>Email *</label>
        <input v-model="nuevo.email" type="email" maxlength="255" required placeholder="porteria@harassantamaria.com.ar" />
      </div>

      <div class="campo">
        <label>Contraseña *</label>
        <input v-model="nuevo.password" type="text" required placeholder="Mínimo 8 caracteres" />
        <small class="hint">
          Al menos 8 caracteres, una mayúscula y un número. Se muestra en claro a
          propósito: se la tenés que dictar a quien va a usar la cuenta.
        </small>
      </div>

      <button class="btn" type="submit" :disabled="creando">
        {{ creando ? 'Creando…' : 'Crear cuenta de paquetería' }}
      </button>
    </form>

    <!-- ============ HABILITAR EXISTENTE ============ -->
    <div v-if="tab === 'habilitar'" class="card">
      <p class="ayuda">
        Convierte una cuenta que ya existe en cuenta de portería. Ojo: a partir de
        ese momento deja de ver gastos comunes y lotes, así que no la uses sobre la
        cuenta de un propietario que además necesita la app como vecino.
      </p>

      <div class="campo">
        <label>Buscar por email o nombre</label>
        <input
          v-model="busqueda"
          type="text"
          placeholder="Mínimo 3 caracteres"
          @keyup.enter="buscar"
        />
      </div>

      <button class="btn" type="button" :disabled="buscando || busqueda.trim().length < 3" @click="buscar">
        {{ buscando ? 'Buscando…' : 'Buscar' }}
      </button>

      <div v-if="busquedaHecha" class="resultados">
        <div v-if="!resultados.length" class="vacio">Ningún usuario coincide con «{{ busqueda }}».</div>
        <table v-else class="tabla">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th class="acciones-col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in resultados" :key="u.id">
              <td>{{ u.nombre || '—' }}</td>
              <td class="email-cell">{{ u.email }}</td>
              <td class="acciones-col">
                <span v-if="u.admin" class="chip">Administrador</span>
                <span v-else-if="u.paqueteria" class="chip verde">Ya habilitada</span>
                <button v-else class="btn-mini" @click="darAcceso(u)">Habilitar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============ MODAL RESET DE CONTRASEÑA ============ -->
    <v-dialog v-model="showReset" max-width="440px">
      <v-card v-if="usuarioReset">
        <v-card-title class="text-h6">Contraseña de {{ usuarioReset.email }}</v-card-title>
        <v-card-text>
          <p class="ayuda">
            Estas cuentas son compartidas por el personal de turno y no tienen un
            email real detrás, así que el cambio lo hacés vos y se la dictás.
          </p>
          <v-text-field
            v-model="passwordNueva"
            label="Nueva contraseña *"
            hint="Mínimo 8 caracteres, una mayúscula y un número"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="reseteando" @click="showReset = false">Cancelar</v-btn>
          <v-btn color="green-darken-2" :loading="reseteando" @click="confirmarReset">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/axios';

const router = useRouter();
const goBack = () => router.push('/menu');

const tab = ref('listado');
const mensajeError = ref('');
const mensajeOk = ref('');

const usuarios = ref([]);
const cargando = ref(true);

function avisar(ok, error = '') {
  mensajeOk.value = ok;
  mensajeError.value = error;
}

async function cargar() {
  cargando.value = true;
  try {
    const { data } = await axios.get('/admin/paqueteria/usuarios');
    usuarios.value = data;
  } catch (e) {
    avisar('', e.response?.data?.message || 'No pudimos cargar las cuentas.');
  } finally {
    cargando.value = false;
  }
}

// ---------- Crear ----------
const nuevo = reactive({ nombre: '', email: '', password: '' });
const creando = ref(false);

async function crear() {
  creando.value = true;
  avisar('');
  try {
    const { data } = await axios.post('/admin/paqueteria/usuarios', { ...nuevo });
    avisar(data.message);
    Object.assign(nuevo, { nombre: '', email: '', password: '' });
    await cargar();
    tab.value = 'listado';
  } catch (e) {
    avisar('', primerError(e, 'No pudimos crear la cuenta.'));
  } finally {
    creando.value = false;
  }
}

// ---------- Habilitar / quitar ----------
const busqueda = ref('');
const resultados = ref([]);
const buscando = ref(false);
const busquedaHecha = ref(false);

async function buscar() {
  if (busqueda.value.trim().length < 3) return;
  buscando.value = true;
  avisar('');
  try {
    const { data } = await axios.get('/admin/paqueteria/usuarios/buscar', {
      params: { q: busqueda.value.trim() },
    });
    resultados.value = data;
    busquedaHecha.value = true;
  } catch (e) {
    avisar('', primerError(e, 'No pudimos buscar.'));
  } finally {
    buscando.value = false;
  }
}

async function cambiarFlag(usuario, valor) {
  avisar('');
  try {
    const { data } = await axios.patch(`/admin/paqueteria/usuarios/${usuario.id}`, {
      paqueteria: valor,
    });
    avisar(data.message);
    usuario.paqueteria = valor;
    await cargar();
  } catch (e) {
    avisar('', primerError(e, 'No pudimos actualizar la cuenta.'));
  }
}

const darAcceso = (u) => cambiarFlag(u, true);

function quitarAcceso(u) {
  if (!confirm(`¿Quitarle el acceso a la oficina de paquetería a ${u.email}?`)) return;
  cambiarFlag(u, false);
}

// ---------- Reset de contraseña ----------
const showReset = ref(false);
const usuarioReset = ref(null);
const passwordNueva = ref('');
const reseteando = ref(false);

function abrirReset(u) {
  usuarioReset.value = u;
  passwordNueva.value = '';
  showReset.value = true;
}

async function confirmarReset() {
  reseteando.value = true;
  avisar('');
  try {
    const { data } = await axios.post(
      `/admin/paqueteria/usuarios/${usuarioReset.value.id}/password`,
      { password: passwordNueva.value }
    );
    avisar(data.message);
    showReset.value = false;
  } catch (e) {
    avisar('', primerError(e, 'No pudimos cambiar la contraseña.'));
  } finally {
    reseteando.value = false;
  }
}

/** El 422 de Laravel trae los mensajes en `errors`; el message genérico no sirve. */
function primerError(e, porDefecto) {
  const errores = e.response?.data?.errors;
  if (errores) return Object.values(errores)[0][0];
  return e.response?.data?.message || porDefecto;
}

onMounted(cargar);
</script>

<style scoped>
.paq-usuarios {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.header h2 {
  color: #2c3e50;
  margin: 0;
}

.back-button {
  background: none;
  border: none;
  font-size: 1.6rem;
  color: #2c3e50;
  cursor: pointer;
  line-height: 1;
}

.intro {
  color: #5a6b7a;
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
}

.alerta {
  border-radius: 8px;
  padding: 0.7rem 0.9rem;
  font-size: 0.88rem;
  margin-bottom: 1rem;
}

.alerta.ok {
  background: #eaf6ef;
  color: #1e8449;
}

.alerta.error {
  background: #fdecea;
  color: #c0392b;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.tab {
  background: #fff;
  border: 1px solid #dde3e1;
  border-radius: 8px;
  padding: 0.55rem 1.1rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: #2c3e50;
  cursor: pointer;
}

.tab.activo {
  background: #27ae60;
  border-color: #27ae60;
  color: #fff;
}

.tab-badge {
  display: inline-block;
  margin-left: 0.4rem;
  background: #2c3e50;
  color: #fff;
  border-radius: 9px;
  font-size: 0.7rem;
  padding: 0 0.35rem;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.ayuda {
  color: #5a6b7a;
  font-size: 0.85rem;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.campo {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.9rem;
}

.campo label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.3rem;
}

.campo input {
  border: 1px solid #dde3e1;
  border-radius: 8px;
  padding: 0.6rem 0.7rem;
  font-size: 0.95rem;
  font-family: inherit;
}

.campo input:focus {
  outline: none;
  border-color: #27ae60;
}

.hint {
  color: #8a8a8a;
  font-size: 0.75rem;
  margin-top: 0.3rem;
  line-height: 1.4;
}

.btn {
  background: #27ae60;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.65rem 1.4rem;
  font-size: 0.92rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.btn-mini {
  background: #fff;
  border: 1px solid #dde3e1;
  border-radius: 6px;
  padding: 0.3rem 0.6rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: #2c3e50;
  font-family: inherit;
  cursor: pointer;
  margin-left: 0.3rem;
}

.btn-mini:first-child {
  margin-left: 0;
}

.btn-mini.peligro {
  color: #c0392b;
  border-color: #f0c6c0;
}

.chip {
  display: inline-block;
  background: #eceeed;
  color: #5a6b7a;
  border-radius: 10px;
  padding: 0.15rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.chip.verde {
  background: #eaf6ef;
  color: #1e8449;
}

.resultados {
  margin-top: 1.25rem;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.tabla th,
.tabla td {
  text-align: left;
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid #eceeed;
}

.tabla th {
  color: #8a8a8a;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.email-cell {
  overflow-wrap: anywhere;
}

.acciones-col {
  text-align: right;
  white-space: nowrap;
}

.vacio {
  color: #8a8a8a;
  font-size: 0.9rem;
  text-align: center;
  padding: 1.5rem 0.5rem;
}

@media (max-width: 600px) {
  .paq-usuarios {
    padding: 1.5rem 0.75rem 3rem;
  }

  .tabla {
    font-size: 0.8rem;
  }

  .acciones-col {
    white-space: normal;
  }

  .btn-mini {
    margin: 0.15rem 0 0 0;
    display: block;
    width: 100%;
  }
}
</style>
