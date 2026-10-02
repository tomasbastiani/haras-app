<template>
  <div class="edit-user-container">

    <div class="header">
      <button class="back-button" @click="goBack">←</button>
      <h2>Importador Gastos Comunes Notificaciones</h2>
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
          <button class="template-button" :disabled="descargandoPlantilla" @click="descargarPlantilla">
            <span v-if="descargandoPlantilla" class="spinner"></span>
            Descargar plantilla
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
            <th>Nombre</th>
            <th>Número de Lote</th>
            <th>CVU</th>
            <th>Alias</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in datosPagina" :key="item.id">
            <td>{{ item.email }}</td>
            <td>{{ item.nombre }}</td>
            <td>{{ item.nlote }}</td>
            <td class="mono">{{ item.cvu || '—' }}</td>
            <td>{{ item.alias || '—' }}</td>
          </tr>
          <tr v-if="datosFiltrados.length === 0">
            <td colspan="5" class="sin-datos">Sin registros</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- PAGINADO -->
    <div v-if="totalPaginas > 1" class="paginado">
      <v-pagination
        v-model="pagina"
        :length="totalPaginas"
        :total-visible="7"
        density="comfortable"
      />
    </div>
    <div class="total-registros">
      {{ datosFiltrados.length }} registro(s)
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

          <div class="formato-ayuda">
            Columnas: A Email · B Nombre · C Lote · D CVU · E Alias.
            La primera fila es el encabezado. CVU y Alias son opcionales.
            Usá la <strong>plantilla</strong> (botón "Descargar plantilla"): ya trae
            el CVU formateado como Texto. Si no, Excel redondea los últimos dígitos.
          </div>

          <div v-if="mensajeError" class="error-message">
            {{ mensajeError }}
            <ul v-if="erroresImport.length" class="errores-lista">
              <li v-for="(err, i) in erroresImport" :key="i">{{ err }}</li>
            </ul>
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
  name: "ImportGastos",

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
      erroresImport: [],
      descargandoPlantilla: false,
      pagina: 1,
      porPagina: 20,
    };
  },

  watch: {
    // Al filtrar, volver a la primera página: si no, se puede quedar parado en
    // una página que ya no existe y ver la tabla vacía.
    filtroEmail() { this.pagina = 1; },
    filtroLote() { this.pagina = 1; },
  },

  mounted() {
    this.cargarDatos(); // 🔥 carga datos al entrar
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

    totalPaginas() {
      return Math.max(1, Math.ceil(this.datosFiltrados.length / this.porPagina));
    },

    datosPagina() {
      const inicio = (this.pagina - 1) * this.porPagina;
      return this.datosFiltrados.slice(inicio, inicio + this.porPagina);
    },
  },

  methods: {

    async cargarDatos() {
      try {
        const response = await axios.get("/gastoscomunes");
        this.datos = response.data;
      } catch (error) {
        console.error("Error cargando gastos:", error);
      }
    },

    // Va por axios (con el token) y no por un <a href>, porque el endpoint es
    // sólo admin y un link directo no manda el bearer.
    async descargarPlantilla() {
      this.descargandoPlantilla = true;
      try {
        const response = await axios.get("/importar-gastos/plantilla", {
          responseType: "blob",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(response.data);
        link.download = "plantilla-gastos-comunes.xlsx";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
      } catch (error) {
        console.error("Error descargando plantilla:", error);
        alert("No se pudo descargar la plantilla. Intentá de nuevo.");
      } finally {
        this.descargandoPlantilla = false;
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
      this.erroresImport = [];
    },

    async importarExcel() {
      try {
        this.isImporting = true;
        this.mensajeError = "";
        this.mensajeExito = "";
        this.erroresImport = [];

        const formData = new FormData();
        formData.append("file", this.archivo);

        const response = await axios.post(
          "/importar-gastos",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        this.mensajeExito = response.data.message;

        // 🔥 en vez de usar response.data.data
        // volvemos a pedir la tabla actualizada
        await this.cargarDatos();
        this.pagina = 1;

        setTimeout(() => {
          this.cancelarImportacion();
        }, 1500);

      } catch (error) {
        this.mensajeError =
          error.response?.data?.message || "Error al importar";
        this.erroresImport = error.response?.data?.errores || [];
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

.template-button {
  padding: 9px 16px;
  background-color: #fff;
  color: #333;
  border: 2px solid #ffd100;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 25px;
  width: 70%;
  transition: 0.2s;
}

.template-button:hover:not(:disabled) {
  background-color: #fff7cc;
}

.template-button:disabled {
  opacity: 0.6;
  cursor: wait;
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

.facturas-table td.mono {
  font-family: Consolas, 'Courier New', monospace;
  white-space: nowrap;
}

.sin-datos {
  color: #888;
  font-style: italic;
}

/* PAGINADO */
.paginado {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.total-registros {
  text-align: center;
  color: #666;
  font-size: 13px;
  margin-top: 8px;
}

/* MODAL */
.formato-ayuda {
  margin-top: 12px;
  font-size: 13px;
  color: #555;
  line-height: 1.5;
}

.errores-lista {
  margin: 8px 0 0 18px;
  font-weight: normal;
  font-size: 13px;
  max-height: 180px;
  overflow-y: auto;
}

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