<template>
  <div class="admin-container">
    <div class="header">
      <button class="back-button" @click="goBack">←</button>
      <h2>Administración de Turnos</h2>
    </div>

    <div class="filters">
      <div class="filter-row">
        <div class="filter-item">
          <label>Fecha:</label>
          <input v-model="filtroFecha" type="date" />
        </div>

        <div class="filter-item">
          <label>Deporte:</label>
          <select v-model="filtroTipo">
            <option value="">Todos</option>
            <option value="futbol">Fútbol</option>
            <option value="tenis">Tenis</option>
          </select>
        </div>

        <div class="filter-item">
          <label>Buscar propietario:</label>
          <input v-model="filtroTexto" type="text" placeholder="Nombre, email o lote" />
        </div>

        <div class="filter-item button-item">
          <button class="clear-button" @click="limpiarFiltros">Limpiar filtros</button>
        </div>
      </div>
    </div>

    <div class="spinner-mounted-container" v-if="isLoading">
      <span class="spinner-mounted"></span>
    </div>

    <div v-else-if="turnosFiltrados.length === 0" class="empty-state">
      No hay turnos reservados para este filtro.
    </div>

    <div v-else class="table-container">
      <table class="turnos-table">
        <thead>
          <tr>
            <th>Cancha</th>
            <th>Deporte</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Propietario</th>
            <th>Email</th>
            <th>Lote</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="turno in turnosFiltrados" :key="turno.id">
            <td>{{ turno.cancha }}</td>
            <td>
              <span :class="['tipo-badge', turno.tipo]">
                {{ turno.tipo === 'futbol' ? 'Fútbol' : 'Tenis' }}
              </span>
            </td>
            <td>{{ formatearFecha(turno.fecha) }}</td>
            <td>{{ turno.hora }}</td>
            <td>{{ turno.propietario.nombre || '-' }}</td>
            <td>{{ turno.propietario.email }}</td>
            <td>{{ turno.nlote || '-' }}</td>
            <td>
              <button class="cancel-link" :disabled="cancelandoId === turno.id" @click="abrirConfirmacionCancelar(turno)">
                {{ cancelandoId === turno.id ? 'Cancelando...' : 'Cancelar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="mensajeExito" class="success-message">{{ mensajeExito }}</p>
    <p v-if="mensajeError" class="error-message">{{ mensajeError }}</p>

    <!-- Modal de confirmación de cancelación -->
    <v-dialog v-model="showCancelConfirm" max-width="420px">
      <v-card>
        <v-card-title class="text-h6">¿Cancelar este turno?</v-card-title>
        <v-card-text v-if="turnoACancelar">
          <p><strong>Cancha:</strong> {{ turnoACancelar.cancha }}</p>
          <p><strong>Fecha:</strong> {{ formatearFecha(turnoACancelar.fecha) }} · {{ turnoACancelar.hora }} hs</p>
          <p><strong>Propietario:</strong> {{ turnoACancelar.propietario.nombre || turnoACancelar.propietario.email }}</p>
          <p class="cancel-warning">Esta acción no se puede deshacer.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showCancelConfirm = false" :disabled="cancelandoId !== null">No, volver</v-btn>
          <v-btn color="deep-orange" :loading="cancelandoId === turnoACancelar?.id" @click="confirmarCancelacion">
            Sí, cancelar turno
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/axios';

const router = useRouter();
const goBack = () => router.push('/menu');

const adminEmail = localStorage.getItem('user') || '';

const isLoading = ref(true);
const turnos = ref([]);
const cancelandoId = ref(null);
const mensajeExito = ref('');
const mensajeError = ref('');

const showCancelConfirm = ref(false);
const turnoACancelar = ref(null);

const filtroFecha = ref('');
const filtroTipo = ref('');
const filtroTexto = ref('');

async function cargarTurnos() {
  isLoading.value = true;

  try {
    const params = {};
    if (filtroFecha.value) params.fecha = filtroFecha.value;
    if (filtroTipo.value) params.tipo = filtroTipo.value;

    const { data } = await axios.get('/turnero/admin/turnos', { params });
    turnos.value = data;
  } catch (error) {
    mensajeError.value = 'No se pudieron cargar los turnos.';
    console.error(error);
  } finally {
    isLoading.value = false;
  }
}

const turnosFiltrados = computed(() => {
  if (!filtroTexto.value) return turnos.value;

  const texto = filtroTexto.value.toLowerCase();
  return turnos.value.filter((t) =>
    (t.propietario.nombre || '').toLowerCase().includes(texto) ||
    (t.propietario.email || '').toLowerCase().includes(texto) ||
    (t.nlote || '').toLowerCase().includes(texto)
  );
});

function formatearFecha(fechaIso) {
  const fecha = new Date(`${fechaIso}T00:00:00`);
  return fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function limpiarFiltros() {
  filtroFecha.value = '';
  filtroTipo.value = '';
  filtroTexto.value = '';
}

function abrirConfirmacionCancelar(turno) {
  turnoACancelar.value = turno;
  showCancelConfirm.value = true;
}

async function confirmarCancelacion() {
  if (!turnoACancelar.value) return;

  const turno = turnoACancelar.value;
  mensajeExito.value = '';
  mensajeError.value = '';
  cancelandoId.value = turno.id;

  try {
    await axios.post(`/turnero/cancelar/${turno.id}`, {
      email: adminEmail,
      is_admin: true,
    });

    mensajeExito.value = `Turno de ${turno.propietario.nombre || turno.propietario.email} cancelado.`;
    showCancelConfirm.value = false;
    turnoACancelar.value = null;
    await cargarTurnos();
  } catch (error) {
    mensajeError.value = error.response?.data?.message || 'No se pudo cancelar el turno.';
  } finally {
    cancelandoId.value = null;
  }
}

watch([filtroFecha, filtroTipo], cargarTurnos);

onMounted(cargarTurnos);
</script>

<style scoped>
.admin-container {
  padding: 2rem;
  max-width: 1100px;
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
}

.back-button {
  font-size: 22px;
  background: none;
  border: none;
  color: #333;
  cursor: pointer;
  margin-right: 10px;
  transition: color 0.2s;
}

.back-button:hover {
  color: #ff8328;
}

h2 {
  font-size: 24px;
  margin: 0;
  color: #2c3e50;
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

.filter-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 180px;
}

.filter-item label {
  font-weight: bold;
  margin-bottom: 6px;
  color: #2c3e50;
}

.filter-item input,
.filter-item select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.button-item {
  justify-content: flex-end;
}

.clear-button {
  padding: 9px 14px;
  border: none;
  border-radius: 6px;
  background-color: #eee;
  cursor: pointer;
  font-weight: 600;
  color: #444;
  transition: background-color 0.2s;
}

.clear-button:hover {
  background-color: #ddd;
}

.table-container {
  overflow-x: auto;
}

.turnos-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.turnos-table th,
.turnos-table td {
  border: 1px solid #e2e2e2;
  padding: 10px;
  text-align: center;
}

.turnos-table th {
  background-color: #f8f8f8;
}

.tipo-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
}

.tipo-badge.futbol {
  background: #e8f6ee;
  color: #1f6b40;
}

.tipo-badge.tenis {
  background: #fbf6df;
  color: #a99a1a;
}

.cancel-link {
  border: none;
  background: none;
  color: #c0392b;
  font-weight: 600;
  cursor: pointer;
}

.cancel-link:hover {
  text-decoration: underline;
}

.cancel-link:disabled {
  color: #aaa;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  color: #6b7785;
  padding: 3rem 0;
}

.spinner-mounted-container {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

.spinner-mounted {
  width: 32px;
  height: 32px;
  border: 3px solid #eee;
  border-top: 3px solid #ff8328;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.success-message {
  text-align: center;
  color: green;
  font-weight: bold;
  margin-top: 1rem;
}

.error-message {
  text-align: center;
  color: red;
  font-weight: bold;
  margin-top: 1rem;
}

.cancel-warning {
  color: #c0392b;
  font-size: 0.85rem;
  margin-top: 0.75rem;
}

@media (max-width: 480px) {
  .admin-container {
    padding: 1rem;
  }

  .filter-row {
    flex-direction: column;
  }
}
</style>
