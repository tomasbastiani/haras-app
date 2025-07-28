<template>
  <div class="gastos-container">
    <div class="header">
      <span class="back-arrow" @click="goBack">←</span>
      <h1>Gastos Comunes</h1>
    </div>

    <div class="spinner-mounted-container" v-if="isLoading">
        <span class="spinner-mounted"></span>
    </div>

    <div v-if="isAdmin">
        <div class="admin-actions">
            <button @click="openModal">
                <img :src="plusIcon" alt="Plus" />
                Agregar Gasto
            </button>
        </div>

        <table class="facturas-table-admin">
            <thead>
                <tr>
                <th>Periodo</th>
                <th>Eliminar</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(periodo, index) in periodos" :key="index">
                <td>{{ periodo.numero }}</td>
                <td>
                    <button @click="eliminarPeriodo(periodo.numero)" class="error-message">
                        Eliminar
                    </button>
                </td>
                </tr>
            </tbody>
        </table>
    </div>
    
    <!-- Modal de confirmación -->
    <div v-if="showConfirmModal" class="modal-overlay">
        <div class="modal-content small-modal">
            <h3>Confirmar eliminación</h3>
            <p>¿Está seguro que desea eliminar el periodo {{ periodoAEliminar }}?</p>

            <div class="modal-buttons">
                <button :disabled="isSaving" @click="confirmarEliminacion" class="confirm-button">
                    <span v-if="isSaving" class="spinner"></span>
                    <span v-else>Confirmar</span>
                </button>
                <button @click="cancelarEliminacion" class="cancel-button">Cancelar</button>
            </div>
            <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
            <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
        </div>
    </div>

    <!-- Modal de agregar gasto -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h2>Agregar Gasto</h2>

        <!-- Campos Ejemplo -->
        <label>Ejemplo Carta:</label>
        <input
          type="text"
          disabled
          value="https://harassantamaria.com.ar/gcomunes/190/cartas/L-1.pdf"
        />

        <label>Ejemplo Liquidación:</label>
        <input
          type="text"
          disabled
          value="https://harassantamaria.com.ar/gcomunes/190/190%20Liquidacion%20de%20Gastos%20Comunes.pdf"
        />

        <label>Periodo:</label>
        <input v-model="nuevoGasto.numero" type="text" />

        <div class="modal-buttons">
          <button type="submit" :disabled="isSaving" @click="guardarGasto">
            <span v-if="isSaving" class="spinner"></span>
            <span v-else>Guardar</span>
          </button>
          <button @click="closeModal">Cancelar</button>
        </div>

        <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
        <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
      </div>
    </div>

    <div v-if="!isAdmin">
      <div v-if="facturas.length === 0" class="no-data">
        No se encontraron facturas.
      </div>

      <div class="filters">
        <label>
          Periodo:
          <select v-model="selectedPeriodo">
            <option value="">Todos</option>
            <option v-for="numero in periodosDisponibles" :key="numero" :value="numero">{{ numero }}</option>
          </select>
        </label>

        <label>
          Lote:
          <select v-model="selectedLote">
            <option value="">Todos</option>
            <option v-for="lote in lotesDisponibles" :key="lote" :value="lote">{{ lote }}</option>
          </select>
        </label>
      </div>

      <table class="facturas-table">
        <thead>
          <tr>
            <th>Periodo</th>
            <th>Usuario</th>
            <th>Lote</th>
            <th>Carta</th>
            <th>Liquidación</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(factura, index) in paginatedFacturas"
            :key="index"
          >
            <td>{{ factura.numero }}</td>
            <td>{{ factura.email }}</td>
            <td>{{ factura.nlote }}</td>
            <td><button @click="openPDF(factura.carta)">Ver Carta</button></td>
            <td><button @click="openPDF(factura.gastocomun)">Ver Liquidación</button></td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" v-if="totalPages > 1">
        <button @click="prevPage" :disabled="currentPage === 1">Anterior</button>
        <span>Página {{ currentPage }} de {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages">Siguiente</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/axios';
import plusIcon from '@/assets/img/plus.png';

const router = useRouter();
const isLoading = ref(true);
const facturas = ref([]);
const selectedPeriodo = ref('');
const selectedLote = ref('');
const currentPage = ref(1);
const itemsPerPage = 10;
const isAdmin = ref(false);
// const adminFacturas = ref([]);
// const selectedPeriodoAdmin = ref('');
// const selectedLoteAdmin = ref('');
// const currentPageAdmin = ref(1);
// const itemsPerPageAdmin = 10;
const showModal = ref(false);
const nuevoGasto = ref({
  numero: '',
});
const isSaving = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const periodos = ref([]);
const showConfirmModal = ref(false);
const periodoAEliminar = ref(null);


const goBack = () => router.push('/menu');

const openPDF = (url) => window.open(url.trim(), '_blank');

const fetchFacturas = async () => {
  const email = localStorage.getItem('user');
  try {
    const response = await axios.get(`/gastoscomunes/${email}`);
    facturas.value = response.data;
  } catch (error) {
    console.error('Error al obtener las facturas:', error);
    facturas.value = [];
  } finally {
    isLoading.value = false;
  }
};

const filteredFacturas = computed(() => {
  return facturas.value.filter(f =>
    (selectedPeriodo.value === '' || f.numero === selectedPeriodo.value) &&
    (selectedLote.value === '' || f.nlote === selectedLote.value)
  );
});

const totalPages = computed(() => Math.ceil(filteredFacturas.value.length / itemsPerPage));

const paginatedFacturas = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredFacturas.value.slice(start, start + itemsPerPage);
});

const periodosDisponibles = computed(() => [...new Set(facturas.value.map(f => f.numero))].sort());
const lotesDisponibles = computed(() => [...new Set(facturas.value.map(f => f.nlote))].sort());

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};
const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

watch([selectedPeriodo, selectedLote], () => {
  currentPage.value = 1;
});

// const fetchAdminFacturas = async () => {
//   try {
//     const response = await axios.get('/facturas-todas');
//     adminFacturas.value = response.data;
//   } catch (error) {
//     console.error('Error al obtener las facturas del admin:', error);
//   } finally {
//     isLoading.value = false;
//   }
// };

// const filteredAdminFacturas = computed(() => {
//   return adminFacturas.value.filter(f =>
//     (selectedPeriodoAdmin.value === '' || f.numero === selectedPeriodoAdmin.value) &&
//     (selectedLoteAdmin.value === '' || f.nlote === selectedLoteAdmin.value)
//   );
// });

// const totalPagesAdmin = computed(() =>
//   Math.ceil(filteredAdminFacturas.value.length / itemsPerPageAdmin)
// );

// const paginatedAdminFacturas = computed(() => {
//   const start = (currentPageAdmin.value - 1) * itemsPerPageAdmin;
//   return filteredAdminFacturas.value.slice(start, start + itemsPerPageAdmin);
// });

// const periodosDisponiblesAdmin = computed(() =>
//   [...new Set(adminFacturas.value.map(f => f.numero))].sort((a, b) => b - a)
// );

// const lotesDisponiblesAdmin = computed(() =>
//   [...new Set(adminFacturas.value.map(f => f.nlote))].sort()
// );

// watch([selectedPeriodoAdmin, selectedLoteAdmin], () => {
//   currentPageAdmin.value = 1;
// });

// const nextPageAdmin = () => {
//   if (currentPageAdmin.value < totalPagesAdmin.value) currentPageAdmin.value++;
// };

// const prevPageAdmin = () => {
//   if (currentPageAdmin.value > 1) currentPageAdmin.value--;
// };

const fetchPeriodos = async () => {
  try {
    const response = await axios.get('/gastos/periodos');
    periodos.value = response.data;
  } catch (error) {
    console.error('Error al obtener periodos:', error);
  } finally{
    isLoading.value = false;
  }
};

const eliminarPeriodo = (numero) => {
  periodoAEliminar.value = numero;
  showConfirmModal.value = true;
};

const cancelarEliminacion = () => {
  showConfirmModal.value = false;
  periodoAEliminar.value = null;
  successMessage.value = '';
  errorMessage.value = '';
  isSaving.value = false;
};

const confirmarEliminacion = async () => {
    isSaving.value = true;
    successMessage.value = '';
    errorMessage.value = '';
  try {
    await axios.delete(`/gastos/eliminar/${periodoAEliminar.value}`);

    periodoAEliminar.value = null;
    successMessage.value = 'Periodo eliminado con éxito';
    setTimeout(() => {
      isSaving.value = false;
      cancelarEliminacion();
      fetchPeriodos();
    }, 2000);
  } catch (error) {
    isSaving.value = false;
    errorMessage.value = 'Hubo un error al eliminar el periodo. Intente nuevamente.';
    console.error('Error al eliminar el periodo:', error);
  }
};

const openModal = () => {
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  nuevoGasto.value = { numero: '' };
  successMessage.value = '';
  errorMessage.value = '';
  isSaving.value = false;
};

const guardarGasto = async () => {
  isSaving.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    await axios.post('/gastos/agregar', {
      numero: nuevoGasto.value.numero
    });

    successMessage.value = 'Gasto agregado con éxito';
    setTimeout(() => {
      isSaving.value = false;
      closeModal();
      fetchPeriodos();
    }, 2000);
  } catch (error) {
    isSaving.value = false;
    errorMessage.value = 'Hubo un error al guardar el gasto. Intente nuevamente.';
    console.error('Error al guardar gasto:', error);
  }
};

onMounted(() => {
  isAdmin.value = !!localStorage.getItem('admin');

  if (isAdmin.value) {
    fetchPeriodos();
  } else {
    fetchFacturas();
  }
});
</script>

<style scoped>
.gastos-container {
  width: 90%;
  max-width: 1000px;
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

.back-arrow {
  font-size: 1.5rem;
  cursor: pointer;
  margin-right: 1rem;
}

h1 {
  font-size: 1.8rem;
  color: #2c3e50;
}

.no-data {
  text-align: center;
  font-size: 1.2rem;
  color: #888;
}

.filters {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
}

.filters label {
  font-weight: 600;
  color: #2c3e50;
}

.filters select {
  margin-left: 0.5rem;
  padding: 0.4rem;
  border-radius: 6px;
  border: 1px solid #ccc;
}

.facturas-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.facturas-table th,
.facturas-table td {
  border: 1px solid #ddd;
  padding: 0.75rem;
  text-align: center;
}

.facturas-table th {
  background-color: #f5f5f5;
  color: #333;
}

.facturas-table button {
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.facturas-table button:hover {
  background-color: #2980b9;
}

.facturas-table-admin {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.facturas-table-admin th,
.facturas-table-admin td {
  border: 1px solid #ddd;
  padding: 0.75rem;
  text-align: center;
}

.facturas-table-admin th {
  background-color: #f5f5f5;
  color: #333;
}

.facturas-table-admin button {
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  background-color: #ff2020;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.facturas-table-admin button:hover {
  background-color: #8f0303;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.pagination button {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  background-color: #27ae60;
  color: white;
  border: none;
  cursor: pointer;
}

.pagination button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.admin-actions {
  text-align: center;
  margin-top: 2rem;
    margin-bottom: 2rem;
}

.admin-actions button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  background-color: #008d3b;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.admin-actions button:hover {
  background-color: #1a2a38;
}

.admin-actions img {
  width: 20px;
  height: 20px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #fff;
  padding: 30px;
  border-radius: 12px;
  width: 60%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.input-form-modal label,
.modal-content label {
  font-weight: bold;
  margin-bottom: 6px;
}

.input-form-modal input,
.modal-content input {
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 15px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.modal-buttons button {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.modal-buttons button:first-child {
  background-color: #28a745;
  color: white;
}

.modal-buttons button:first-child:hover {
  background-color: #218838;
}

.modal-buttons button:last-child {
  background-color: #dc3545;
  color: white;
}

.modal-buttons button:last-child:hover {
  background-color: #c82333;
}

.spinner {
  border: 3px solid #fff;
  border-top: 3px solid #2c3e50;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  vertical-align: middle;
}

.spinner-mounted{
border: 3px solid #fff;
border-top: 3px solid #2c3e50;
border-radius: 50%;
width: 55px;
height: 55px;
animation: spin 0.8s linear infinite;
display: inline-block;
vertical-align: middle;
}

.spinner-mounted-container{
display: flex;
align-items: center;
justify-content: center;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.success-message {
  color: green;
  margin-top: 10px;
}

.error-message {
  color: red;
  margin-top: 10px;
}

input[disabled] {
  background-color: #f0f0f0;
  color: #555;
  border: 1px solid #ccc;
  font-style: italic;
}

.modal-content h2{
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .facturas-table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }

  .modal-content {
    width: 80%;
  }
}

</style>
