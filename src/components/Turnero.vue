<template>
  <div class="turnero-wrapper">
    <div class="top-bar">
      <div class="back-arrow" @click="$router.push('/menu')">
        <span class="arrow">←</span>
      </div>
      <button class="mis-turnos-btn" @click="abrirMisTurnos">
        <v-icon size="20">mdi-format-list-bulleted</v-icon>
        <span>Mis turnos</span>
      </button>
    </div>

    <h1 class="page-title">Sacar turno</h1>
    <p class="page-subtitle">Reservá el SUM o el Quincho en simples pasos</p>

    <!-- Selector de utilidad -->
    <div class="utilidad-selector">
      <button
        v-for="u in utilidades"
        :key="u.tipo"
        :class="['utilidad-card', u.tipo, { active: utilidad === u.tipo }]"
        :style="utilidad === u.tipo ? { background: u.color, borderColor: u.color } : {}"
        @click="seleccionarUtilidad(u.tipo)"
      >
        <v-icon size="26" :color="utilidad === u.tipo ? 'white' : u.color">{{ u.icon }}</v-icon>
        <span>{{ u.nombre }}</span>
      </button>
    </div>

    <!-- Selector de fecha -->
    <div class="date-selector">
      <v-locale-provider locale="es">
        <v-menu v-model="mostrarCalendario" :close-on-content-click="false" location="bottom">
          <template #activator="{ props: menuProps }">
            <button class="date-trigger" v-bind="menuProps">
              <v-icon size="20">mdi-calendar-month-outline</v-icon>
              <span>{{ fechaLegible }}</span>
              <v-icon size="18">mdi-chevron-down</v-icon>
            </button>
          </template>

          <v-date-picker
            v-model="fechaSeleccionadaDate"
            :min="fechaMin"
            :max="fechaMax"
            first-day-of-week="1"
            hide-header
            show-adjacent-months
            @update:model-value="mostrarCalendario = false"
          />
        </v-menu>
      </v-locale-provider>
      <span class="date-range-hint">Disponible con hasta 3 meses de anticipación</span>
    </div>

    <div v-if="cargandoDisponibilidad" class="estado-info">
      <v-progress-circular indeterminate color="deep-orange" size="28" />
      <span>Cargando disponibilidad...</span>
    </div>

    <div v-else-if="errorDisponibilidad" class="estado-info error-text">
      {{ errorDisponibilidad }}
    </div>

    <div v-else class="bloques-grid">
      <button
        v-for="bloque in bloques"
        :key="bloque.key"
        :class="['bloque-card', bloque.estado, { selected: isSelected(bloque) }]"
        :disabled="bloque.estado !== 'disponible'"
        @click="seleccionarBloque(bloque)"
      >
        <span class="bloque-label">{{ bloque.label }}</span>
        <span class="bloque-horario">{{ bloque.horaInicio }} a {{ bloque.horaFin }}hs</span>
        <span v-if="bloque.estado !== 'pasado'" class="bloque-estado">
          {{ bloque.estado === 'ocupado' ? 'Ocupado' : 'Disponible' }}
        </span>
      </button>
    </div>

    <!-- Referencias -->
    <div class="legend">
      <span class="legend-item"><span class="dot disponible"></span> Disponible</span>
      <span class="legend-item"><span class="dot seleccionado"></span> Seleccionado</span>
      <span class="legend-item"><span class="dot ocupado"></span> Ocupado</span>
    </div>

    <!-- Barra flotante de confirmación -->
    <transition name="slide-up">
      <div v-if="bloqueElegido" class="floating-bar">
        <div class="floating-info">
          <v-icon color="white">{{ utilidadActiva.icon }}</v-icon>
          <div>
            <strong>{{ utilidadActiva.nombre }}</strong>
            <span>{{ fechaLegible }} · {{ bloqueElegido.label }} ({{ bloqueElegido.horaInicio }} a {{ bloqueElegido.horaFin }}hs)</span>
          </div>
        </div>
        <div class="floating-actions">
          <v-btn variant="text" class="cancel-btn" @click="cancelarSeleccion">Cancelar</v-btn>
          <v-btn color="deep-orange" @click="abrirConfirmacion">Reservar turno</v-btn>
        </div>
      </div>
    </transition>

    <!-- Modal de confirmación -->
    <v-dialog v-model="showConfirm" max-width="420px">
      <v-card>
        <v-card-title class="text-h6">Confirmar reserva</v-card-title>
        <v-card-text>
          <p><v-icon size="18" class="mr-1">mdi-domain</v-icon> <strong>Utilidad:</strong> {{ utilidadActiva.nombre }}</p>
          <p><v-icon size="18" class="mr-1">mdi-calendar</v-icon> <strong>Fecha:</strong> {{ fechaLegible }}</p>
          <p><v-icon size="18" class="mr-1">mdi-clock-outline</v-icon> <strong>Horario:</strong> {{ bloqueElegido?.label }} ({{ bloqueElegido?.horaInicio }} a {{ bloqueElegido?.horaFin }}hs)</p>

          <v-select
            v-if="lotes.length > 1"
            v-model="loteSeleccionado"
            :items="lotes"
            label="Lote"
            density="comfortable"
            class="mt-3"
          />

          <div v-if="errorReserva" class="error-message">{{ errorReserva }}</div>
          <div v-if="mensajeExito" class="success-message">{{ mensajeExito }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showConfirm = false" :disabled="confirmando">Volver</v-btn>
          <v-btn color="deep-orange" :loading="confirmando" @click="confirmarTurno">Confirmar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Mis turnos -->
    <v-dialog v-model="showMisTurnos" max-width="560px">
      <v-card>
        <v-card-title class="text-h6">Mis turnos</v-card-title>
        <v-card-text>
          <div v-if="cargandoMisTurnos" class="estado-info">
            <v-progress-circular indeterminate color="deep-orange" size="28" />
            <span>Cargando tus turnos...</span>
          </div>

          <div v-else-if="misTurnos.length === 0" class="estado-info">
            Todavía no reservaste ningún turno.
          </div>

          <div v-else class="mis-turnos-list">
            <div v-for="turno in misTurnos" :key="turno.id" class="turno-item">
              <div class="turno-info">
                <v-icon :color="utilidadInfo(turno.cancha.tipo).color">
                  {{ utilidadInfo(turno.cancha.tipo).icon }}
                </v-icon>
                <div>
                  <strong>{{ turno.cancha.nombre }}</strong>
                  <span>{{ formatearFecha(turno.fecha) }} · {{ turno.hora_inicio.slice(0, 5) }} a {{ turno.hora_fin.slice(0, 5) }} hs</span>
                </div>
              </div>

              <div class="turno-actions">
                <span :class="['badge', turno.estado]">{{ turno.estado === 'reservado' ? 'Reservado' : 'Cancelado' }}</span>
                <v-btn
                  v-if="turno.estado === 'reservado'"
                  size="small"
                  variant="text"
                  color="deep-orange"
                  :disabled="!puedeCancelar(turno)"
                  @click="abrirConfirmacionCancelar(turno)"
                >
                  Cancelar
                </v-btn>
              </div>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showMisTurnos = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal de confirmación de cancelación -->
    <v-dialog v-model="showCancelConfirm" max-width="420px">
      <v-card>
        <v-card-title class="text-h6">¿Cancelar este turno?</v-card-title>
        <v-card-text v-if="turnoACancelar">
          <p><strong>Espacio:</strong> {{ turnoACancelar.cancha.nombre }}</p>
          <p><strong>Fecha:</strong> {{ formatearFecha(turnoACancelar.fecha) }} · {{ turnoACancelar.hora_inicio.slice(0, 5) }} a {{ turnoACancelar.hora_fin.slice(0, 5) }} hs</p>
          <p class="cancel-warning">Esta acción no se puede deshacer.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showCancelConfirm = false" :disabled="cancelando">No, volver</v-btn>
          <v-btn color="deep-orange" :loading="cancelando" @click="confirmarCancelacion">Sí, cancelar turno</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar genérico -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3500">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script setup>
// El turnero de fútbol/tenis (con selector por tabs y grilla horaria) quedó
// deshabilitado desde 2026-08-28 en favor de SUM y Quincho, que se reservan
// por bloque (mañana / tarde-noche) en vez de por hora. El componente viejo
// se conserva completo en Turnero.futbol-tenis.legacy.vue.bak.
import { ref, computed, watch, onMounted } from 'vue';
import api from '@/axios';

const utilidades = [
  { tipo: 'sum', nombre: 'SUM', icon: 'mdi-account-group', color: '#3454a0' },
  { tipo: 'quincho', nombre: 'Quincho', icon: 'mdi-grill', color: '#b5651d' },
];

const utilidad = ref('sum');
const utilidadActiva = computed(() => utilidades.find((u) => u.tipo === utilidad.value));
function utilidadInfo(tipo) {
  return utilidades.find((u) => u.tipo === tipo) || utilidades[0];
}

const showConfirm = ref(false);
const confirmando = ref(false);
const mensajeExito = ref('');
const errorReserva = ref('');
const bloqueElegido = ref(null);

const showCancelConfirm = ref(false);
const cancelando = ref(false);
const turnoACancelar = ref(null);

const cargandoDisponibilidad = ref(false);
const errorDisponibilidad = ref('');
const bloques = ref([]);
const capacidad = ref(0);

const showMisTurnos = ref(false);
const cargandoMisTurnos = ref(false);
const misTurnos = ref([]);

const lotes = ref([]);
const loteSeleccionado = ref(null);

const snackbar = ref({ show: false, text: '', color: 'success' });

const userEmail = localStorage.getItem('user') || '';

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_ANIO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function isoLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function medianocheLocal(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// El turnero acepta reservas de hoy a 3 meses hacia adelante. Como los límites
// se calculan a partir de "ahora" en cada carga del componente, la ventana se
// va corriendo sola un día para adelante a medida que pasan los días.
const fechaMin = medianocheLocal(new Date());
const fechaMax = medianocheLocal(new Date());
fechaMax.setMonth(fechaMax.getMonth() + 3);

const mostrarCalendario = ref(false);
const fechaSeleccionadaDate = ref(new Date(fechaMin));
const fechaSeleccionada = computed(() => isoLocal(fechaSeleccionadaDate.value));

function mostrarSnackbar(text, color = 'success') {
  snackbar.value = { show: true, text, color };
}

async function cargarDisponibilidad() {
  cargandoDisponibilidad.value = true;
  errorDisponibilidad.value = '';

  try {
    const { data } = await api.get('/turnero/disponibilidad', {
      params: { tipo: utilidad.value, fecha: fechaSeleccionada.value },
    });
    bloques.value = data.bloques;
    capacidad.value = data.capacidad;
  } catch (error) {
    errorDisponibilidad.value = 'No se pudo cargar la disponibilidad. Intentá nuevamente.';
    console.error(error);
  } finally {
    cargandoDisponibilidad.value = false;
  }
}

async function cargarMisTurnos() {
  if (!userEmail) return;

  cargandoMisTurnos.value = true;
  try {
    const { data } = await api.get('/turnero/mis-turnos', { params: { email: userEmail } });
    misTurnos.value = data;
  } catch (error) {
    console.error(error);
  } finally {
    cargandoMisTurnos.value = false;
  }
}

async function cargarLotes() {
  if (!userEmail) return;

  try {
    const { data } = await api.get(`/lotes-por-user/${userEmail}`);
    lotes.value = data.map((l) => l.nlote).filter(Boolean);
    if (lotes.value.length > 0) {
      loteSeleccionado.value = lotes.value[0];
    }
  } catch (error) {
    console.error('No se pudieron cargar los lotes del propietario', error);
  }
}

watch([utilidad, fechaSeleccionada], () => {
  bloqueElegido.value = null;
  cargarDisponibilidad();
});

onMounted(() => {
  cargarDisponibilidad();
  cargarLotes();
});

function seleccionarUtilidad(tipo) {
  utilidad.value = tipo;
}

function isSelected(bloque) {
  return bloqueElegido.value?.key === bloque.key;
}

function seleccionarBloque(bloque) {
  if (bloque.estado !== 'disponible') return;

  if (isSelected(bloque)) {
    bloqueElegido.value = null;
    return;
  }

  bloqueElegido.value = {
    key: bloque.key,
    label: bloque.label,
    horaInicio: bloque.horaInicio,
    horaFin: bloque.horaFin,
  };
}

function cancelarSeleccion() {
  bloqueElegido.value = null;
}

function abrirConfirmacion() {
  errorReserva.value = '';
  mensajeExito.value = '';
  showConfirm.value = true;
}

function abrirMisTurnos() {
  showMisTurnos.value = true;
  cargarMisTurnos();
}

const fechaLegible = computed(() => {
  const d = fechaSeleccionadaDate.value;
  const texto = `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} de ${MESES_ANIO[d.getMonth()]}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
});

function formatearFecha(fechaIso) {
  const fecha = new Date(fechaIso);
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function puedeCancelar(turno) {
  const fechaHora = new Date(`${turno.fecha.slice(0, 10)}T${turno.hora_inicio}`);
  const horasRestantes = (fechaHora.getTime() - Date.now()) / (1000 * 60 * 60);
  return horasRestantes >= 24;
}

async function confirmarTurno() {
  if (!userEmail) {
    errorReserva.value = 'No se encontró tu sesión, volvé a iniciar sesión.';
    return;
  }

  confirmando.value = true;
  errorReserva.value = '';

  try {
    await api.post('/turnero/reservar', {
      email: userEmail,
      tipo: utilidad.value,
      nlote: loteSeleccionado.value,
      fecha: fechaSeleccionada.value,
      bloque: bloqueElegido.value.key,
    });

    mensajeExito.value = '¡Turno reservado con éxito!';
    setTimeout(() => {
      showConfirm.value = false;
      mensajeExito.value = '';
      bloqueElegido.value = null;
      cargarDisponibilidad();
    }, 1200);
  } catch (error) {
    errorReserva.value = error.response?.data?.message || 'Ocurrió un error al reservar el turno.';
  } finally {
    confirmando.value = false;
  }
}

function abrirConfirmacionCancelar(turno) {
  turnoACancelar.value = turno;
  showCancelConfirm.value = true;
}

async function confirmarCancelacion() {
  if (!turnoACancelar.value) return;

  cancelando.value = true;
  try {
    await api.post(`/turnero/cancelar/${turnoACancelar.value.id}`, { email: userEmail });
    mostrarSnackbar('Turno cancelado correctamente.', 'success');
    showCancelConfirm.value = false;
    turnoACancelar.value = null;
    cargarMisTurnos();
  } catch (error) {
    mostrarSnackbar(error.response?.data?.message || 'No se pudo cancelar el turno.', 'error');
  } finally {
    cancelando.value = false;
  }
}
</script>

<style scoped>
.turnero-wrapper {
  padding: 1.5rem;
  padding-bottom: 6rem;
  font-family: 'Roboto', sans-serif;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-arrow {
  font-size: 1.5rem;
  cursor: pointer;
}

.mis-turnos-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid #e0e0e0;
  background: white;
  color: #2c3e50;
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.mis-turnos-btn:hover {
  border-color: #ff8328;
  color: #ff8328;
}

.page-title {
  text-align: center;
  color: #2c3e50;
  font-size: 2rem;
  margin-top: 0.5rem;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  text-align: center;
  color: #6b7785;
  margin-bottom: 1.5rem;
}

.estado-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 2rem;
  color: #6b7785;
}

.error-text {
  color: #c0392b;
}

/* Selector de utilidad */
.utilidad-selector {
  display: flex;
  gap: 1rem;
  justify-content: center;
  width: 90%;
  max-width: 480px;
  margin: 0 auto 1.5rem auto;
}

.utilidad-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 1rem 0.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 14px;
  background: white;
  color: #2c3e50;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.utilidad-card:hover {
  border-color: #ff8328;
}

.utilidad-card.active {
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

/* Selector de fecha */
.date-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1.5rem;
}

/* Va sobre fondo blanco fijo, así que el color de texto se declara explícito:
   si se hereda, en modo oscuro el navegador lo pinta casi blanco y el
   contenido queda invisible. */
.date-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  border: 1px solid #e0e0e0;
  border-radius: 999px;
  background: #ffffff;
  color: #2c3e50;
  color-scheme: light;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.date-trigger:hover {
  border-color: #ff8328;
  color: #ff8328;
}

.date-range-hint {
  font-size: 0.78rem;
  color: #6b7785;
}

/* Bloques horarios */
.bloques-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  justify-content: center;
  width: 90%;
  max-width: 640px;
  margin: 0.5rem auto 0;
}

.bloque-card {
  flex: 1;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 14px;
  padding: 1.5rem 1rem;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.bloque-label {
  font-size: 1.1rem;
  font-weight: 700;
  color: #2c3e50;
}

.bloque-horario {
  font-size: 0.9rem;
  color: #6b7785;
}

.bloque-estado {
  margin-top: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #1f8a4c;
}

.bloque-card.disponible:hover {
  border-color: #ff8328;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.bloque-card.selected {
  background: #ff8328;
  border-color: #ff8328;
}

.bloque-card.selected .bloque-label,
.bloque-card.selected .bloque-horario,
.bloque-card.selected .bloque-estado {
  color: white;
}

.bloque-card.pasado {
  background: #f7f7f7;
  cursor: not-allowed;
}

.bloque-card.pasado .bloque-label,
.bloque-card.pasado .bloque-horario {
  color: #cfcfcf;
}

.bloque-card.ocupado {
  background: #f7f7f7;
  cursor: not-allowed;
}

.bloque-card.ocupado .bloque-label {
  color: #b0b0b0;
  text-decoration: line-through;
}

.bloque-card.ocupado .bloque-horario {
  color: #cfcfcf;
}

.bloque-card.ocupado .bloque-estado {
  color: #b0b0b0;
}

/* Leyenda */
.legend {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin: 1.5rem auto 0;
  flex-wrap: wrap;
  font-size: 0.9rem;
  color: #555;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.dot.disponible {
  background: white;
  border: 1px solid #e0e0e0;
}

.dot.seleccionado {
  background: #ff8328;
}

.dot.ocupado {
  background: #f1f1f1;
  border: 1px solid #b0b0b0;
}

/* Mis turnos */
.mis-turnos-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.turno-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 0.9rem 1.1rem;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.turno-info {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.turno-info div {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  color: #2c3e50;
}

.turno-info span {
  font-size: 0.8rem;
  color: #6b7785;
}

.turno-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
}

.badge.reservado {
  background: #e8f6ee;
  color: #1f8a4c;
}

.badge.cancelado {
  background: #fdecea;
  color: #c0392b;
}

/* Barra flotante */
.floating-bar {
  position: fixed;
  left: 50%;
  bottom: 1.25rem;
  transform: translateX(-50%);
  width: min(520px, 92vw);
  background: #2c3e50;
  color: white;
  border-radius: 14px;
  padding: 0.85rem 1.1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  z-index: 20;
  flex-wrap: wrap;
}

.floating-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.floating-info div {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
}

.floating-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.cancel-btn {
  color: white !important;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

.success-message {
  color: green;
  margin-top: 10px;
  font-weight: bold;
}

.error-message {
  color: red;
  margin-top: 10px;
  font-weight: bold;
}

.cancel-warning {
  color: #c0392b;
  font-size: 0.85rem;
  margin-top: 0.75rem;
}

@media (max-width: 480px) {
  .utilidad-selector {
    width: 100%;
  }

  .bloques-grid {
    width: 100%;
  }

  .bloque-card {
    min-width: 45%;
    padding: 1.1rem 0.6rem;
  }

  .floating-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .floating-actions {
    justify-content: flex-end;
  }

  .mis-turnos-btn span {
    display: none;
  }
}
</style>
