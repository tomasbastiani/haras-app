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
                  :content="unreadCount > 99 ? '99+' : unreadCount"
                  offset-x="3"
                  offset-y="3"
                >
                  <img :src="notificacionesIcon" alt="Notificaciones" class="profile-icon notif-img" />
                </v-badge>
                <img v-else :src="notificacionesIcon" alt="Notificaciones" class="profile-icon notif-img" />
              </v-btn>
            </template>

            <v-card min-width="320" max-width="400" class="rounded-lg elevation-10 notif-panel">
              <div class="notif-panel-header">
                <v-icon color="white" size="20" class="mr-2">mdi-bell</v-icon>
                <span class="notif-panel-title">Notificaciones</span>
                <v-spacer></v-spacer>
                <button v-if="unreadCount > 0" class="notif-mark-all" @click="markAllAsRead">
                  Marcar todo leído
                </button>
              </div>

              <v-list class="notification-list pa-0" max-height="420">
                <template v-if="notifications.length > 0">
                  <template v-for="(item, index) in notifications" :key="item.id">
                    <v-list-item
                      :class="{ 'unread-item': !item.is_read }"
                      class="notif-item py-3 px-4"
                      link
                      @click="openNotification(item)"
                    >
                      <template v-slot:prepend>
                        <span class="notif-dot" :class="{ 'is-unread': !item.is_read }"></span>
                      </template>

                      <v-list-item-title class="notif-item-title">
                        {{ item.title }}
                      </v-list-item-title>
                      <v-list-item-subtitle class="notif-item-body">
                        {{ item.body }}
                      </v-list-item-subtitle>

                      <div class="notif-item-time">
                        {{ formatRelativeTime(item.created_at) }}
                      </div>
                    </v-list-item>
                    <v-divider v-if="index < notifications.length - 1"></v-divider>
                  </template>

                  <v-list-item v-if="hasMore" class="notif-load-more-item" @click="loadMoreNotifications">
                    <div class="notif-load-more">
                      <v-progress-circular
                        v-if="loadingMore"
                        indeterminate
                        size="16"
                        width="2"
                        color="#27ae60"
                        class="mr-2"
                      ></v-progress-circular>
                      <span>{{ loadingMore ? 'Cargando...' : 'Cargar más' }}</span>
                    </div>
                  </v-list-item>
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
            <v-card-item class="notif-modal-header py-6">
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
                class="notif-modal-btn px-8 rounded-pill font-weight-bold"
                variant="elevated"
                size="large"
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
const { notifications, unreadCount, hasMore, loadingMore, fetchNotifications, loadMoreNotifications, markAllAsRead, markOneAsRead } = useNotifications()

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

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs} h`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
};

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleLogout = () => {
  dropdownVisible.value = false;
  logout();
}

const goToProfile = () => {
  dropdownVisible.value = false;
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
  background-color: #f0f7f4;
}

.notification-list {
  overflow-y: auto;
}

.notif-panel-header {
  display: flex;
  align-items: center;
  background-color: #2c3e50;
  color: #fff;
  padding: 0.85rem 1rem;
}

.notif-panel-title {
  font-size: 1.05rem;
  font-weight: 700;
}

.notif-mark-all {
  background: none;
  border: none;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  opacity: 0.9;
  text-decoration: underline;
  padding: 0;
  white-space: nowrap;
}

.notif-mark-all:hover {
  opacity: 1;
}

.notif-item {
  cursor: pointer;
  align-items: flex-start !important;
}

.notif-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: transparent;
  margin-top: 6px;
  flex-shrink: 0;
}

.notif-dot.is-unread {
  background-color: #27ae60;
}

.notif-item-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.2rem;
  white-space: normal;
}

.notif-item-body {
  font-size: 0.85rem;
  color: #5a6b7a;
  opacity: 1 !important;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal !important;
}

.notif-item-time {
  font-size: 0.72rem;
  color: #9aa5ad;
  margin-top: 0.35rem;
}

.notif-load-more-item {
  cursor: pointer;
  color: #27ae60;
  font-weight: 600;
  font-size: 0.85rem;
  justify-content: center;
}

.notif-load-more-item:hover {
  background-color: #f7f7f5;
}

.notif-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.25rem 0;
}

.notif-modal-header {
  background: linear-gradient(135deg, #2c3e50, #1a2733);
  color: #fff;
}

.notif-modal-btn {
  background-color: #27ae60 !important;
  color: #fff !important;
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
