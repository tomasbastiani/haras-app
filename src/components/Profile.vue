<template>
  <div class="profile-container">
    <div class="header">
      <span class="back-arrow" @click="goBack">←</span>
      <h1>Mi Perfil</h1>
    </div>
    <div style="text-align: center; margin-bottom: 30px;" class="user-text">
      <span>Usuario: {{ userEmail }}</span>
    </div>

    <div class="tabs-wrapper">
      <v-tabs v-model="tab" background-color="#3f51b5" dark centered>
        <v-tab value="lotes">Mis Lotes</v-tab>
        <v-tab value="contrasenia">Cambiar Contraseña</v-tab>
      </v-tabs>
    </div>

    <!-- <div class="change-password-container" v-if="isAdmin">
        <form @submit.prevent="handleChangePassword" class="form">
            <div class="form-group">
                <label for="currentPassword">Contraseña actual</label>
                <input type="password" id="currentPassword" v-model="currentPassword" required />
            </div>

            <div class="form-group">
                <label for="newPassword">Nueva contraseña</label>
                <input type="password" id="newPassword" v-model="newPassword" required />
            </div>

            <div class="form-group">
                <label for="confirmPassword">Confirmar nueva contraseña</label>
                <input type="password" id="confirmPassword" v-model="confirmPassword" required />
            </div>

            <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
            <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

            <div class="form-group">
                <button type="submit" class="submit-button" :disabled="isLoading">
                    <span v-if="isLoading" class="spinner"></span>
                    <span v-else>Cambiar contraseña</span>
                </button>
            </div>
        </form>
    </div> -->

    <v-window v-model="tab" class="tab-content">
      
      <v-window-item value="lotes">
        <div class="spinner-mounted-container" v-if="isLoadingLotes">
          <span class="spinner-mounted"></span>
        </div>
        <div v-else class="mis-lotes-table-wrapper">

          <!-- Filtros solo visible si es admin -->
          <div v-if="isAdmin" class="lotes-filters">
            <input
              type="text"
              v-model="searchEmail"
              placeholder="Buscar por email"
              class="filter-input"
            />
            <input
              type="text"
              v-model="searchLote"
              placeholder="Buscar por lote"
              class="filter-input"
            />
          </div>

          <table class="facturas-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Lote</th>
                <th class="editar-col">Editar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(lote, index) in paginatedLotes" :key="index">
                <td>{{ lote.email }}</td>
                <td>{{ lote.nlote }}</td>
                <td class="editar-col">
                  <img
                    :src="editIcon"
                    alt=""
                    @click="editarFactura(lote)"
                    style="width: 20px; cursor: pointer;"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Paginador -->
          <div v-if="isAdmin" class="pagination">
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="page-btn"
            >
              Anterior
            </button>
            <span class="page-info">Página {{ currentPage }} de {{ totalPages }}</span>
            <button
              @click="currentPage++"
              :disabled="currentPage === totalPages"
              class="page-btn"
            >
              Siguiente
            </button>
          </div>
        </div>
      </v-window-item>

      <!-- Modal Edit Lotes -->
      <template>
        <v-dialog v-model="showEditModal" max-width="500px">
          <v-card>
            <v-card-title class="text-h6">Editar Usuario</v-card-title>
            <v-card-text>
              <v-form>
                <v-text-field
                  v-model="facturaEditando.email"
                  label="Email"
                  outlined
                  dense
                ></v-text-field>
                <v-text-field
                  v-model="facturaEditando.nlote"
                  label="Lote"
                  outlined
                  dense
                  disabled
                ></v-text-field>

                <div v-if="mostrarRegistro">
                  <h3>⚠️ Debe registrar el email</h3>
                  <v-text-field
                    v-model="nuevoUsuario.nombre"
                    label="Nombre"
                    outlined
                    dense
                  ></v-text-field>
                  <v-text-field
                    v-model="nuevoUsuario.email"
                    label="Email"
                    outlined
                    dense
                    disabled
                  ></v-text-field>
                  <v-text-field
                    v-model="nuevoUsuario.password"
                    label="Contraseña"
                    type="password"
                    outlined
                    dense
                  ></v-text-field>
                  <v-btn
                    :disabled="isSaving"
                    color="primary"
                    @click="registrarNuevoUsuario"
                    style="margin-bottom: 10px;"
                  >
                    <span v-if="isSaving" class="spinner"></span>
                    <span v-else>Guardar usuario</span>
                  </v-btn>
                </div>

                <div v-if="mensajeExito" class="success-message">{{ mensajeExito }}</div>
                <div v-if="mensajeError" class="error-message">{{ mensajeError }}</div>
              </v-form>
            </v-card-text>
            <v-card-actions v-if="!mostrarRegistro">
              <v-spacer></v-spacer>
              <v-btn text @click="showEditModal = false">Cancelar</v-btn>
              <v-btn color="primary" :disabled="isSaving" @click="guardarEdicionFactura">
                <span v-if="isSaving" class="spinner"></span>
                <span v-else>Guardar</span>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </template>

      <v-window-item value="contrasenia">
        <div class="change-password-container">
            <form @submit.prevent="handleChangePassword" class="form">
                <div class="form-group">
                    <label for="currentPassword">Contraseña actual</label>
                    <input type="password" id="currentPassword" v-model="currentPassword" required />
                </div>

                <div class="form-group">
                    <label for="newPassword">Nueva contraseña</label>
                    <input type="password" id="newPassword" v-model="newPassword" required />
                </div>

                <div class="form-group">
                    <label for="confirmPassword">Confirmar nueva contraseña</label>
                    <input type="password" id="confirmPassword" v-model="confirmPassword" required />
                </div>

                <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
                <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

                <div class="form-group">
                    <button type="submit" class="submit-button" :disabled="isLoading">
                        <span v-if="isLoading" class="spinner"></span>
                        <span v-else>Cambiar contraseña</span>
                    </button>
                </div>
            </form>
        </div>
      </v-window-item>

    </v-window>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/axios';
import editIcon from '@/assets/img/editar.png';

const isAdmin = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const isLoading = ref(false);
const userEmail = localStorage.getItem('user');
const lotes = ref([])
const isLoadingLotes = ref(true)
const showEditModal = ref(false);
const facturaEditando = ref({
  email: '',
  nlote: ''
});
const isSaving = ref(false)
const mensajeExito = ref('')
const mensajeError = ref('')
const mostrarRegistro = ref(false)
const nuevoUsuario = ref({ nombre: '', email: '', password: '' })

const searchEmail = ref('')
const searchLote = ref('')
const currentPage = ref(1)
const itemsPerPage = 10


const filteredLotes = computed(() => {
  return lotes.value.filter(lote => {
    const matchEmail = lote.email.toLowerCase().includes(searchEmail.value.toLowerCase())
    const matchLote = lote.nlote.toLowerCase().includes(searchLote.value.toLowerCase())
    return matchEmail && matchLote
  })
})

// Paginación
const totalPages = computed(() => Math.ceil(filteredLotes.value.length / itemsPerPage))

const paginatedLotes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredLotes.value.slice(start, start + itemsPerPage)
})


const fetchLotes = async () => {
  try {
    const response = await axios.get(`/mis-lotes/${userEmail}`)
    lotes.value = response.data
  } catch (error) {
    console.error('Error al obtener los lotes:', error)
  } finally {
    isLoadingLotes.value = false
  }
}

onMounted(() => {
  isAdmin.value = !!localStorage.getItem('admin');

  if (tab.value === 'lotes') {
    fetchLotes()
  }
})

const handleChangePassword = async () => {
  errorMessage.value = '';
  successMessage.value = '';
  isLoading.value = true;

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Las nuevas contraseñas no coinciden.';
    isLoading.value = false;
    return;
  }

  try {
    const token = localStorage.getItem('token');

    const response = await axios.post(
      '/change-password',
      {
        email: localStorage.getItem('user'),
        current_password: currentPassword.value,
        new_password: newPassword.value,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    successMessage.value = response.data.message;
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';

    // Espera 2 segundos y redirige
    setTimeout(() => {
      router.push('/menu');
    }, 2000);
  } catch (error) {
    console.log('error', error);
    if (error.response?.data?.message === 'The new password must be at least 8 characters.') {
      errorMessage.value = 'La contraseña debe tener al menos 8 caracteres.';
    } else {
      errorMessage.value = error.response?.data?.message || 'Error al cambiar la contraseña.';
    }
  } finally {
    isLoading.value = false;
  }
};

const editarFactura = (factura) => {
  facturaEditando.value = { ...factura }
  showEditModal.value = true
  mensajeExito.value = ''
  mostrarRegistro.value = false
}

const guardarEdicionFactura = async () => {
  isSaving.value = true
  mensajeExito.value = ''
  mostrarRegistro.value = false

  try {
    // 1. Actualizar email en gastoscomunes
    await axios.post('/update-email-lote', {
      email: facturaEditando.value.email,
      nlote: facturaEditando.value.nlote
    })

    // 2. Verificar si el email existe en la tabla users
    const res = await axios.get(`/verificar-email/${facturaEditando.value.email}`)
    const emailExiste = res.data.exists

    if (emailExiste) {
      mensajeExito.value = 'Usuario actualizado correctamente para el lote'
      setTimeout(() => {
        showEditModal.value = false
        mensajeExito.value = ''
        fetchLotes();
      }, 2000)
    } else {
      mostrarRegistro.value = true
      nuevoUsuario.value.email = facturaEditando.value.email
    }
  } catch (error) {
    console.error('Error al actualizar:', error)
  } finally {
    isSaving.value = false
  }
}

const registrarNuevoUsuario = async () => {
  isSaving.value = true
  mensajeExito.value = ''
  mensajeError.value = ''

  try {
    await axios.post('/create-user', {
      nombre: nuevoUsuario.value.nombre,
      email: nuevoUsuario.value.email,
      password: nuevoUsuario.value.password
    })

    mensajeExito.value = 'Usuario actualizado correctamente para el lote'
    setTimeout(() => {
      showEditModal.value = false
      mensajeExito.value = ''
    }, 2000)
  } catch (error) {
    console.error('Error al registrar usuario:', error)
    if (error.response.data.message === 'The password must be at least 4 characters.') {
      mensajeError.value = 'La contraseña debe tener al menos 4 caracteres'
    } else {
      mensajeError.value = 'Ocurrió un error al registrar el usuario.'
    }
  } finally {
    isSaving.value = false;
    window.location.reload();
  }
}

const tab = ref('lotes')
const router = useRouter()
const goBack = () => router.push('/menu')
</script>

<style scoped>
.profile-container {
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

.tabs-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

/* mantiene el max-width y centrado de tabs */
.v-tabs {
  max-width: 500px;
  margin: 0 auto;
}

/* espacio entre tabs */
.v-tabs .v-tab {
  margin: 0 12px;
}

.tab-content {
  margin-top: 30px;
  text-align: left;
  font-size: 16px;
  color: #444;
}

.change-password-container {
    width: 85%;
    margin: auto;
    padding: 2rem;
    background: #fff;
    border-radius: 10px;
}

.form-group {
  margin-bottom: 1.5rem;
text-align: center;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
}

input {
  width: 80%;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
}

.submit-button {
  width: 35%;
  padding: 0.7rem;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-button:hover {
  background-color: #219150;
}

.error-message {
  background-color: #f8d7da;
    color: #842029;
    padding: 0.8rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    width: 80%;
    text-align: center;
    margin-right: auto;
    margin-left: auto;
}

.success-message {
  background-color: #d1e7dd;
  color: #0f5132;
  padding: 0.8rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  width: 80%;
  text-align: center;
  margin-right: auto;
  margin-left: auto;
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

.mis-lotes-table-wrapper {
  margin-top: 20px;
}

.facturas-table {
  width: 100%;
  border-collapse: collapse;
}

.facturas-table th,
.facturas-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}

.facturas-table th {
  background-color: #f0f0f0;
  color: #333;
}

.facturas-table td.editar-col,
.facturas-table th.editar-col {
  width: 90px;
  text-align: center;
  padding: 5px;
}

h3{
  margin-bottom: 10px;
}

.lotes-filters {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.filter-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}

.filter-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 4px rgba(25, 118, 210, 0.4);
}

/* Estilos del paginador */
.pagination {
  margin-top: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.page-btn {
  padding: 6px 14px;
  background-color: #ffd100;
  color: black;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.page-btn:hover:not(:disabled) {
  background-color: #125a9c;
}

.page-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #333;
}

@media (max-width: 768px) {
  .facturas-table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }

  .change-password-container {
    width: 90%;
    margin: auto;
    padding: 2rem;
    background: #fff;
    border-radius: 10px;
  }

  input {
    width: 100%;
  }

  .submit-button {
    width: 100%;
  }
}


@media (max-width: 480px) {

  .user-text{
    color: #111 !important;             /* color del texto */
    background-color: #ffffff;          /* fondo blanco */
    caret-color: #111;  
  }
  
  span{
    color: #111 !important;             /* color del texto */
    background-color: #ffffff;          /* fondo blanco */
    caret-color: #111;  
  }

}

</style>
