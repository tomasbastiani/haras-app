<template>
  <div class="menu-container">
    <h1 class="title">Bienvenido</h1>

    <div class="cards">
      <div class="card" @click="goToGastos">
        <img src="@/assets/img/gcomunes.png" alt="Gastos Comunes" class="card-image" />
        <h2 class="card-title">Gastos Comunes</h2>
      </div>

      <div class="card" @click="goToListadoGastos" v-if="isAdmin">
        <img src="@/assets/img/listado.png" alt="Listado Total Gastos Comunes" class="card-image" />
        <h2 class="card-title">Listado Total Gastos Comunes</h2>
      </div>

      <div class="card" @click="goToEditLote" v-if="isAdmin">
        <img src="@/assets/img/lista-de-contactos.png" alt="Editar Usuario por Lote" class="card-image" />
        <h2 class="card-title">Editar Usuarios por Lote</h2>
      </div>

      <div class="card" @click="goToProfile">
        <img src="@/assets/img/profile.png" alt="Mi Perfil" class="card-image" />
        <h2 class="card-title">Mi Perfil</h2>
      </div>

      <div class="card" @click="goToContact">
        <img src="@/assets/img/contactos.png" alt="Contacto/Servicios" class="card-image" />
        <h2 class="card-title">Contacto/Servicios</h2>
      </div>

      <div class="card" @click="goToFiles">
        <img src="@/assets/img/subir-flecha-arriba.png" alt="Adjuntar Archivos" class="card-image" />
        <h2 class="card-title">Adjuntar Archivos</h2>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isAdmin = ref(false);

onMounted(() => {
  isAdmin.value = !!localStorage.getItem('admin');
});

const goToGastos = () => {
  router.push('/gastos');
};

const goToListadoGastos = () => {
  router.push('/listado-gastos');
};

const goToContact = () => {
  router.push('/contact-services');
};

const goToProfile = () => {
  router.push('/mi-perfil');
};

const goToEditLote = () => {
  router.push('/edit-users');
};

const goToFiles = () => {
  router.push('/files');
};
</script>

<style scoped>
.menu-container {
  text-align: center;
  margin-top: 5rem;
}

.title {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 3rem;
}

.cards {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
}

.card {
  background-color: #f9f9f9;
  border-radius: 12px;
  padding: 1.5rem;
  width: 220px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  text-align: center;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.card-image {
  width: 100%;
  height: 140px;
  object-fit: contain;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.2rem;
  color: #2c3e50;
}
</style>
