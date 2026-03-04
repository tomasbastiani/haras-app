<template>
  <header class="navbar">
    <div class="navbar-container">
      <div class="logo"><img
                            :src="logo"
                            alt="Haras Santa María"
                          />
        </div>
      <nav class="nav-links">
        <a v-if="!user" href="#nosotros">Nosotros</a>
        <a v-if="!user" href="#como-llegar">¿Cómo llegar?</a>
        <router-link to="/login" v-if="!user">Propietarios</router-link>

        <div
          v-if="user"
          class="profile-container"
          ref="profileRef"
        >
          <button class="profile-button" @click="toggleDropdown">
            <img :src="usuarioIcon" alt="Perfil" class="profile-icon" />
          </button>

          <transition name="fade-slide">
            <div v-if="dropdownVisible" class="dropdown">
              <button @click="goToProfile">Mi Perfil</button>
              <button @click="handleLogout">
                <span class="logout-content">
                  <img src="@/assets/img/cerrar-sesion.png" class="icon" />
                  Cerrar sesión
                </span>
              </button>
            </div>
          </transition>
        </div>
      </nav>
    </div>
  </header>
</template>


<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import usuarioIcon from '@/assets/img/usuario.png';
import logo from '@/assets/img/hsm.png';
import { useAuth } from '@/composables/useAuth'

const { user, logout } = useAuth()
const dropdownVisible = ref(false)
const profileRef = ref(null)
const router = useRouter();

const toggleDropdown = () => {
  dropdownVisible.value = !dropdownVisible.value
}

const handleClickOutside = (event) => {
  if (profileRef.value && !profileRef.value.contains(event.target)) {
    dropdownVisible.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleLogout = () => {
  logout()
}

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
  top: 45px;
  min-width: 200px;
  background: #ffffff;
  border-radius: 12px;
  padding: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  animation: fadeIn 0.15s ease-out;
}

.dropdown button {
  background: none;
  border: none;
  text-align: left;
  padding: 0.65rem 0.75rem;
  font-size: 0.95rem;
  border-radius: 8px;
  color: #2c3e50;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown button:hover {
  background-color: #f5f7f6;
  transform: translateX(2px);
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

.profile-button {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.profile-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.profile-icon:hover {
  border-color: #27ae60;
  transform: scale(1.05);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.18s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
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

@media (max-width: 480px) {
  .logo{
    width: 100%;
  }

  .logo img{
    width: 85%;
  }

  .nav-links {
    font-size: 15px;
    flex-direction: row;      /* 👈 lado a lado */
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;          /* por si no entran, que salten a la fila de abajo */
    gap: 0.75rem;
    width: 100%;
  }

}
</style>
