<template>
  <header class="navbar">
    <div class="navbar-container">
      <div class="logo"><img
                            :src="logo"
                            alt="Haras Santa María"
                          />
        </div>
      <nav class="nav-links">
        <a v-if="!userExists" href="#nosotros">Nosotros</a>
        <a v-if="!userExists" href="#como-llegar">¿Cómo llegar?</a>
        <router-link to="/login" v-if="!userExists">Propietarios</router-link>

        <div
          v-if="userExists"
          class="profile-container"
          @mouseenter="dropdownVisible = true"
          @mouseleave="dropdownVisible = false"
        >
          <img
            :src="usuarioIcon"
            alt="Perfil"
            class="profile-icon"
          />
          <div v-if="dropdownVisible" class="dropdown">
            <button @click="goToProfile">Mi Perfil</button>
            <button @click="logout">
                <span class="logout-content">
                    <img src="@/assets/img/cerrar-sesion.png" alt="logout" class="icon" />
                    Cerrar sesión
                </span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  </header>
</template>


<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import usuarioIcon from '@/assets/img/usuario.png';
import logo from '@/assets/img/hsm.png';

const userExists = ref(false);
const dropdownVisible = ref(false);
const router = useRouter();

onMounted(() => {
  userExists.value = !!localStorage.getItem('user');
});

const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('admin');
  localStorage.removeItem('token')
  localStorage.removeItem('loginTime');
  localStorage.removeItem('sessionDuration')
  userExists.value = false;
  window.location.reload();
  router.push('/login');
};

const goToProfile = () => {
  router.push('/mi-perfil');
};

</script>

<style scoped>
.navbar {
  background-color: #f5f0e0;
  border-bottom: 1px solid #e5e5e5;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  padding: 0.75rem 2rem;
  position: sticky;
  top: 0;
  z-index: 1000;
  font-size: 18px;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}

.logo {
  font-weight: bold;
  color: #2c3e50;
  margin-top: 10px;
}

.nav-links {
align-items: center;
justify-content: center;
  display: flex;
  gap: 1.5rem;
}

.nav-links a {
  text-decoration: none;
  color: #2c3e50;
  font-weight: 500;
  transition: color 0.3s ease;
}

.nav-links a:hover {
  color: #27ae60;
}

.nav-links router-link {
  text-decoration: none;
  color: #2c3e50;
  font-weight: 500;
  transition: color 0.3s ease;
}
.nav-links router-link:hover {
  color: #27ae60;
}

.profile-container {
  position: relative;
  cursor: pointer;
}

.profile-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.dropdown {
    position: absolute;
    right: 0;
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 0.5rem;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.dropdown button {
  background: none;
  border: none;
  text-align: left;
  padding: 0.5rem;
  font-size: 0.95rem;
  color: #2c3e50;
  cursor: pointer;
  width: 175px;
}

.dropdown button:hover {
  background-color: #f2f2f2;
}

.logout-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.icon {
  width: 16px;
  height: 16px;
  color: #2c3e50;
}

/* Responsive */
@media (max-width: 768px) {
  .nav-links {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    margin-top: 1rem;
  }

  .dropdown {
      right: auto;
  }
  
}
</style>
