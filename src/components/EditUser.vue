<template>
  <div class="edit-user-container">
    <div class="header">
      <button class="back-button" @click="goBack">←</button>
      <h2>Editar Usuarios por Lote</h2>
    </div>

    <div class="filters">
      <div class="filter-row">
        <div class="filter-item">
          <label>Email:</label>
          <input v-model="filtroEmail" type="text" placeholder="Buscar por email" />
        </div>

        <div class="filter-item">
          <label>Lote:</label>
          <input v-model="filtroLote" type="text" placeholder="Buscar por lote" />
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-item button-item">
            <button class="clear-button" @click="limpiarFiltros">Limpiar filtros</button>
          </div>
      </div>
    </div>

    <div class="table-container">

      <table class="facturas-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Lote</th>
            <th>Editar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lote in paginatedLotes" :key="lote.nlote + lote.email">
            <td>{{ lote.email || '-' }}</td>
            <td>{{ lote.nlote }}</td>
            <td>
              <img :src="editIcon" alt="Editar" @click="editarFactura(lote)" class="img-table-edit" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <button class="pagination-button" @click="prevPage" :disabled="currentPage === 1">Anterior</button>
      <span>Página {{ currentPage }} de {{ totalPages }}</span>
      <button class="pagination-button" @click="nextPage" :disabled="currentPage === totalPages">Siguiente</button>
    </div>

    <!-- Modal de edición -->
    <v-dialog v-model="showEditModal" max-width="500px">
      <v-card>
        <v-card-title class="text-h6">Editar Usuario</v-card-title>
        <v-card-text>
          <v-form>
            <v-text-field v-model="facturaEditando.email" label="Email" outlined dense />
            <v-text-field v-model="facturaEditando.nlote" label="Lote" outlined dense disabled />

            <div v-if="mostrarRegistro">
              <h3>⚠️ Debe registrar el email</h3>
              <v-text-field v-model="nuevoUsuario.email" label="Email" outlined dense disabled />
              <v-text-field v-model="nuevoUsuario.password" label="Contraseña" type="password" outlined dense />
              <v-btn :disabled="isSaving" color="primary" @click="registrarNuevoUsuario" style="margin-bottom: 10px;">
                <span v-if="isSaving" class="spinner"></span>
                <span v-else>Guardar usuario</span>
              </v-btn>
            </div>

            <div v-if="mensajeExito" class="success-message">{{ mensajeExito }}</div>
            <div v-if="mensajeError" class="error-message">{{ mensajeError }}</div>
          </v-form>
        </v-card-text>
        <v-card-actions v-if="!mostrarRegistro">
          <v-spacer />
          <v-btn text @click="showEditModal = false">Cancelar</v-btn>
          <v-btn color="primary" :disabled="isSaving" @click="guardarEdicionFactura">
            <span v-if="isSaving" class="spinner"></span>
            <span v-else>Guardar</span>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from '@/axios';
import editIcon from '@/assets/img/editar.png';
import { useRouter } from 'vue-router';

const router = useRouter();

const lotes = ref([]);
const currentPage = ref(1);
const itemsPerPage = 10;

const facturaEditando = ref({});
const nuevoUsuario = ref({ email: '', password: '' });
const showEditModal = ref(false);
const mostrarRegistro = ref(false);
const mensajeExito = ref('');
const mensajeError = ref('');
const isSaving = ref(false);

// const paginatedLotes = computed(() => {
//   const start = (currentPage.value - 1) * itemsPerPage;
//   return lotes.value.slice(start, start + itemsPerPage);
// });

// const totalPages = computed(() => Math.ceil(lotes.value.length / itemsPerPage));

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};
const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const fetchLotes = async () => {
  try {
    const res = await axios.get('/emails-por-lote');
    lotes.value = res.data;
  } catch (err) {
    console.error('Error al cargar lotes:', err);
  }
};

const goBack = () => {
  router.push('/menu');
};

onMounted(fetchLotes);

const editarFactura = (factura) => {
  facturaEditando.value = { ...factura };
  showEditModal.value = true;
  mensajeExito.value = '';
  mostrarRegistro.value = false;
};

const guardarEdicionFactura = async () => {
  isSaving.value = true;
  mensajeExito.value = '';
  mensajeError.value = '';
  mostrarRegistro.value = false;

  try {
    await axios.post('/update-email-lote', facturaEditando.value);
    const res = await axios.get(`/verificar-email/${facturaEditando.value.email}`);

    if (res.data.exists) {
      mensajeExito.value = 'Usuario actualizado correctamente para el lote';
      setTimeout(() => {
        showEditModal.value = false;
        mensajeExito.value = '';
        fetchLotes();
      }, 2000);
    } else {
      mostrarRegistro.value = true;
      nuevoUsuario.value.email = facturaEditando.value.email;
    }
  } catch (err) {
    console.error('Error al actualizar:', err);
  } finally {
    isSaving.value = false;
  }
};

const registrarNuevoUsuario = async () => {
  isSaving.value = true;
  mensajeExito.value = '';
  mensajeError.value = '';

  try {
    await axios.post('/create-user', nuevoUsuario.value);
    mensajeExito.value = 'Usuario registrado exitosamente';
    setTimeout(() => {
      showEditModal.value = false;
      mensajeExito.value = '';
    }, 2000);
  } catch (error) {
    if (error.response?.data?.message?.includes('at least 4 characters')) {
      mensajeError.value = 'La contraseña debe tener al menos 4 caracteres';
    } else {
      mensajeError.value = 'Ocurrió un error al registrar el usuario.';
    }
  } finally {
    isSaving.value = false;
  }
};

const filtroEmail = ref('');
const filtroLote = ref('');

const lotesFiltrados = computed(() => {
  return lotes.value.filter((lote) => {
    const emailMatch = lote.email?.toLowerCase().includes(filtroEmail.value.toLowerCase());
    const loteMatch = lote.nlote?.toLowerCase().includes(filtroLote.value.toLowerCase());
    return emailMatch && loteMatch;
  });
});

const paginatedLotes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return lotesFiltrados.value.slice(start, start + itemsPerPage);
});

const totalPages = computed(() => Math.ceil(lotesFiltrados.value.length / itemsPerPage));

const limpiarFiltros = () => {
  filtroEmail.value = '';
  filtroLote.value = '';
  currentPage.value = 1;
};

</script>

<style scoped>
.edit-user-container {
  width: 70%;
  margin: 4rem auto;
  padding: 2rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
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
  color: #007bff;
}

h2 {
  font-size: 24px;
  margin: 0;
}

.table-container {
  overflow-x: auto;
}

.facturas-table {
  background-color: #f8f8f8;
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.facturas-table th,
.facturas-table td {
  border: 1px solid #e2e2e2;
  padding: 10px;
  text-align: center;
}

.facturas-table th {
  background-color: #f8f8f8;
}

.img-table-edit {
  width: 20px;
  cursor: pointer;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 25px;
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
  background-color: #5a6268;
  color: white;
}

.success-message {
  color: green;
  margin-top: 10px;
}

.error-message {
  color: red;
  margin-top: 10px;
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
  justify-content: flex-start;
}

.filter-item {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 200px;
  align-items: center;
  justify-content: center;
}

.filter-item label {
  font-weight: bold;
  margin-bottom: 6px;
}

.filter-item input,
.filter-item select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
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
  width: 20%;
}

.clear-button:hover {
  background-color: #c82333;
}

</style>
