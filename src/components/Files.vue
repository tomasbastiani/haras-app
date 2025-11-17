<template>
  <div class="archivos-container">

    <div class="header">
      <span class="back-arrow" @click="goBack">←</span>
      <!-- Título distinto opcional -->
      <h1 v-if="!isAdmin">Adjuntar Archivos</h1>
      <h1 v-else>Archivos</h1>
    </div>

    <!-- Recuadro de creación SOLO para no-admin -->
    <div
      class="upload-box"
      v-if="!isAdmin"
    >
      <h2 class="upload-title">📎 Adjuntar Archivos</h2>
      <input type="file" @change="handleFileUpload" />

      <!-- Select de Lotes -->
      <select v-model="nuevoArchivo.nlote">
        <option value="">Seleccione un Lote</option>
        <option v-for="l in lotes" :key="l.nlote" :value="l.nlote">{{ l.nlote }}</option>
      </select>

      <!-- Select de Cartas -->
      <select v-model="nuevoArchivo.ncarta">
        <option value="">Seleccione una Carta</option>
        <option v-for="c in cartas" :key="c.numero" :value="c.numero">{{ c.numero }}</option>
      </select>

      <!-- Usuario disabled -->
      <input v-model="nuevoArchivo.user" type="text" placeholder="Usuario" disabled />

      <textarea v-model="nuevoArchivo.comments" placeholder="Comentarios"></textarea>

      <!-- Mensajes -->
      <p v-if="successMessage" class="success-msg">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

      <!-- Botón con spinner -->
      <button
        class="btn-create"
        @click="crearArchivo"
        :disabled="loading || !nuevoArchivo.nlote || !nuevoArchivo.ncarta"
      >
        <span v-if="loading" class="loader"></span>
        {{ loading ? "Subiendo..." : "Crear" }}
      </button>
    </div>

    <!-- Tabla de archivos (la ven todos; el admin ve solo esto) -->
    <div class="table-wrapper">
      <table class="custom-table">
        <thead>
          <tr>
            <th>Lote</th>
            <th>Carta Nº</th>
            <th>Usuario</th>
            <th>Comentarios</th>
            <th>Archivo</th>
            <th>Eliminar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="archivo in archivos" :key="archivo.id">
            <td>{{ archivo.nlote }}</td>
            <td>{{ archivo.ncarta }}</td>
            <td>{{ archivo.user }}</td>
            <td>{{ archivo.comments }}</td>
            <td>
              <button class="btn btn-download" @click="descargarArchivo(archivo)">
                <i class="fas fa-download"></i> Descargar
              </button>
            </td>
            <td class="acciones">
              <button class="btn btn-delete" @click="abrirModal(archivo.id)">
                <i class="fas fa-trash-alt"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Modal de confirmación -->
      <div v-if="showModal" class="modal-overlay">
        <div class="modal">
          <p>¿Está seguro de que quiere eliminar este archivo?</p>
          <div class="modal-buttons">
            <button class="btn btn-confirm" @click="eliminarArchivo()">Sí</button>
            <button class="btn btn-cancel" @click="cerrarModal">No</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import axios from "@/axios"
import { useRouter } from 'vue-router'
import deleteIcon from '@/assets/img/borrar.png';

const archivos = ref([])
const lotes = ref([])
const cartas = ref([])
const successMessage = ref("")
const errorMessage = ref("")
const loading = ref(false)
const isAdmin = ref(false);

const nuevoArchivo = ref({
  nlote: "",
  ncarta: "",
  user: localStorage.getItem("user") || "",
  comments: "",
  file: null,
})

const handleFileUpload = (e) => {
  nuevoArchivo.value.file = e.target.files[0]
}
const router = useRouter()
const goBack = () => router.push('/menu')

const crearArchivo = async () => {
  successMessage.value = "";
  errorMessage.value = "";

  // Validar lote y carta
  if (!nuevoArchivo.value.nlote || !nuevoArchivo.value.ncarta) {
    errorMessage.value = "Debes seleccionar un lote y una carta.";
    setTimeout(() => (errorMessage.value = ""), 3000);
    return;
  }

  if (!nuevoArchivo.value.file) {
    errorMessage.value = "Debes seleccionar un archivo.";
    setTimeout(() => (errorMessage.value = ""), 3000);
    return;
  }

  loading.value = true;
  try {
    const formData = new FormData();
    formData.append("nlote", nuevoArchivo.value.nlote);
    formData.append("ncarta", nuevoArchivo.value.ncarta);
    formData.append("user", nuevoArchivo.value.user);
    formData.append("comments", nuevoArchivo.value.comments);
    formData.append("file", nuevoArchivo.value.file);

    await axios.post("/archivos", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    successMessage.value = "Archivo subido correctamente ✅";
    setTimeout(() => (successMessage.value = ""), 3000);

    // Reset form
    nuevoArchivo.value = {
      nlote: "",
      ncarta: "",
      user: localStorage.getItem("user") || "",
      comments: "",
      file: null,
    };

    fetchArchivos();
  } catch (error) {
    console.error(error?.response?.data?.message || error);
    errorMessage.value =
      "❌ " + (error?.response?.data?.message || "Error al subir archivo");
    setTimeout(() => (errorMessage.value = ""), 3000);
  } finally {
    loading.value = false;
  }
};

const showModal = ref(false)
const archivoAEliminar = ref(null)

const abrirModal = (id) => {
  archivoAEliminar.value = id
  showModal.value = true
}

const cerrarModal = () => {
  archivoAEliminar.value = null
  showModal.value = false
}

const eliminarArchivo = async () => {
  try {
    await axios.delete(`/archivos/${archivoAEliminar.value}`);
    let id = archivoAEliminar.value;
    successMessage.value = "Archivo eliminado correctamente ✅";
    cerrarModal();
    setTimeout(() => (successMessage.value = ""), 3000);

    archivos.value = archivos.value.filter((a) => a.id !== id);
  } catch (err) {
    console.error(err);
    errorMessage.value = "❌ Error al eliminar el archivo";
    setTimeout(() => (errorMessage.value = ""), 3000);
  }
};

const descargarArchivo = async (archivo) => {
  try {
    const url = `/archivos/${archivo.id}/download`;
    const response = await axios.get(url, { responseType: 'blob' });

    // 1) Si el backend devolvió un JSON (error), no intentes descargar
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      const text = await response.data.text(); // Blob -> texto
      const err = JSON.parse(text);
      throw new Error(err.message || 'Error al descargar el archivo');
    }
    // 2) Intentar obtener el filename del header Content-Disposition
    let filename = archivo?.file_name || 'archivo';

    const cd = response.headers['content-disposition'];
    if (cd) {
      // filename="..." o filename*=UTF-8''...
      const matchStar = cd.match(/filename\*\s*=\s*[^']*'[^']*'([^;]+)/i);
      const matchPlain = cd.match(/filename\s*=\s*"?([^"]+)"?/i);
      if (matchStar?.[1]) {
        filename = decodeURIComponent(matchStar[1]);
      } else if (matchPlain?.[1]) {
        filename = matchPlain[1];
      }
    } else if (archivo?.file_name) {
      // Fallback al nombre que tengas en tu objeto
      filename = archivo.file_name;
    }

    // 3) Tipo de archivo: confiar primero en el header, luego en tu dato, luego octet-stream
    const mime = contentType || archivo?.mime_type || 'application/octet-stream';

    // 4) Crear el blob y descargar
    const blob = new Blob([response.data], { type: mime });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    // No pongas "undefined" como nombre
    if (filename && filename !== 'undefined') {
      link.download = filename;
    }
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error al descargar archivo:', error);
  }
};

const fetchLotes = async () => {
  try {
    const { data } = await axios.get(`/lotes-por-user/${nuevoArchivo.value.user}`)
    lotes.value = data
  } catch (err) {
    console.error("Error al cargar lotes", err)
  }
}

const fetchCartas = async () => {
  try {
    const { data } = await axios.get("/cartas")
    cartas.value = data
  } catch (err) {
    console.error("Error al cargar cartas", err)
  }
}

const fetchArchivos = async () => {
  try {
    const { data } = await axios.get(
      `/archivos/user/${nuevoArchivo.value.user}`,
      {
        params: {
          is_admin: isAdmin.value ? 1 : 0, // o true/false, Laravel lo castea
        },
      }
    )
    archivos.value = data
  } catch (err) {
    console.error("Error al cargar archivos", err)
  }
}


onMounted(() => {
  isAdmin.value = !!localStorage.getItem('admin');
  fetchArchivos()
  fetchLotes()
  fetchCartas()
})
</script>

<style scoped>
.archivos-container {
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

.upload-box {
  background: #f9fafb;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 25px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.upload-title {
  font-size: 18px;
  margin-bottom: 15px;
  color: #333;
}

.upload-box input,
.upload-box textarea,
.upload-box select {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

.success-msg {
  color: green;
  font-weight: bold;
  margin-bottom: 10px;
}

.error-msg {
  color: red;
  font-weight: bold;
  margin-bottom: 10px;
}

.btn-create {
  background: #1976d2;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.btn-create:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

.btn-create:hover:not(:disabled) {
  background: #125a9c;
}

.loader {
  border: 2px solid #f3f3f3;
  border-top: 2px solid white;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.icon {
  cursor: pointer;
  font-size: 18px;
}

.icon.edit {
  color: #1976d2;
}

.icon.delete {
  color: #d32f2f;
}

.actions {
  margin-top: 15px;
  display: flex;
  justify-content: space-around;
}

.table-wrapper {
  overflow-x: auto;
  margin-top: 20px;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  border-radius: 8px;
  overflow: hidden;
}

.custom-table th,
.custom-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.custom-table th {
  background: #f5f7fa;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
}

.custom-table tr:hover {
  background: #f9fafc;
}

/* Botones */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn i {
  font-size: 1rem;
}

/* Botón descargar */
.btn-download {
  background: #2563eb;
  color: #fff;
}
.btn-download:hover {
  background: #1d4ed8;
}

/* Botón eliminar */
.btn-delete {
  background: #dc2626;
  color: #fff;
  padding: 6px 10px;
}
.btn-delete:hover {
  background: #b91c1c;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: #fff;
  padding: 20px 24px;
  border-radius: 8px;
  max-width: 320px;
  text-align: center;
}

.modal-buttons {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
}

.btn-confirm {
  background: #16a34a;
  color: #fff;
}
.btn-confirm:hover {
  background: #15803d;
}

.btn-cancel {
  background: #6b7280;
  color: #fff;
}
.btn-cancel:hover {
  background: #4b5563;
}

</style>
