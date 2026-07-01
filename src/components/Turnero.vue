<template>
  <div class="turnero-wrapper">
    <div class="back-arrow" @click="$router.push('/menu')">
      <span class="arrow">←</span>
    </div>

    <h1 class="page-title">Turnero de Canchas</h1>
    <p class="page-subtitle">Reservá tu cancha de fútbol o tenis en simples pasos</p>

    <v-tabs v-model="vista" class="custom-tabs" background-color="white" grow>
      <v-tab value="futbol">
        <v-icon left>mdi-soccer</v-icon>
        Fútbol
      </v-tab>
      <v-tab value="tenis">
        <v-icon left>mdi-tennis</v-icon>
        Tenis
      </v-tab>
      <v-tab value="mis-turnos">
        <v-icon left>mdi-format-list-bulleted</v-icon>
        Mis turnos
      </v-tab>
    </v-tabs>

    <v-window v-model="vista" class="tab-content">
      <!-- FUTBOL / TENIS -->
      <v-window-item v-for="deporte in ['futbol', 'tenis']" :key="deporte" :value="deporte">
        <!-- Selector de fecha -->
        <div class="date-strip">
          <button
            v-for="dia in dias"
            :key="dia.iso"
            :class="['date-chip', { active: dia.iso === fechaSeleccionada }]"
            @click="seleccionarFecha(dia.iso)"
          >
            <span class="date-dow">{{ dia.diaSemana }}</span>
            <span class="date-num">{{ dia.diaNum }}</span>
            <span class="date-month">{{ dia.mes }}</span>
          </button>
        </div>

        <div v-if="cargandoDisponibilidad" class="estado-info">
          <v-progress-circular indeterminate color="deep-orange" size="28" />
          <span>Cargando disponibilidad...</span>
        </div>

        <div v-else-if="errorDisponibilidad" class="estado-info error-text">
          {{ errorDisponibilidad }}
        </div>

        <div v-else class="canchas-grid">
          <div class="cancha-card single">
            <div :class="['cancha-header', deporte]">
              <v-icon color="white">{{ deporte === 'futbol' ? 'mdi-soccer-field' : 'mdi-tennis-ball' }}</v-icon>
              <h3>{{ deporte === 'futbol' ? 'Fútbol' : 'Tenis' }} · {{ capacidad }} canchas</h3>
            </div>
            <div class="slots-grid">
              <button
                v-for="slot in horarios"
                :key="slot.hora"
                :class="['slot', slot.estado, { selected: isSelected(slot) }]"
                :disabled="slot.estado !== 'disponible'"
                @click="seleccionarSlot(slot)"
              >
                <span class="slot-hora">{{ slot.hora }}</span>
                <span v-if="slot.estado !== 'pasado'" class="slot-cupos">
                  {{ slot.estado === 'ocupado' ? 'Completo' : slot.disponibles + '/' + capacidad }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Referencias -->
        <div class="legend">
          <span class="legend-item"><span class="dot disponible"></span> Disponible</span>
          <span class="legend-item"><span class="dot seleccionado"></span> Seleccionado</span>
          <span class="legend-item"><span class="dot ocupado"></span> Ocupado</span>
        </div>
      </v-window-item>

      <!-- MIS TURNOS -->
      <v-window-item value="mis-turnos">
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
              <v-icon :color="turno.cancha.tipo === 'futbol' ? '#2e8b57' : '#a99a1a'">
                {{ turno.cancha.tipo === 'futbol' ? 'mdi-soccer' : 'mdi-tennis' }}
              </v-icon>
              <div>
                <strong>{{ turno.cancha.nombre }}</strong>
                <span>{{ formatearFecha(turno.fecha) }} · {{ turno.hora_inicio.slice(0, 5) }} hs</span>
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
      </v-window-item>
    </v-window>

    <!-- Barra flotante de confirmación -->
    <transition name="slide-up">
      <div v-if="slotElegido" class="floating-bar">
        <div class="floating-info">
          <v-icon color="white">{{ vista === 'futbol' ? 'mdi-soccer' : 'mdi-tennis' }}</v-icon>
          <div>
            <strong>{{ vista === 'futbol' ? 'Fútbol' : 'Tenis' }}</strong>
            <span>{{ fechaLegible }} · {{ slotElegido.hora }} hs</span>
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
          <p><v-icon size="18" class="mr-1">mdi-stadium-variant</v-icon> <strong>Deporte:</strong> {{ vista === 'futbol' ? 'Fútbol' : 'Tenis' }}</p>
          <p><v-icon size="18" class="mr-1">mdi-calendar</v-icon> <strong>Fecha:</strong> {{ fechaLegible }}</p>
          <p><v-icon size="18" class="mr-1">mdi-clock-outline</v-icon> <strong>Horario:</strong> {{ slotElegido?.hora }} hs</p>

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

    <!-- Modal de confirmación de cancelación -->
    <v-dialog v-model="showCancelConfirm" max-width="420px">
      <v-card>
        <v-card-title class="text-h6">¿Cancelar este turno?</v-card-title>
        <v-card-text v-if="turnoACancelar">
          <p><v-icon size="18" class="mr-1">mdi-stadium-variant</v-icon> <strong>Cancha:</strong> {{ turnoACancelar.cancha.nombre }}</p>
          <p><v-icon size="18" class="mr-1">mdi-calendar</v-icon> <strong>Fecha:</strong> {{ formatearFecha(turnoACancelar.fecha) }}</p>
          <p><v-icon size="18" class="mr-1">mdi-clock-outline</v-icon> <strong>Horario:</strong> {{ turnoACancelar.hora_inicio.slice(0, 5) }} hs</p>
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
import { ref, computed, watch, onMounted } from 'vue';
import api from '@/axios';

const vista = ref('futbol');
const showConfirm = ref(false);
const confirmando = ref(false);
const mensajeExito = ref('');
const errorReserva = ref('');
const slotElegido = ref(null);

const showCancelConfirm = ref(false);
const cancelando = ref(false);
const turnoACancelar = ref(null);

const cargandoDisponibilidad = ref(false);
const errorDisponibilidad = ref('');
const horarios = ref([]);
const capacidad = ref(0);

const cargandoMisTurnos = ref(false);
const misTurnos = ref([]);

const lotes = ref([]);
const loteSeleccionado = ref(null);

const snackbar = ref({ show: false, text: '', color: 'success' });

const userEmail = localStorage.getItem('user') || '';

function generarDias() {
  const dow = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const out = [];

  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    out.push({
      iso,
      diaSemana: dow[d.getDay()],
      diaNum: d.getDate(),
      mes: meses[d.getMonth()],
    });
  }
  return out;
}

const dias = generarDias();
const fechaSeleccionada = ref(dias[0].iso);

function mostrarSnackbar(text, color = 'success') {
  snackbar.value = { show: true, text, color };
}

async function cargarDisponibilidad() {
  if (vista.value !== 'futbol' && vista.value !== 'tenis') return;

  cargandoDisponibilidad.value = true;
  errorDisponibilidad.value = '';

  try {
    const { data } = await api.get('/turnero/disponibilidad', {
      params: { tipo: vista.value, fecha: fechaSeleccionada.value },
    });
    horarios.value = data.horarios;
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

watch([vista, fechaSeleccionada], () => {
  slotElegido.value = null;
  if (vista.value === 'mis-turnos') {
    cargarMisTurnos();
  } else {
    cargarDisponibilidad();
  }
});

onMounted(() => {
  cargarDisponibilidad();
  cargarLotes();
});

function seleccionarFecha(iso) {
  fechaSeleccionada.value = iso;
}

function isSelected(slot) {
  return slotElegido.value?.hora === slot.hora;
}

function seleccionarSlot(slot) {
  if (slot.estado !== 'disponible') return;

  if (isSelected(slot)) {
    slotElegido.value = null;
    return;
  }

  slotElegido.value = {
    hora: slot.hora,
  };
}

function cancelarSeleccion() {
  slotElegido.value = null;
}

function abrirConfirmacion() {
  errorReserva.value = '';
  mensajeExito.value = '';
  showConfirm.value = true;
}

const fechaLegible = computed(() => {
  const dia = dias.find((d) => d.iso === fechaSeleccionada.value);
  if (!dia) return '';
  return `${dia.diaSemana} ${dia.diaNum} de ${dia.mes}`;
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
      tipo: vista.value,
      nlote: loteSeleccionado.value,
      fecha: fechaSeleccionada.value,
      hora: slotElegido.value.hora,
    });

    mensajeExito.value = '¡Turno reservado con éxito!';
    setTimeout(() => {
      showConfirm.value = false;
      mensajeExito.value = '';
      slotElegido.value = null;
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

.back-arrow {
  font-size: 1.5rem;
  cursor: pointer;
  margin-right: 1rem;
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

.custom-tabs {
  width: 70%;
  margin: 0 auto 1.5rem auto;
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

/* Selector de fecha */
.date-strip {
  display: flex;
  gap: 0.75rem;
  overflow-x: auto;
  padding: 0.5rem 0.25rem 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.date-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 64px;
  padding: 0.6rem 0.4rem;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.date-chip:hover {
  border-color: #ff8328;
}

.date-chip.active {
  background: #ff8328;
  border-color: #ff8328;
  color: white;
  box-shadow: 0 4px 10px rgba(255, 131, 40, 0.35);
}

.date-dow {
  font-size: 0.75rem;
  text-transform: uppercase;
  opacity: 0.8;
}

.date-num {
  font-size: 1.2rem;
  font-weight: 700;
}

.date-month {
  font-size: 0.75rem;
  text-transform: lowercase;
}

/* Grid de canchas */
.tab-content {
  margin-top: 0.5rem;
}

.canchas-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: center;
  width: 90%;
  margin: 0 auto;
}

.cancha-card {
  background: white;
  border-radius: 14px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.cancha-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.cancha-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.9rem 1.1rem;
  color: white;
}

.cancha-header.futbol {
  background: linear-gradient(135deg, #2e8b57, #1f6b40);
}

.cancha-header.tenis {
  background: linear-gradient(135deg, #d8c027, #a99a1a);
}

.cancha-header h3 {
  font-size: 1.05rem;
  margin: 0;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 0.5rem;
  padding: 1rem;
}

.slot {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  color: #2c3e50;
  padding: 0.4rem 0.3rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.slot-hora {
  font-weight: 600;
}

.slot-cupos {
  font-size: 0.68rem;
  opacity: 0.7;
}

.cancha-card.single {
  max-width: 640px;
}

.slot.disponible:hover {
  border-color: #ff8328;
  color: #ff8328;
}

.slot.selected {
  background: #ff8328;
  border-color: #ff8328;
  color: white;
  font-weight: 600;
}

.slot.pasado {
  background: #f7f7f7;
  color: #cfcfcf;
  cursor: not-allowed;
}

.slot.ocupado {
  background: #f1f1f1;
  color: #b0b0b0;
  text-decoration: line-through;
  cursor: not-allowed;
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
  width: 90%;
  max-width: 640px;
  margin: 0 auto;
}

.turno-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  border-radius: 12px;
  padding: 0.9rem 1.1rem;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
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
  .custom-tabs {
    width: 100%;
  }

  .canchas-grid {
    width: 100%;
  }

  .floating-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .floating-actions {
    justify-content: flex-end;
  }
}
</style>
