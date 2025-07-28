<template>
  <div class="listado-container">
    <div class="header">
      <button class="back-button" @click="goBack">←</button>
      <h2>Listado de Facturas</h2>
    </div>

    <div class="spinner-mounted-container" v-if="isLoading">
        <span class="spinner-mounted"></span>
    </div>

    <div class="filters">
        <div class="filter-row">
            <div class="filter-item">
            <label>Periodo:</label>
            <select v-model="selectedPeriodoAdmin">
                <option value="">Todos</option>
                <option v-for="p in periodosUnicos" :key="p" :value="p">{{ p }}</option>
            </select>
            </div>

            <div class="filter-item">
            <label>Usuario:</label>
            <input v-model="filtroEmail" type="text" placeholder="Buscar por email" />
            </div>

            <div class="filter-item">
            <label>Lote:</label>
            <input v-model="filtroLote" type="text" placeholder="Buscar por lote" />
            </div>
        </div>

        <div class="filter-row">
            <div class="filter-item">
            <label>Carta:</label>
            <input v-model="filtroCarta" type="text" placeholder="Buscar por carta" />
            </div>

            <div class="filter-item">
            <label>Liquidación:</label>
            <input v-model="filtroLiquidacion" type="text" placeholder="Buscar por liquidación" />
            </div>

            <div class="filter-item button-item">
              <button class="clear-button" @click="limpiarFiltros">Limpiar filtros</button>
            </div>
        </div>
    </div>

    <div v-if="showEditModal" class="modal-overlay">
        <div class="modal-content">
            <h3>Editar Factura</h3>

            <label>Periodo:</label>
            <input v-model="facturaEditando.numero" type="text" />

            <label>Email:</label>
            <input v-model="facturaEditando.email" type="email" />

            <label>Lote:</label>
            <input v-model="facturaEditando.nlote" type="text" />

            <label>Carta (URL):</label>
            <input v-model="facturaEditando.carta" type="text" />

            <label>Liquidación (URL):</label>
            <input v-model="facturaEditando.gastocomun" type="text" />

            <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
            <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

            <div class="modal-buttons">
                <button :disabled="isSaving" @click="guardarEdicionFactura" class="save-button">
                    <span v-if="isSaving" class="spinner"></span>
                    <span v-else>Guardar</span>
                </button>
                <button class="cancel-button" @click="showEditModal = false">Cancelar</button>
            </div>
        </div>
    </div>


    <div class="table-container">
        <table class="facturas-table">
            <thead>
            <tr>
                <th>ID</th>
                <th>Periodo</th>
                <th>Usuario</th>
                <th>Lote</th>
                <th>Carta</th>
                <th>Liquidación</th>
                <th>Editar</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="factura in paginatedFacturas" :key="factura.id">
                <td>{{ factura.id }}</td>
                <td>{{ factura.numero }}</td>
                <td>{{ factura.email }}</td>
                <td>{{ factura.nlote }}</td>
                <td class="url-cell">{{ factura.carta }}</td>
                <td class="url-cell">{{ factura.gastocomun }}</td>
                <td>
                    <img :src="editIcon" alt="" @click="editarFactura(factura)" class="img-table-edit">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/axios';
import editIcon from '@/assets/img/editar.png';

const router = useRouter();
const goBack = () => router.push('/menu');

const adminFacturas = ref([]);
const isLoading = ref(true);
const selectedPeriodoAdmin = ref('');
const filtroEmail = ref('');
const filtroLote = ref('');
const filtroCarta = ref('');
const filtroLiquidacion = ref('');
const showEditModal = ref(false);
const facturaEditando = ref({
  numero: '',
  email: '',
  nlote: '',
  carta: '',
  gastocomun: ''
});
const isSaving = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

const currentPage = ref(1);
const rowsPerPage = 20;

const fetchAdminFacturas = async () => {
  try {
    const response = await axios.get('/facturas-todas');
    adminFacturas.value = response.data;
  } catch (error) {
    console.error('Error al obtener las facturas del admin:', error);
  } finally {
    isLoading.value = false;
  }
};

const periodosUnicos = computed(() => {
  const numeros = adminFacturas.value.map(f => f.numero);
  return [...new Set(numeros)].sort((a, b) => b - a);
});

const filteredAdminFacturas = computed(() => {
  return adminFacturas.value.filter(f =>
    (selectedPeriodoAdmin.value === '' || f.numero === selectedPeriodoAdmin.value) &&
    (filtroEmail.value === '' || f.email.toLowerCase().includes(filtroEmail.value.toLowerCase())) &&
    (filtroLote.value === '' || f.nlote.toLowerCase().includes(filtroLote.value.toLowerCase())) &&
    (filtroCarta.value === '' || f.carta.toLowerCase().includes(filtroCarta.value.toLowerCase())) &&
    (filtroLiquidacion.value === '' || f.gastocomun.toLowerCase().includes(filtroLiquidacion.value.toLowerCase()))
  );
});

const limpiarFiltros = () => {
  selectedPeriodoAdmin.value = '';
  filtroEmail.value = '';
  filtroLote.value = '';
  filtroCarta.value = '';
  filtroLiquidacion.value = '';
};

const totalPages = computed(() =>
  Math.ceil(filteredAdminFacturas.value.length / rowsPerPage)
);

const paginatedFacturas = computed(() => {
  const start = (currentPage.value - 1) * rowsPerPage;
  return filteredAdminFacturas.value.slice(start, start + rowsPerPage);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const editarFactura = (factura) => {
  facturaEditando.value = { ...factura };
  showEditModal.value = true;
};

const guardarEdicionFactura = async () => {
  isSaving.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    await axios.post('/update-gasto', {
      id: facturaEditando.value.id,
      numero: facturaEditando.value.numero,
      email: facturaEditando.value.email,
      nlote: facturaEditando.value.nlote,
      carta: facturaEditando.value.carta,
      gastocomun: facturaEditando.value.gastocomun,
    });

    successMessage.value = 'Factura actualizada con éxito';
    setTimeout(() => {
      isSaving.value = false;
      showEditModal.value = false;
      fetchAdminFacturas();
    }, 2000);
  } catch (error) {
    isSaving.value = false;
    errorMessage.value = 'Error al actualizar la factura. Intente nuevamente.';
    console.error('Error al actualizar:', error);
  }
};

onMounted(fetchAdminFacturas);
</script>

<style scoped>
.listado-container {
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

.button-item {
  display: flex;
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
    width: 50%;
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
  border: 1px solid #e2e2e2;
  padding: 10px;
  text-align: center;
}
.facturas-table th {
  background-color: #f8f8f8;
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

.url-cell {
  font-size: 12px;
  word-break: break-all;
  color: #555;
  padding: 6px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 10px;
    width: 65%;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}

.modal-content label {
  display: block;
  margin-top: 10px;
  font-weight: bold;
}

.modal-content input {
  width: 100%;
  padding: 8px;
  margin-top: 4px;
  margin-bottom: 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.modal-buttons {
  display: flex;
    justify-content: right;
    gap: 20px;
}

.save-button,
.cancel-button {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
}

.save-button {
  background-color: #28a745;
  color: white;
}

.cancel-button {
  background-color: #6c757d;
  color: white;
}

.img-table-edit{
    width: 10%; 
    cursor: pointer;
  }

@media (max-width: 768px) {
  .img-table-edit{
    width: 50%; 
  }

}

</style>
