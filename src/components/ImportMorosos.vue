<template>
  <div class="edit-user-container">

    <!-- HEADER -->
    <div class="header">
      <button class="back-button" @click="goBack">←</button>
      <h2>Importador Morosos</h2>
    </div>

    <!-- FILTROS -->
    <div class="filters">
      <div class="filter-row">
        <div class="filter-item">
          <label>Email:</label>
          <input v-model="filtroEmail" type="text" placeholder="Buscar por email" />
        </div>

        <div class="filter-item">
          <label>Número de Lote:</label>
          <input v-model="filtroLote" type="text" placeholder="Buscar por lote" />
        </div>
      </div>

      <div class="filter-row">
        <div class="filter-item button-item">
          <button class="clear-button" @click="limpiarFiltros">
            Limpiar filtros
          </button>
        </div>

        <div class="filter-item button-item">
          <button class="import-button" @click="abrirModal">
            Importar Excel
          </button>
        </div>
      </div>
    </div>

    <!-- TABLA -->
    <div class="table-container">
      <table class="facturas-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Número de Lote</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in datosFiltrados" :key="item.id">
            <td>{{ item.email }}</td>
            <td>{{ item.nlote }}</td>
            <td>$ {{ item.monto }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL -->
    <v-dialog v-model="showModal" max-width="500px">
      <v-card>
        <v-card-title class="text-h6">Importar archivo Excel</v-card-title>
        <v-card-text>

          <input
            type="file"
            ref="fileInput"
            @change="handleFile"
            accept=".xlsx,.xls"
          />

          <div v-if="fileName" class="selected-file">
            Archivo seleccionado: {{ fileName }}
          </div>

          <div v-if="mensajeError" class="error-message">
            {{ mensajeError }}
          </div>

          <div v-if="mensajeExito" class="success-message">
            {{ mensajeExito }}
          </div>

        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cancelarImportacion">Cancelar</v-btn>
          <v-btn color="primary" :disabled="!archivo || isImporting" @click="importarExcel">
            <span v-if="isImporting" class="spinner"></span>
            <span v-else>Importar</span>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script>
import axios from '@/axios';

export default {
  name: "ImportMorosos",

  data() {
    return {
      datos: [],
      filtroEmail: "",
      filtroLote: "",
      showModal: false,
      archivo: null,
      fileName: "",
      isImporting: false,
      mensajeError: "",
      mensajeExito: "",
    };
  },

  mounted() {
    this.cargarDatos();
  },

  computed: {
    datosFiltrados() {
      return this.datos.filter((item) => {
        const email = item.email ? item.email.toLowerCase() : "";
        const lote = item.nlote ? String(item.nlote).toLowerCase() : "";

        const matchEmail = email.includes(this.filtroEmail.toLowerCase());
        const matchLote = lote.includes(this.filtroLote.toLowerCase());

        return matchEmail && matchLote;
      });
    },
  },

  methods: {

    async cargarDatos() {
      try {
        const response = await axios.get("/morosos");
        this.datos = response.data;
      } catch (error) {
        console.error("Error cargando morosos:", error);
      }
    },

    goBack() {
      this.$router.back();
    },

    limpiarFiltros() {
      this.filtroEmail = "";
      this.filtroLote = "";
    },

    abrirModal() {
      this.showModal = true;
      this.$nextTick(() => {
        this.$refs.fileInput.click();
      });
    },

    handleFile(event) {
      const file = event.target.files[0];
      if (file) {
        this.archivo = file;
        this.fileName = file.name;
      }
    },

    cancelarImportacion() {
      this.archivo = null;
      this.fileName = "";
      this.$refs.fileInput.value = null;
      this.showModal = false;
      this.mensajeError = "";
      this.mensajeExito = "";
    },

    async importarExcel() {
      try {
        this.isImporting = true;
        this.mensajeError = "";
        this.mensajeExito = "";

        const formData = new FormData();
        formData.append("file", this.archivo);

        const response = await axios.post(
          "/importar-morosos",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        this.mensajeExito = response.data.message;

        await this.cargarDatos();

        setTimeout(() => {
          this.cancelarImportacion();
        }, 1500);

      } catch (error) {
        this.mensajeError =
          error.response?.data?.message || "Error al importar";
      } finally {
        this.isImporting = false;
      }
    },
  },
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

/* HEADER */
.header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  position: relative;
}

.back-button {
  position: absolute;
  left: 0;
  font-size: 22px;
  background: none;
  border: none;
  color: #333;
  cursor: pointer;
  transition: color 0.2s;
}

.back-button:hover {
  color: #007bff;
}

h2 {
  font-size: 24px;
  margin: 0;
}

/* FILTROS */
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

.filter-item input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  width: 100%;
}

/* BOTONES */
.clear-button {
  padding: 9px 16px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 25px;
  width: 70%;
  transition: 0.2s;
}

.clear-button:hover {
  background-color: #c82333;
}

.import-button {
  padding: 9px 16px;
  background-color: #ffd100;
  color: black;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 25px;
  width: 70%;
  transition: 0.2s;
}

.import-button:hover {
  background-color: #5a6268;
  color: white;
}

/* TABLA */
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
  font-weight: bold;
}

/* MODAL */
.selected-file {
  margin-top: 15px;
  font-weight: bold;
  font-size: 14px;
}

/* MENSAJES */
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

/* SPINNER */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ccc;
  border-top: 2px solid #000;
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.7s linear infinite;
  margin-right: 5px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>