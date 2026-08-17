<template>
  <div class="notifications-center-container">
    <div class="header">
      <button class="back-button" @click="goBack">←</button>
      <h2>Centro de Notificaciones</h2>
    </div>

    <!-- Panel de Composición -->
    <v-card class="pa-6 mb-8 elevation-2 rounded-lg">
      <v-card-title class="text-h5 pb-4">
        <v-icon color="primary" class="mr-2">mdi-send</v-icon>
        Nueva Notificación
      </v-card-title>
      
      <v-form ref="form" v-model="formValid">
        <v-text-field
          v-model="notification.title"
          label="Título de la Notificación"
          placeholder="Ej: Aviso de mantenimiento"
          variant="outlined"
          prepend-inner-icon="mdi-format-title"
          :rules="[v => !!v || 'El título es obligatorio']"
          required
        ></v-text-field>

        <v-textarea
          v-model="notification.body"
          label="Mensaje / Cuerpo"
          placeholder="Ej: Mañana se cortará el agua de 10 a 12hs por reparaciones."
          variant="outlined"
          prepend-inner-icon="mdi-text-subject"
          rows="3"
          :rules="[v => !!v || 'El mensaje es obligatorio']"
          required
        ></v-textarea>

        <v-divider class="my-4"></v-divider>

        <div class="target-selection">
          <p class="text-subtitle-1 font-weight-bold mb-2">Destinatarios:</p>
          <v-radio-group v-model="notification.target" inline class="d-flex flex-wrap">
            <v-radio label="Todos los usuarios" value="all" color="primary"></v-radio>
            <v-radio label="Seleccionar específicos" value="specific" color="primary"></v-radio>
          </v-radio-group>
        </div>

        <!-- Tabla de Selección de Usuarios (Solo si target es 'specific') -->
        <v-expand-transition>
          <div v-if="notification.target === 'specific'" class="specific-target-panel mt-4">
            <v-card variant="outlined" class="pa-4">
              <div class="d-flex flex-wrap align-center gap-4 mb-4">
                <v-text-field
                  v-model="searchQuery"
                  label="Buscar por Lote o Email"
                  variant="underlined"
                  prepend-inner-icon="mdi-magnify"
                  hide-details
                  class="flex-grow-1"
                ></v-text-field>
                <div class="text-caption grey--text">
                  Seleccionados: <strong>{{ selectedEmails.length }}</strong>
                </div>
              </div>

              <div class="table-scroll-container">
                <table class="users-table">
                  <thead>
                    <tr>
                      <th style="width: 50px">
                        <input type="checkbox" @change="toggleAll" :checked="isAllSelected" />
                      </th>
                      <th>Email</th>
                      <th>Lote</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="user in filteredUsers" :key="user.email + user.nlote">
                      <td>
                        <input 
                          type="checkbox" 
                          :value="user.email" 
                          v-model="selectedEmails" 
                        />
                      </td>
                      <td>{{ user.email || 'Sin email' }}</td>
                      <td>{{ user.nlote }}</td>
                    </tr>
                    <tr v-if="filteredUsers.length === 0">
                      <td colspan="3" class="pa-4 text-center">No se encontraron usuarios</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </v-card>
          </div>
        </v-expand-transition>

        <div class="action-bar mt-6 d-flex justify-end">
          <v-btn
            color="primary"
            size="large"
            :loading="loading"
            :disabled="!formValid || (notification.target === 'specific' && selectedEmails.length === 0)"
            @click="sendNotification"
            prepend-icon="mdi-bullhorn"
          >
            Enviar Notificación
          </v-btn>
        </div>
      </v-form>
    </v-card>

    <!-- Historial de Notificaciones Leídas -->
    <v-card class="pa-6 mb-8 elevation-2 rounded-lg">
      <v-card-title class="text-h5 pb-4">
        <v-icon color="primary" class="mr-2">mdi-check-decagram</v-icon>
        Notificaciones Leídas
      </v-card-title>

      <div class="filters">
        <div class="filter-row">
          <div class="filter-item">
            <label>Email:</label>
            <input v-model="readLogFilters.email" type="text" placeholder="Buscar por email" />
          </div>
          <div class="filter-item">
            <label>Título:</label>
            <input v-model="readLogFilters.title" type="text" placeholder="Buscar por título" />
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-item">
            <label>Leída desde:</label>
            <input v-model="readLogFilters.date_from" type="date" />
          </div>
          <div class="filter-item">
            <label>Leída hasta:</label>
            <input v-model="readLogFilters.date_to" type="date" />
          </div>
          <div class="filter-item button-item">
            <button class="clear-button" @click="clearReadLogFilters">Limpiar filtros</button>
          </div>
        </div>
      </div>

      <div class="spinner-mounted-container" v-if="readLogsLoading">
        <span class="spinner-mounted"></span>
      </div>

      <template v-else>
        <div class="table-container">
          <table class="facturas-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nombre</th>
                <th>Título</th>
                <th>Mensaje</th>
                <th>Enviada</th>
                <th>Leída</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in readLogs" :key="log.id">
                <td>{{ log.email || '-' }}</td>
                <td>{{ log.nombre || '-' }}</td>
                <td>{{ log.title }}</td>
                <td class="text-truncate-cell">{{ log.body }}</td>
                <td>{{ formatLogDate(log.sent_at) }}</td>
                <td>{{ formatLogDate(log.read_at) }}</td>
              </tr>
              <tr v-if="readLogs.length === 0">
                <td colspan="6" class="pa-4 text-center">No hay notificaciones leídas para estos filtros</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" v-if="readLogTotal > 0">
          <button class="pagination-button" @click="readLogPrevPage" :disabled="readLogPage === 1">Anterior</button>
          <span>Página {{ readLogPage }} de {{ readLogLastPage }} ({{ readLogTotal }} en total)</span>
          <button class="pagination-button" @click="readLogNextPage" :disabled="readLogPage === readLogLastPage">Siguiente</button>
        </div>
      </template>
    </v-card>

    <!-- Snackbar de Éxito/Error Local -->
    <v-snackbar v-model="alert.show" :color="alert.color" :timeout="4000">
      {{ alert.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive, watch } from 'vue';
import api from '@/axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const loading = ref(false);
const formValid = ref(false);
const users = ref([]);
const selectedEmails = ref([]);
const searchQuery = ref('');

const notification = reactive({
  title: '',
  body: '',
  target: 'all'
});

const alert = reactive({
  show: false,
  message: '',
  color: 'success'
});

const fetchUsers = async () => {
  try {
    const res = await api.get('/emails-por-lote');
    // Filtramos para asegurar que tengan email
    users.value = res.data.filter(u => u.email);
  } catch (err) {
    console.error('Error al cargar usuarios:', err);
  }
};

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  const q = searchQuery.value.toLowerCase();
  return users.value.filter(u => 
    u.email.toLowerCase().includes(q) || 
    u.nlote.toLowerCase().includes(q)
  );
});

const isAllSelected = computed(() => {
  return filteredUsers.value.length > 0 && selectedEmails.value.length === filteredUsers.value.length;
});

const toggleAll = (e) => {
  if (e.target.checked) {
    selectedEmails.value = filteredUsers.value.map(u => u.email);
  } else {
    selectedEmails.value = [];
  }
};

const sendNotification = async () => {
  loading.value = true;
  try {
    const payload = {
      title: notification.title,
      body: notification.body,
      target: notification.target,
      emails: notification.target === 'specific' ? selectedEmails.value : []
    };

    const res = await api.post('/fcm-send', payload);
    
    alert.message = `¡Notificación enviada! Se alcanzó a ${res.data.devices_reached} dispositivos.`;
    alert.color = 'success';
    alert.show = true;

    // Limpiar campos
    notification.title = '';
    notification.body = '';
    selectedEmails.value = [];
  } catch (err) {
    console.error('Error al enviar:', err);
    alert.message = err.response?.data?.message || 'Error al enviar las notificaciones';
    alert.color = 'error';
    alert.show = true;
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/menu');
};

// ===== Historial de notificaciones leídas =====
const readLogs = ref([]);
const readLogsLoading = ref(false);
const readLogPage = ref(1);
const readLogLastPage = ref(1);
const readLogTotal = ref(0);

const readLogFilters = reactive({
  email: '',
  title: '',
  date_from: '',
  date_to: '',
});

let readLogDebounceTimer = null;

const fetchReadLog = async (page = 1) => {
  readLogsLoading.value = true;
  try {
    const res = await api.get('/notifications/read-log', {
      params: {
        page,
        email: readLogFilters.email || undefined,
        title: readLogFilters.title || undefined,
        date_from: readLogFilters.date_from || undefined,
        date_to: readLogFilters.date_to || undefined,
      },
    });
    readLogs.value = res.data.data;
    readLogPage.value = res.data.current_page;
    readLogLastPage.value = res.data.last_page;
    readLogTotal.value = res.data.total;
  } catch (err) {
    console.error('Error al cargar el historial de notificaciones leídas:', err);
  } finally {
    readLogsLoading.value = false;
  }
};

watch(readLogFilters, () => {
  clearTimeout(readLogDebounceTimer);
  readLogDebounceTimer = setTimeout(() => fetchReadLog(1), 400);
}, { deep: true });

const readLogPrevPage = () => {
  if (readLogPage.value > 1) fetchReadLog(readLogPage.value - 1);
};

const readLogNextPage = () => {
  if (readLogPage.value < readLogLastPage.value) fetchReadLog(readLogPage.value + 1);
};

const clearReadLogFilters = () => {
  readLogFilters.email = '';
  readLogFilters.title = '';
  readLogFilters.date_from = '';
  readLogFilters.date_to = '';
};

const formatLogDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

onMounted(() => {
  fetchUsers();
  fetchReadLog(1);
});
</script>

<style scoped>
.notifications-center-container {
  max-width: 850px;
  margin: 4rem auto;
  padding: 0 1rem;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
  background: var(--v-theme-surface, #ffffff);
  padding: 1rem 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  color: inherit;
}

.back-button {
  font-size: 24px;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  margin-right: 20px;
  transition: transform 0.2s;
}

.back-button:hover {
  transform: translateX(-5px);
  color: #1976D2;
}

h2 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 500;
  color: inherit;
}

.target-selection {
  background: rgba(128, 128, 128, 0.1);
  padding: 1rem;
  border-radius: 8px;
}

.table-scroll-container {
  max-height: 400px;
  overflow-y: auto;
  overflow-x: auto;
  margin-top: 1rem;
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 4px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 400px;
}

.users-table th {
  position: sticky;
  top: 0;
  background: var(--v-theme-surface, #f4f4f4);
  padding: 12px;
  text-align: left;
  border-bottom: 2px solid rgba(128, 128, 128, 0.2);
  z-index: 1;
}

.users-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(128, 128, 128, 0.1);
}

.users-table tr:hover {
  background: rgba(128, 128, 128, 0.05);
}

input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* ===== Historial de notificaciones leídas ===== */
.filters {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 20px;
}

.filter-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: flex-start;
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
  font-size: 0.9rem;
}

.filter-item input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.9rem;
}

.button-item {
  flex: 0 0 auto;
  justify-content: flex-end;
}

.clear-button {
  padding: 9px 16px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 25px;
}

.clear-button:hover {
  background-color: #c82333;
}

.table-container {
  overflow-x: auto;
}

.facturas-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.facturas-table th,
.facturas-table td {
  border: 1px solid rgba(128, 128, 128, 0.2);
  padding: 10px;
  text-align: center;
}

.facturas-table th {
  background: var(--v-theme-surface, #f8f8f8);
}

.text-truncate-cell {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
  gap: 12px;
  font-size: 14px;
}

.pagination-button {
  background-color: #ffd100;
  border: none;
  color: black;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pagination-button:disabled {
  background-color: #dee4e9;
  cursor: not-allowed;
}

.pagination-button:not(:disabled):hover {
  background-color: #ffdd33;
}

.spinner-mounted-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
}

.spinner-mounted {
  border: 3px solid #eee;
  border-top: 3px solid #2c3e50;
  border-radius: 50%;
  width: 45px;
  height: 45px;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 600px) {
  .notifications-center-container {
    margin: 1rem auto;
    padding: 0 0.5rem;
    max-width: 100vw;
  }
  
  .header {
    padding: 1rem;
    flex-wrap: wrap;
  }
  
  h2 {
    font-size: 1.4rem;
  }
  
  .v-card {
    padding: 1rem !important;
  }
}
</style>
