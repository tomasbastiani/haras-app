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

        <!-- Contenedor de Notificaciones -->
        <div v-if="user" class="notification-container">
          <v-menu :close-on-content-click="false" location="bottom end" transition="scale-transition">
            <template v-slot:activator="{ props }">
              <v-btn icon variant="text" v-bind="props" class="notification-btn" @click="handleOpenNotifications">
                <v-badge
                  v-if="unreadCount > 0"
                  color="error"
                  :content="unreadCount"
                  offset-x="3"
                  offset-y="3"
                >
                  <img :src="notificacionesIcon" alt="Notificaciones" class="profile-icon notif-img" />
                </v-badge>
                <img v-else :src="notificacionesIcon" alt="Notificaciones" class="profile-icon notif-img" />
              </v-btn>
            </template>

            <v-card min-width="320" max-width="400" class="rounded-lg elevation-10">
              <v-list class="pa-0">
                <v-list-item class="bg-primary text-white py-3">
                  <template v-slot:prepend>
                    <v-icon color="white">mdi-bell</v-icon>
                  </template>
                  <v-list-item-title class="text-h6 font-weight-bold">Notificaciones</v-list-item-title>
                  <template v-slot:append>
                    <v-btn
                      v-if="unreadCount > 0"
                      variant="text"
                      color="white"
                      size="small"
                      @click="markAllAsRead"
                    >
                      Marcar todo como leído
                    </v-btn>
                  </template>
                </v-list-item>
              </v-list>

              <v-divider></v-divider>

              <v-list class="notification-list pa-0" max-height="400">
                <template v-if="notifications.length > 0">
                  <template v-for="(item, index) in notifications" :key="item.id">
                    <v-list-item 
                      :class="{ 'unread-item': !item.is_read }"
                      class="py-3 px-4"
                      link
                      @click="openNotification(item)"
                    >
                      <template v-slot:prepend>
                        <v-avatar size="40" :color="item.is_read ? 'grey-lighten-3' : 'blue-lighten-4'" class="mr-3">
                          <v-icon :color="item.is_read ? 'grey-darken-1' : 'primary'">
                            {{ item.is_read ? 'mdi-email-open-outline' : 'mdi-email-outline' }}
                          </v-icon>
                        </v-avatar>
                      </template>

                      <v-list-item-title class="text-subtitle-1 font-weight-bold mb-1">
                        {{ item.title }}
                      </v-list-item-title>
                      <v-list-item-subtitle class="text-body-2 text-wrap" style="opacity: 0.8">
                        {{ item.body }}
                      </v-list-item-subtitle>
                      
                      <div class="text-caption mt-2 grey--text">
                        {{ formatDate(item.created_at) }}
                      </div>
                    </v-list-item>
                    <v-divider v-if="index < notifications.length - 1"></v-divider>
                  </template>
                </template>
                
                <v-list-item v-else class="pa-8 text-center">
                  <v-icon size="48" color="grey-lighten-1" class="mb-4">mdi-bell-off-outline</v-icon>
                  <div class="text-body-1 grey--text">No hay notificaciones recientes</div>
                </v-list-item>
              </v-list>
            </v-card>
          </v-menu>
        </div>

        <!-- Modal de Detalle de Notificación -->
        <v-dialog v-model="showDetail" max-width="500" transition="dialog-bottom-transition" class="modern-dialog">
          <v-card v-if="selectedNotification" class="rounded-xl elevation-24">
            <v-card-item class="bg-primary text-white py-6">
              <template v-slot:prepend>
                <v-icon size="32" color="white" class="mr-4">mdi-bullhorn-variant</v-icon>
              </template>
              <v-card-title class="text-h5 font-weight-bold">{{ selectedNotification.title }}</v-card-title>
              <template v-slot:append>
                <v-btn icon="mdi-close" variant="text" color="white" @click="showDetail = false"></v-btn>
              </template>
            </v-card-item>

            <v-card-text class="pa-8">
              <div class="text-body-1 mb-6 text-grey-darken-3 line-height-relaxed">
                {{ selectedNotification.body }}
              </div>
              
              <v-divider class="mb-6"></v-divider>
              
              <div class="d-flex align-center justify-space-between text-caption grey--text">
                <div class="d-flex align-center">
                  <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
                  {{ formatDate(selectedNotification.created_at) }}
                </div>
                <div class="font-weight-medium text-uppercase letter-spacing-1">Haras Santa María</div>
              </div>
            </v-card-text>

            <v-card-actions class="pa-6 pt-0">
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                variant="elevated"
                size="large"
                class="px-8 rounded-pill font-weight-bold"
                @click="showDetail = false"
              >
                Entendido
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

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
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import usuarioIcon from '@/assets/img/usuario.png';
import logo from '@/assets/img/hsm.png';
import notificacionesIcon from '@/assets/img/notificaciones.png';
import { useAuth } from '@/composables/useAuth'
import { useNotifications } from '@/composables/useNotifications'

const { user, logout } = useAuth()
const { notifications, unreadCount, fetchNotifications, markAllAsRead, markOneAsRead } = useNotifications()

const dropdownVisible = ref(false)
const profileRef = ref(null)
const router = useRouter();

// Estado para el modal de detalle
const showDetail = ref(false)
const selectedNotification = ref(null)

const toggleDropdown = () => {
  dropdownVisible.value = !dropdownVisible.value
}

const openNotification = (item) => {
  selectedNotification.value = item
  showDetail.value = true
  
  // Si no está leída, marcar como leída al abrir o cerrar
  // En este caso, lo hacemos al abrir para mejor UX instantánea
  if (!item.is_read) {
    markOneAsRead(item.id)
  }
}

const handleClickOutside = (event) => {
  if (profileRef.value && !profileRef.value.contains(event.target)) {
    dropdownVisible.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (user.value) {
    fetchNotifications()
  }
})

// Observar cuando el usuario cambia (ej. después de login)
watch(user, (newUser) => {
  if (newUser) {
    fetchNotifications()
  } else {
    // Si se desloguea, limpiamos (esto es redundante pero seguro)
    fetchNotifications() 
  }
})

const handleOpenNotifications = () => {
  // Opcional: Podrías marcar como leídas al abrir,
  // pero el usuario pidió un botón explícito.
}

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

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
  gap: 1rem;
}

.notification-btn {
  color: #2c3e50;
  width: 44px !important;
  height: 44px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.notif-img {
  mix-blend-mode: multiply;
  padding: 4px; /* Un poco de aire para que el borde verde no toque la campana */
}

/* Estilos unificados para ambos iconos */
.profile-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: all 0.2s ease;
  object-fit: contain;
}

.profile-icon:hover {
  border-color: #27ae60;
  transform: scale(1.1);
}

.unread-item {
  background-color: #f0f7ff;
}

.notification-list {
  overflow-y: auto;
}

.notif-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  mix-blend-mode: multiply;
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

.notification-container,
.profile-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  height: 100%; /* Asegura que ocupen todo el alto disponible */
}

.profile-icon {
  width: 36px;
  height: 36px;
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
  display: flex;
  align-items: center;
  justify-content: center;
}

/* El hover ahora es manejado por la clase unificada arriba */

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

.line-height-relaxed {
  line-height: 1.6;
}

.letter-spacing-1 {
  letter-spacing: 1px;
}

.modern-dialog :deep(.v-overlay__content) {
  border-radius: 24px !important;
}
</style>
