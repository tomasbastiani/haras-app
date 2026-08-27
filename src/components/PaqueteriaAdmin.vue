<template>
  <div class="paq-admin">
    <div class="header">
      <button class="back-button" @click="goBack">←</button>
      <h2>Oficina de Paquetería</h2>
    </div>

    <div v-if="sinAcceso" class="empty-state">
      No tenés acceso a la paquetería. Pedile a la administración que te habilite
      como operario.
    </div>

    <template v-else>
      <div class="tabs">
        <button :class="['tab', { activo: tab === 'recibir' }]" @click="tab = 'recibir'">
          Recibir paquete
        </button>
        <button :class="['tab', { activo: tab === 'bandeja' }]" @click="tab = 'bandeja'">
          Bandeja
          <span v-if="pendientes" class="tab-badge">{{ pendientes }}</span>
        </button>
      </div>

      <!-- ============ ALTA ============ -->
      <form v-if="tab === 'recibir'" class="form-card" @submit.prevent="registrar">
        <div class="grid">
          <div class="campo">
            <label>Lote *</label>
            <input v-model="alta.nlote" type="text" required placeholder="Ej: 45" />
          </div>
          <div class="campo">
            <label>Correo *</label>
            <select v-model="alta.correo" required>
              <option v-for="(t, k) in CORREOS" :key="k" :value="k">{{ t }}</option>
            </select>
          </div>
          <div class="campo">
            <label>Tipo *</label>
            <select v-model="alta.tipo" required>
              <option v-for="(t, k) in TIPOS" :key="k" :value="k">{{ t }}</option>
            </select>
          </div>
          <div class="campo">
            <label>Ubicación en depósito</label>
            <input v-model="alta.ubicacion" type="text" placeholder="Ej: Estante A3" />
          </div>
          <div class="campo">
            <label>Destinatario (según etiqueta)</label>
            <input v-model="alta.destinatario" type="text" />
          </div>
          <div class="campo">
            <label>Tracking</label>
            <input v-model="alta.tracking" type="text" />
          </div>
        </div>

        <div class="campo">
          <label>Observaciones</label>
          <textarea v-model="alta.observaciones" rows="2"></textarea>
        </div>

        <button class="btn-principal" type="submit" :disabled="guardando">
          {{ guardando ? 'Registrando…' : 'Registrar y avisar al propietario' }}
        </button>

        <p v-if="altaResultado" :class="altaResultado.sin_propietario ? 'aviso' : 'ok'">
          {{ altaResultado.message }}
          <span v-if="altaResultado.sin_propietario">
            El paquete quedó cargado como <strong>{{ altaResultado.paquete.codigo }}</strong>,
            pero sólo se va a poder entregar por método manual.
          </span>
          <span v-else>
            Código del paquete: <strong>{{ altaResultado.paquete.codigo }}</strong> —
            escribilo en la etiqueta.
          </span>
        </p>
      </form>

      <!-- ============ BANDEJA ============ -->
      <div v-else>
        <div class="filtros">
          <input v-model="filtroTexto" type="text" placeholder="Código, nombre, tracking o lote" @keyup.enter="cargar" />
          <select v-model="filtroEstado" @change="cargar">
            <option value="recibido">Para retirar</option>
            <option value="retirado">Retirados</option>
            <option value="devuelto">Devueltos</option>
            <option value="">Todos</option>
          </select>
          <label class="check">
            <input v-model="soloSinPropietario" type="checkbox" @change="cargar" />
            Sin propietario vinculado
          </label>
          <button class="btn-secundario" @click="cargar">Buscar</button>
        </div>

        <div class="spinner-mounted-container" v-if="isLoading">
          <span class="spinner-mounted"></span>
        </div>

        <div v-else-if="paquetes.length === 0" class="empty-state">
          No hay paquetes para este filtro.
        </div>

        <div v-else class="tabla-wrap">
          <table class="tabla">
            <thead>
              <tr>
                <th>Código</th>
                <th>Lote</th>
                <th>Propietario</th>
                <th>Correo</th>
                <th>Ubicación</th>
                <th>Ingreso</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in paquetes" :key="p.id">
                <td class="mono col-codigo">{{ p.codigo }}</td>
                <td data-label="Lote">{{ p.nlote }}</td>
                <td data-label="Propietario">
                  <span v-if="p.user">{{ p.user.nombre || p.user.email }}</span>
                  <span v-else class="sin-prop" :title="p.email_destino || 'Sin email en gastos comunes'">
                    ⚠ sin vincular
                  </span>
                </td>
                <td data-label="Correo">{{ CORREOS[p.correo] || p.correo }}</td>
                <td data-label="Ubicación">{{ p.ubicacion || '-' }}</td>
                <td data-label="Ingreso">{{ formatearFecha(p.recibido_at) }}</td>
                <td class="col-estado">
                  <span :class="['estado-badge', p.estado]">{{ ESTADOS[p.estado] }}</span>
                  <span v-if="p.entrega" :class="['solidez', solidez(p.entrega)]">
                    {{ solidezLabel(p.entrega) }}
                  </span>
                </td>
                <td :class="['acciones', { vacia: p.estado !== 'recibido' }]">
                  <template v-if="p.estado === 'recibido'">
                    <button class="link" @click="abrirEntrega(p)">Entregar</button>
                    <button class="link gris" @click="abrirDevolucion(p)">Devolver</button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <p v-if="mensajeError" class="error-message">{{ mensajeError }}</p>

    <!-- ============ MODAL ENTREGA ============ -->
    <v-dialog v-model="showEntrega" max-width="560px" persistent>
      <v-card v-if="paqueteAEntregar">
        <v-card-title class="text-h6">
          Entregar {{ paqueteAEntregar.codigo }} · Lote {{ paqueteAEntregar.nlote }}
        </v-card-title>

        <v-card-text>
          <div class="metodo-tabs">
            <button
              :class="['metodo', { activo: entrega.metodo === 'pin' }]"
              :disabled="pinBloqueado"
              @click="entrega.metodo = 'pin'"
            >
              Con PIN
            </button>
            <button :class="['metodo', { activo: entrega.metodo === 'manual' }]" @click="entrega.metodo = 'manual'">
              Manual
            </button>
          </div>

          <div v-if="entrega.metodo === 'pin'" class="campo">
            <label>PIN que dicta quien retira *</label>
            <input
              v-model="entrega.pin"
              class="pin-input"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="······"
            />
            <p v-if="pinError" class="pin-error">{{ pinError }}</p>
          </div>

          <div v-else class="campo">
            <label>Motivo de la entrega sin PIN *</label>
            <textarea
              v-model="entrega.motivo_manual"
              rows="2"
              placeholder="Ej: el propietario no tiene el celular a mano"
            ></textarea>
            <p class="aviso-manual">
              La entrega manual queda registrada como evidencia más débil y se
              revisa en los reportes.
            </p>
          </div>

          <div class="campo">
            <label>Quién retira *</label>
            <select v-model="entrega.retirado_por">
              <option value="titular">El titular</option>
              <option value="autorizado">Una persona autorizada</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div class="grid-2">
            <div class="campo">
              <label>Nombre y apellido *</label>
              <input v-model="entrega.nombre" type="text" />
            </div>
            <div class="campo">
              <label>DNI</label>
              <input v-model="entrega.dni" type="text" inputmode="numeric" />
            </div>
          </div>

          <div class="campo">
            <label>Firma de quien retira *</label>
            <canvas
              ref="canvasFirma"
              class="canvas-firma"
              @pointerdown="empezarTrazo"
              @pointermove="dibujar"
              @pointerup="terminarTrazo"
              @pointerleave="terminarTrazo"
            ></canvas>
            <button class="link" type="button" @click="limpiarFirma">Borrar firma</button>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cerrarEntrega" :disabled="entregando">Cancelar</v-btn>
          <v-btn color="green-darken-2" :loading="entregando" @click="confirmarEntrega">
            Confirmar entrega
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ============ MODAL DEVOLUCIÓN ============ -->
    <v-dialog v-model="showDevolucion" max-width="440px">
      <v-card v-if="paqueteADevolver">
        <v-card-title class="text-h6">Devolver {{ paqueteADevolver.codigo }}</v-card-title>
        <v-card-text>
          <p>El paquete se lo lleva el correo. Queda asentado en el seguimiento.</p>
          <v-textarea v-model="motivoDevolucion" label="Motivo *" rows="2" maxlength="300" counter="300" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showDevolucion = false" :disabled="devolviendo">Cancelar</v-btn>
          <v-btn color="deep-orange" :loading="devolviendo" @click="confirmarDevolucion">
            Registrar devolución
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/axios';

const router = useRouter();
const goBack = () => router.push('/menu');

const CORREOS = {
  mercadolibre: 'Mercado Libre',
  andreani: 'Andreani',
  oca: 'OCA',
  correo_argentino: 'Correo Argentino',
  urbano: 'Urbano',
  otro: 'Otro',
};

const TIPOS = {
  sobre: 'Sobre',
  caja_chica: 'Caja chica',
  caja_grande: 'Caja grande',
  bulto: 'Bulto',
};

const ESTADOS = {
  recibido: 'Para retirar',
  retirado: 'Retirado',
  devuelto: 'Devuelto',
  vencido: 'Vencido',
};

const tab = ref('recibir');
const sinAcceso = ref(false);
const isLoading = ref(false);
const mensajeError = ref('');

// ---------- Alta ----------
const altaVacia = () => ({
  nlote: '',
  destinatario: '',
  correo: 'mercadolibre',
  tracking: '',
  tipo: 'caja_chica',
  ubicacion: '',
  observaciones: '',
});
const alta = reactive(altaVacia());
const guardando = ref(false);
const altaResultado = ref(null);

async function registrar() {
  guardando.value = true;
  mensajeError.value = '';
  altaResultado.value = null;
  try {
    const { data } = await axios.post('/paquetes', { ...alta });
    altaResultado.value = data;
    // La ubicación se mantiene: normalmente se cargan varios paquetes seguidos
    // al mismo estante y volver a tipearla en cada uno hace perder tiempo.
    const ubicacion = alta.ubicacion;
    Object.assign(alta, altaVacia(), { ubicacion });
  } catch (e) {
    mensajeError.value = e.response?.data?.message || 'No pudimos registrar el paquete.';
  } finally {
    guardando.value = false;
  }
}

// ---------- Bandeja ----------
const paquetes = ref([]);
const filtroTexto = ref('');
const filtroEstado = ref('recibido');
const soloSinPropietario = ref(false);

const pendientes = computed(() => paquetes.value.filter((p) => p.estado === 'recibido').length);

async function cargar() {
  isLoading.value = true;
  mensajeError.value = '';
  try {
    const { data } = await axios.get('/paquetes', {
      params: {
        estado: filtroEstado.value || undefined,
        q: filtroTexto.value || undefined,
        sin_propietario: soloSinPropietario.value ? 1 : undefined,
      },
    });
    paquetes.value = data;
  } catch (e) {
    if (e.response?.status === 403) {
      sinAcceso.value = true;
    } else {
      mensajeError.value = 'No pudimos cargar la bandeja.';
    }
  } finally {
    isLoading.value = false;
  }
}

function solidez(entrega) {
  if (entrega.ack_estado === 'desconocido') return 'impugnada';
  if (entrega.metodo === 'pin' && entrega.ack_estado === 'confirmado') return 'alta';
  if (entrega.metodo === 'pin') return 'media';
  return 'baja';
}

const SOLIDEZ = {
  alta: 'PIN + acuse',
  media: 'PIN',
  baja: 'manual',
  impugnada: 'impugnada',
};
const solidezLabel = (e) => SOLIDEZ[solidez(e)];

function formatearFecha(valor) {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------- Entrega ----------
const showEntrega = ref(false);
const paqueteAEntregar = ref(null);
const entregando = ref(false);
const pinError = ref('');
const pinBloqueado = ref(false);
const entrega = reactive({
  metodo: 'pin',
  pin: '',
  motivo_manual: '',
  retirado_por: 'titular',
  nombre: '',
  dni: '',
});

function abrirEntrega(p) {
  paqueteAEntregar.value = p;
  pinError.value = '';
  pinBloqueado.value = !!p.pin_bloqueado_at;
  Object.assign(entrega, {
    metodo: pinBloqueado.value ? 'manual' : 'pin',
    pin: '',
    motivo_manual: pinBloqueado.value ? 'PIN bloqueado por intentos fallidos' : '',
    retirado_por: 'titular',
    nombre: '',
    dni: '',
  });
  showEntrega.value = true;
}

function cerrarEntrega() {
  showEntrega.value = false;
  paqueteAEntregar.value = null;
}

async function confirmarEntrega() {
  mensajeError.value = '';
  pinError.value = '';

  if (!entrega.nombre.trim()) {
    mensajeError.value = 'Falta el nombre de quien retira.';
    return;
  }
  if (firmaVacia.value) {
    mensajeError.value = 'Falta la firma de quien retira.';
    return;
  }

  entregando.value = true;
  try {
    await axios.post(`/paquetes/${paqueteAEntregar.value.id}/entregar`, {
      ...entrega,
      firma: canvasFirma.value.toDataURL('image/png'),
    });
    cerrarEntrega();
    await cargar();
  } catch (e) {
    const data = e.response?.data;
    if (e.response?.status === 422 && data?.bloqueado !== undefined) {
      pinError.value = data.message;
      if (data.bloqueado) {
        pinBloqueado.value = true;
        entrega.metodo = 'manual';
        entrega.motivo_manual = 'PIN bloqueado por intentos fallidos';
      }
    } else if (e.response?.status === 423) {
      pinBloqueado.value = true;
      entrega.metodo = 'manual';
      pinError.value = data.message;
    } else {
      mensajeError.value = data?.message || 'No pudimos registrar la entrega.';
    }
  } finally {
    entregando.value = false;
  }
}

// ---------- Firma ----------
const canvasFirma = ref(null);
const firmaVacia = ref(true);
let dibujando = false;

// El canvas se monta recién cuando se abre el diálogo, así que hay que
// dimensionarlo después de que Vuetify lo inserte en el DOM.
watch(showEntrega, async (abierto) => {
  if (!abierto) return;
  await nextTick();
  prepararCanvas();
});

function prepararCanvas() {
  const canvas = canvasFirma.value;
  if (!canvas) return;

  // Escalamos por devicePixelRatio para que el trazo no se vea pixelado en
  // los celulares, que es donde se va a firmar siempre.
  const ratio = window.devicePixelRatio || 1;
  const ancho = canvas.offsetWidth;
  const alto = 160;

  canvas.width = ancho * ratio;
  canvas.height = alto * ratio;
  canvas.style.height = `${alto}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2c3e50';

  firmaVacia.value = true;
}

function posicion(evento) {
  const rect = canvasFirma.value.getBoundingClientRect();
  return { x: evento.clientX - rect.left, y: evento.clientY - rect.top };
}

function empezarTrazo(evento) {
  dibujando = true;
  canvasFirma.value.setPointerCapture(evento.pointerId);
  const { x, y } = posicion(evento);
  const ctx = canvasFirma.value.getContext('2d');
  ctx.beginPath();
  ctx.moveTo(x, y);
  firmaVacia.value = false;
}

function dibujar(evento) {
  if (!dibujando) return;
  evento.preventDefault();
  const { x, y } = posicion(evento);
  const ctx = canvasFirma.value.getContext('2d');
  ctx.lineTo(x, y);
  ctx.stroke();
}

function terminarTrazo() {
  dibujando = false;
}

function limpiarFirma() {
  const canvas = canvasFirma.value;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  firmaVacia.value = true;
}

// ---------- Devolución ----------
const showDevolucion = ref(false);
const paqueteADevolver = ref(null);
const motivoDevolucion = ref('');
const devolviendo = ref(false);

function abrirDevolucion(p) {
  paqueteADevolver.value = p;
  motivoDevolucion.value = '';
  showDevolucion.value = true;
}

async function confirmarDevolucion() {
  if (!motivoDevolucion.value.trim()) return;
  devolviendo.value = true;
  try {
    await axios.post(`/paquetes/${paqueteADevolver.value.id}/devolver`, {
      motivo: motivoDevolucion.value,
    });
    showDevolucion.value = false;
    await cargar();
  } catch (e) {
    mensajeError.value = e.response?.data?.message || 'No pudimos registrar la devolución.';
  } finally {
    devolviendo.value = false;
  }
}

onMounted(cargar);
</script>

<style scoped>
.paq-admin {
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

.tabs {
  display: flex;
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
  background: #e53935;
  color: #fff;
  border-radius: 9px;
  font-size: 0.7rem;
  padding: 0 0.35rem;
}

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.9rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

/* En celulares angostos nombre y DNI no entran uno al lado del otro. */
@media (max-width: 430px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 700px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.campo {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.9rem;
  /* Sin esto el ancho mínimo intrínseco del input (size=20) desborda la
     columna de la grilla y el campo queda cortado en pantallas angostas. */
  min-width: 0;
}

.campo label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #5a6a66;
  margin-bottom: 0.25rem;
}

.campo input,
.campo select,
.campo textarea {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  border: 1px solid #dde3e1;
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  font-size: 0.92rem;
  font-family: inherit;
  color: #2c3e50;
  background: #fff;
}

.campo input:focus,
.campo select:focus,
.campo textarea:focus {
  outline: 2px solid #27ae60;
  outline-offset: -1px;
}

.pin-input {
  font-family: monospace;
  font-size: 1.6rem;
  letter-spacing: 0.5rem;
  text-align: center;
}

.pin-error {
  margin: 0.35rem 0 0;
  color: #c0392b;
  font-size: 0.82rem;
  font-weight: 600;
}

.aviso-manual {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  color: #b9770e;
}

.metodo-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.metodo {
  flex: 1;
  border: 1px solid #dde3e1;
  background: #fff;
  border-radius: 8px;
  padding: 0.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  color: #2c3e50;
}

.metodo.activo {
  background: #2c3e50;
  border-color: #2c3e50;
  color: #fff;
}

.metodo:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.canvas-firma {
  width: 100%;
  height: 160px;
  border: 1px dashed #b9c4c0;
  border-radius: 8px;
  background: #fdfdfd;
  touch-action: none;
  cursor: crosshair;
}

.btn-principal {
  width: 100%;
  background: #27ae60;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
}

.btn-principal:disabled {
  opacity: 0.6;
  cursor: default;
}

.btn-secundario {
  background: #2c3e50;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  margin-bottom: 1rem;
}

.filtros input[type='text'],
.filtros select {
  border: 1px solid #dde3e1;
  border-radius: 8px;
  padding: 0.5rem 0.7rem;
  font-size: 0.9rem;
  font-family: inherit;
}

.filtros input[type='text'] {
  flex: 1;
  min-width: 200px;
}

.check {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #5a6a66;
}

.tabla-wrap {
  overflow-x: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.tabla th {
  text-align: left;
  padding: 0.7rem 0.8rem;
  background: #f6f8f7;
  color: #5a6a66;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.tabla td {
  padding: 0.7rem 0.8rem;
  border-top: 1px solid #eef1f0;
  color: #2c3e50;
  white-space: nowrap;
}

.mono {
  font-family: monospace;
  font-weight: 600;
}

.sin-prop {
  color: #b9770e;
  font-weight: 600;
  cursor: help;
}

.estado-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
}

.estado-badge.recibido { background: #f39c12; }
.estado-badge.retirado { background: #27ae60; }
.estado-badge.devuelto { background: #7f8c8d; }
.estado-badge.vencido  { background: #c0392b; }

.solidez {
  display: inline-block;
  margin-left: 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.solidez.alta { background: #e8f6ee; color: #1e8449; }
.solidez.media { background: #fdf3e3; color: #b9770e; }
.solidez.baja { background: #fdecea; color: #c0392b; }
.solidez.impugnada { background: #c0392b; color: #fff; }

.acciones {
  display: flex;
  gap: 0.6rem;
}

.link {
  background: none;
  border: none;
  color: #2980b9;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.link.gris {
  color: #7f8c8d;
}

.empty-state {
  text-align: center;
  color: #7a7a7a;
  padding: 3rem 1rem;
}

.ok {
  margin-top: 1rem;
  color: #1e8449;
  font-weight: 600;
}

.aviso {
  margin-top: 1rem;
  color: #b9770e;
  font-weight: 600;
}

.error-message {
  margin-top: 1.2rem;
  color: #c0392b;
  text-align: center;
  font-weight: 600;
}

/* ============ BANDEJA EN MOBILE ============
   Ocho columnas no entran en un celular y el scroll horizontal esconde las
   acciones. Cada fila pasa a ser una tarjeta: código y estado arriba, el
   resto como pares etiqueta/valor y los botones abajo a lo ancho. */
@media (max-width: 700px) {
  .tabla-wrap {
    overflow-x: visible;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
  }

  .tabla,
  .tabla tbody,
  .tabla tr,
  .tabla td {
    display: block;
    width: 100%;
  }

  .tabla thead {
    display: none;
  }

  .tabla tr {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.35rem 0.75rem;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    padding: 0.85rem 1rem;
    margin-bottom: 0.75rem;
  }

  .tabla td {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0;
    border-top: none;
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: right;
  }

  .tabla td[data-label]::before {
    content: attr(data-label);
    flex: 0 0 auto;
    color: #5a6a66;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    text-align: left;
  }

  /* Código y estado forman la cabecera de la tarjeta. */
  .tabla td.col-codigo {
    order: -2;
    flex: 1 1 auto;
    width: auto;
    font-size: 1rem;
    text-align: left;
  }

  .tabla td.col-estado {
    order: -1;
    flex: 0 0 auto;
    width: auto;
    justify-content: flex-end;
  }

  .tabla td.acciones {
    justify-content: stretch;
    gap: 0.5rem;
    margin-top: 0.35rem;
  }

  .tabla td.acciones.vacia {
    display: none;
  }

  .tabla td.acciones .link {
    flex: 1;
    border: 1px solid #2980b9;
    border-radius: 8px;
    padding: 0.5rem;
    font-size: 0.9rem;
  }

  .tabla td.acciones .link.gris {
    border-color: #b9c4c0;
  }

  .filtros .btn-secundario {
    flex: 1;
  }
}

.spinner-mounted-container {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

.spinner-mounted {
  width: 34px;
  height: 34px;
  border: 3px solid #d9e2df;
  border-top-color: #27ae60;
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

@keyframes girar {
  to { transform: rotate(360deg); }
}
</style>
