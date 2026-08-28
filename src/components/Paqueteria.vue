<template>
  <div class="paq-container">
    <div class="header">
      <button class="back-button" @click="goBack">←</button>
      <h2>Mis Paquetes</h2>
    </div>

    <div class="spinner-mounted-container" v-if="isLoading">
      <span class="spinner-mounted"></span>
    </div>

    <div v-else-if="paquetes.length === 0" class="empty-state">
      No tenés paquetes registrados en la oficina.
    </div>

    <div v-else class="lista">
      <div v-for="p in paquetes" :key="p.id" class="paquete-card">
        <div class="card-top">
          <div>
            <span :class="['estado-badge', p.estado]">{{ estadoLabel(p.estado) }}</span>
            <span class="codigo">{{ p.codigo }}</span>
          </div>
          <span class="fecha">{{ formatearFecha(p.recibido_at) }}</span>
        </div>

        <div class="datos">
          <p><strong>Correo:</strong> {{ correoLabel(p.correo) }}</p>
          <p><strong>Tipo:</strong> {{ tipoLabel(p.tipo) }}</p>
          <p v-if="p.ubicacion"><strong>Ubicación:</strong> {{ p.ubicacion }}</p>
          <p v-if="p.destinatario"><strong>A nombre de:</strong> {{ p.destinatario }}</p>
        </div>

        <!-- Foto que le sacó la oficina al recibirlo: sirve para reconocerlo y
             para ver en qué estado llegó. -->
        <button v-if="p.foto_path" class="btn-ver-foto" @click="verFoto(p)">
          📷 Ver foto del paquete
        </button>

        <!-- PIN de retiro: sólo mientras el paquete siga en la oficina -->
        <div v-if="p.estado === 'recibido' && p.pin" class="pin-box">
          <p class="pin-label">PIN de retiro</p>
          <p class="pin">{{ p.pin }}</p>
          <p class="pin-help">
            Decilo en la oficina para retirar el paquete. Compartilo únicamente con
            quien autorices a retirarlo en tu nombre.
          </p>
        </div>

        <!-- Acuse de recibo -->
        <div v-if="p.entrega" class="entrega-box">
          <p class="entrega-titulo">
            Entregado el {{ formatearFecha(p.entrega.entregado_at) }}
          </p>
          <p class="entrega-detalle">
            Retirado por <strong>{{ p.entrega.nombre }}</strong>
            <span v-if="p.entrega.dni"> (DNI {{ p.entrega.dni }})</span>
            · Acta {{ p.entrega.folio }}
          </p>

          <button v-if="p.entrega.tiene_foto" class="btn-ver-foto" @click="verFoto(p, 'entrega')">
            📷 Ver foto de la entrega
          </button>

          <div v-if="p.entrega.ack_estado === 'pendiente'" class="ack-acciones">
            <p class="ack-pregunta">¿Reconocés esta entrega?</p>
            <div class="ack-botones">
              <button
                class="btn-confirmar"
                :disabled="procesandoId === p.id"
                @click="acusar(p, 'confirmar')"
              >
                Sí, la recibí
              </button>
              <button
                class="btn-desconocer"
                :disabled="procesandoId === p.id"
                @click="abrirDesconocer(p)"
              >
                No la reconozco
              </button>
            </div>
          </div>

          <p v-else :class="['ack-estado', p.entrega.ack_estado]">
            {{ ackLabel(p.entrega.ack_estado) }}
          </p>
        </div>

        <button class="toggle-timeline" @click="alternarTimeline(p)">
          {{ abierto === p.id ? 'Ocultar seguimiento' : 'Ver seguimiento' }}
        </button>

        <div v-if="abierto === p.id" class="timeline">
          <div v-if="cargandoTimeline" class="timeline-cargando">Cargando…</div>
          <div v-for="e in eventos" :key="e.id" class="evento">
            <span class="punto"></span>
            <div class="evento-cuerpo">
              <p class="evento-tipo">{{ eventoLabel(e.tipo) }}</p>
              <p v-if="e.nota" class="evento-nota">{{ e.nota }}</p>
              <p class="evento-fecha">
                {{ formatearFecha(e.created_at) }}
                <span v-if="e.por"> · {{ e.por }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-if="mensajeExito" class="success-message">{{ mensajeExito }}</p>
    <p v-if="mensajeError" class="error-message">{{ mensajeError }}</p>

    <!-- Desconocer una entrega es un hecho serio: pedimos confirmación y motivo -->
    <v-dialog v-model="showFoto" max-width="520px">
      <v-card>
        <v-card-title class="text-h6">{{ tituloFoto }}</v-card-title>
        <v-card-text class="foto-modal-body">
          <div v-if="cargandoFoto" class="spinner-mounted-container">
            <span class="spinner-mounted"></span>
          </div>
          <img v-else-if="fotoUrl" :src="fotoUrl" alt="Foto del paquete" class="foto-modal-img" />
          <p v-else class="foto-modal-error">No pudimos cargar la foto.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cerrarFoto">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDesconocer" max-width="460px">
      <v-card>
        <v-card-title class="text-h6">¿Desconocés esta entrega?</v-card-title>
        <v-card-text>
          <p>
            Vas a dejar asentado que no recibiste este paquete. Se le avisa de
            inmediato a la administración y queda registrado en el expediente.
          </p>
          <v-textarea
            v-model="motivoDesconocer"
            label="Contanos qué pasó (opcional)"
            rows="3"
            counter="500"
            maxlength="500"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showDesconocer = false" :disabled="procesandoId !== null">
            Volver
          </v-btn>
          <v-btn
            color="deep-orange"
            :loading="procesandoId === paqueteADesconocer?.id"
            @click="confirmarDesconocer"
          >
            Sí, desconozco la entrega
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/axios';

const router = useRouter();
const goBack = () => router.push('/menu');

const isLoading = ref(true);
const paquetes = ref([]);
const abierto = ref(null);
const eventos = ref([]);
const cargandoTimeline = ref(false);
const procesandoId = ref(null);
const mensajeExito = ref('');
const mensajeError = ref('');

// La foto va por endpoint autenticado, así que no se puede poner directo en un
// <img src>: se pide con el token y se arma un object URL al abrir el modal.
const showFoto = ref(false);
const paqueteFoto = ref(null);
const fotoUrl = ref('');
const cargandoFoto = ref(false);

// `cual` distingue la foto del ingreso de la del momento de la entrega: son
// dos endpoints distintos y el vecino puede querer ver cualquiera de las dos.
const tituloFoto = ref('');

async function verFoto(paquete, cual = 'ingreso') {
  paqueteFoto.value = paquete;
  tituloFoto.value = cual === 'entrega'
    ? `Foto de la entrega · ${paquete.codigo}`
    : `Foto de ${paquete.codigo}`;
  fotoUrl.value = '';
  showFoto.value = true;
  cargandoFoto.value = true;

  const ruta = cual === 'entrega'
    ? `/paquetes/${paquete.id}/entrega-foto`
    : `/paquetes/${paquete.id}/foto`;

  try {
    const { data } = await axios.get(ruta, { responseType: 'blob' });
    fotoUrl.value = URL.createObjectURL(data);
  } catch (e) {
    fotoUrl.value = '';
  } finally {
    cargandoFoto.value = false;
  }
}

function cerrarFoto() {
  if (fotoUrl.value) URL.revokeObjectURL(fotoUrl.value);
  fotoUrl.value = '';
  showFoto.value = false;
}

const showDesconocer = ref(false);
const paqueteADesconocer = ref(null);
const motivoDesconocer = ref('');

const ESTADOS = {
  recibido: 'Para retirar',
  retirado: 'Retirado',
  devuelto: 'Devuelto al correo',
  vencido: 'Vencido',
};

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

const EVENTOS = {
  ingreso: 'Ingresó a paquetería',
  notificado: 'Te avisamos que llegó',
  recordatorio: 'Te enviamos un recordatorio',
  entregado: 'Entregado',
  ack_confirmado: 'Confirmaste la recepción',
  ack_desconocido: 'Desconociste la entrega',
  ack_tacito: 'Cerrado sin respuesta',
  pin_fallido: 'Intento de PIN incorrecto',
  observacion: 'Observación de la oficina',
  devuelto: 'Devuelto al correo',
  vencido: 'Vencido por falta de retiro',
};

const ACKS = {
  confirmado: '✓ Confirmaste la recepción',
  desconocido: '⚠ Desconociste esta entrega. Administración fue notificada.',
  tacito: 'Cerrado sin respuesta dentro del plazo',
};

const estadoLabel = (e) => ESTADOS[e] || e;
const correoLabel = (c) => CORREOS[c] || c;
const tipoLabel = (t) => TIPOS[t] || t;
const eventoLabel = (t) => EVENTOS[t] || t;
const ackLabel = (a) => ACKS[a] || a;

function formatearFecha(valor) {
  if (!valor) return '-';
  const d = new Date(valor);
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function cargarPaquetes() {
  isLoading.value = true;
  try {
    const { data } = await axios.get('/paquetes/mios');
    paquetes.value = data;
  } catch (e) {
    mensajeError.value = 'No pudimos cargar tus paquetes. Intentá de nuevo.';
  } finally {
    isLoading.value = false;
  }
}

async function alternarTimeline(p) {
  if (abierto.value === p.id) {
    abierto.value = null;
    return;
  }
  abierto.value = p.id;
  eventos.value = [];
  cargandoTimeline.value = true;
  try {
    const { data } = await axios.get(`/paquetes/${p.id}`);
    eventos.value = data.eventos;
  } catch (e) {
    mensajeError.value = 'No pudimos cargar el seguimiento.';
  } finally {
    cargandoTimeline.value = false;
  }
}

function abrirDesconocer(p) {
  paqueteADesconocer.value = p;
  motivoDesconocer.value = '';
  showDesconocer.value = true;
}

async function confirmarDesconocer() {
  await acusar(paqueteADesconocer.value, 'desconocer', motivoDesconocer.value);
  showDesconocer.value = false;
}

async function acusar(paquete, accion, nota = '') {
  procesandoId.value = paquete.id;
  mensajeExito.value = '';
  mensajeError.value = '';
  try {
    const { data } = await axios.post(`/paquetes/${paquete.id}/${accion}`, { nota });
    mensajeExito.value = data.message;
    await cargarPaquetes();
  } catch (e) {
    mensajeError.value = e.response?.data?.message || 'No pudimos registrar tu respuesta.';
  } finally {
    procesandoId.value = null;
  }
}

onMounted(cargarPaquetes);
</script>

<style scoped>
.paq-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
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

.empty-state {
  text-align: center;
  color: #7a7a7a;
  padding: 3rem 1rem;
}

.lista {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.paquete-card {
  background: #fff;
  border-radius: 12px;
  padding: 1.1rem;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.estado-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #fff;
  margin-right: 0.5rem;
}

.estado-badge.recibido { background: #f39c12; }
.estado-badge.retirado { background: #27ae60; }
.estado-badge.devuelto { background: #7f8c8d; }
.estado-badge.vencido  { background: #c0392b; }

.codigo {
  font-family: monospace;
  font-weight: 600;
  color: #2c3e50;
}

.fecha {
  font-size: 0.8rem;
  color: #8a8a8a;
}

.datos p {
  margin: 0.15rem 0;
  font-size: 0.9rem;
  color: #444;
}

.pin-box {
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #2ecc71, #1e8449);
  border-radius: 10px;
  text-align: center;
  color: #fff;
}

.pin-label {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.9;
}

.pin {
  margin: 0.3rem 0;
  font-family: monospace;
  font-size: 2.4rem;
  font-weight: 700;
  letter-spacing: 0.35rem;
}

.pin-help {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.92;
  line-height: 1.35;
}

.entrega-box {
  margin-top: 1rem;
  padding: 0.9rem;
  background: #f6f8f7;
  border-radius: 10px;
  border-left: 4px solid #27ae60;
}

.entrega-titulo {
  margin: 0 0 0.2rem;
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.9rem;
}

.entrega-detalle {
  margin: 0;
  font-size: 0.85rem;
  color: #555;
}

.ack-acciones {
  margin-top: 0.85rem;
}

.ack-pregunta {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #2c3e50;
}

.ack-botones {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.btn-confirmar,
.btn-desconocer {
  border: none;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirmar {
  background: #27ae60;
  color: #fff;
}

.btn-desconocer {
  background: #fff;
  color: #c0392b;
  border: 1px solid #e0b4ae;
}

.btn-confirmar:disabled,
.btn-desconocer:disabled {
  opacity: 0.6;
  cursor: default;
}

.ack-estado {
  margin: 0.7rem 0 0;
  font-size: 0.85rem;
  font-weight: 600;
}

.ack-estado.confirmado { color: #1e8449; }
.ack-estado.desconocido { color: #c0392b; }
.ack-estado.tacito { color: #7f8c8d; }

.toggle-timeline {
  margin-top: 0.9rem;
  background: none;
  border: none;
  color: #2980b9;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.timeline {
  margin-top: 0.9rem;
  padding-left: 0.4rem;
  border-left: 2px solid #e4e7e6;
}

.timeline-cargando {
  font-size: 0.85rem;
  color: #8a8a8a;
  padding-left: 0.8rem;
}

.evento {
  position: relative;
  padding: 0.4rem 0 0.4rem 1rem;
}

.punto {
  position: absolute;
  left: -6px;
  top: 0.75rem;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #27ae60;
  border: 2px solid #fff;
}

.evento-tipo {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 600;
  color: #2c3e50;
}

.evento-nota {
  margin: 0.1rem 0 0;
  font-size: 0.82rem;
  color: #555;
}

.evento-fecha {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  color: #8a8a8a;
}

.success-message {
  margin-top: 1.2rem;
  color: #1e8449;
  text-align: center;
  font-weight: 600;
}

.error-message {
  margin-top: 1.2rem;
  color: #c0392b;
  text-align: center;
  font-weight: 600;
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

/* ===== Foto del paquete ===== */

.btn-ver-foto {
  background: #fff;
  border: 1px solid #dde3e1;
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: inherit;
  color: #2c3e50;
  cursor: pointer;
  margin-top: 0.5rem;
}

.btn-ver-foto:active {
  background: #f0f3f1;
}

.foto-modal-body {
  min-height: 160px;
}

.foto-modal-img {
  display: block;
  width: 100%;
  max-height: 65vh;
  object-fit: contain;
  border-radius: 8px;
  background: #f5f5f4;
}

.foto-modal-error {
  color: #c0392b;
  font-size: 0.85rem;
}
</style>
