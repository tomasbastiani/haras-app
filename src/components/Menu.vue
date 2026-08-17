<template>
  <div class="menu-container">
    <div class="title-row">
      <h1 class="title">Bienvenido/a</h1>
      <span v-if="displayName" class="user-chip">{{ displayName }}</span>
    </div>

    <p class="section-label">General</p>
    <div class="cards-grid">
      <v-card
        v-for="item in generalItems"
        :key="item.fullTitle"
        class="menu-card"
        elevation="0"
        rounded="lg"
        @click="item.action"
      >
        <div class="card-icon-wrapper" :style="{ background: item.color }">
          <v-icon size="30" color="white">{{ item.icon }}</v-icon>
        </div>
        <v-card-text class="card-title">{{ item.fullTitle }}</v-card-text>
      </v-card>
    </div>

    <template v-if="isAdmin()">
      <p class="section-label">Administración</p>
      <div class="cards-grid">
        <v-card
          v-for="item in adminItems"
          :key="item.fullTitle"
          class="menu-card"
          elevation="0"
          rounded="lg"
          @click="item.action"
        >
          <div class="card-icon-wrapper" :style="{ background: item.color }">
            <v-icon size="30" color="white">{{ item.icon }}</v-icon>
            <span v-if="item.badge" class="badge">{{ item.badge }}</span>
          </div>
          <v-card-text class="card-title">{{ item.fullTitle }}</v-card-text>
        </v-card>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { useNotifications } from '@/composables/useNotifications';

const router = useRouter();
const { isAdmin, user, userName } = useAuth();
const { unreadCount } = useNotifications();

const displayName = computed(() => userName.value || user.value);

const GREEN = 'linear-gradient(135deg, #2ecc71, #1e8449)';
const NAVY = 'linear-gradient(135deg, #2c3e50, #1a2733)';

const generalItems = computed(() => [
  { fullTitle: 'Gastos Comunes', icon: 'mdi-cash-multiple', color: GREEN, action: () => router.push('/gastos') },
  // Turnero de Canchas: oculto para usuarios comunes por ahora. Para volver a
  // habilitarlo a todos, quitar el `...(isAdmin() ? [...] : [])` y dejar el objeto suelto.
  ...(isAdmin()
    ? [{ fullTitle: 'Turnero de Canchas', icon: 'mdi-tennis', color: GREEN, action: () => router.push('/turnero') }]
    : []),
  { fullTitle: 'Mi Perfil', icon: 'mdi-account-circle-outline', color: GREEN, action: () => router.push('/mi-perfil') },
  { fullTitle: 'Contacto/Servicios', icon: 'mdi-phone-in-talk-outline', color: GREEN, action: () => router.push('/contact-services') },
  {
    fullTitle: isAdmin() ? 'Ver Archivos' : 'Adjuntar Archivos',
    icon: isAdmin() ? 'mdi-folder-open-outline' : 'mdi-file-upload-outline',
    color: GREEN,
    action: () => router.push('/files'),
  },
]);

const adminItems = computed(() => [
  { fullTitle: 'Administrar Turnos', icon: 'mdi-clipboard-list-outline', color: NAVY, action: () => router.push('/turnero-admin') },
  { fullTitle: 'Listado Total Gastos Comunes', icon: 'mdi-format-list-bulleted', color: NAVY, action: () => router.push('/listado-gastos') },
  { fullTitle: 'Editar Usuarios por Lote', icon: 'mdi-account-group-outline', color: NAVY, action: () => router.push('/edit-users') },
  { fullTitle: 'Enviar Email', icon: 'mdi-email-send-outline', color: NAVY, action: () => router.push('/send-email') },
  { fullTitle: 'Importador Gastos Comunes', icon: 'mdi-file-import-outline', color: NAVY, action: () => router.push('/import-gastos') },
  { fullTitle: 'Importador Morosos', icon: 'mdi-file-alert-outline', color: NAVY, action: () => router.push('/import-morosos') },
  {
    fullTitle: 'Centro de Notificaciones',
    icon: 'mdi-bell-ring-outline',
    color: NAVY,
    badge: unreadCount.value || null,
    action: () => router.push('/notifications-center'),
  },
]);
</script>

<style scoped>
.menu-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 1rem 4rem;
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-bottom: 2rem;
}

.title {
  font-size: 2.2rem;
  color: #2c3e50;
  margin: 0;
  text-align: center;
}

.user-chip {
  font-family: inherit;
  font-size: 1.4rem;
  font-weight: 600;
  color: #27ae60;
}

.section-label {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #8a8a8a;
  margin: 2rem 0 1rem 0.25rem;
}

.section-label:first-of-type {
  margin-top: 0;
}

.cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 768px) {
  .cards-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.menu-card {
  background-color: #ffffff !important;
  cursor: pointer;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08) !important;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.menu-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14) !important;
}

.card-icon-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background-color: #e53935;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid #ffffff;
}

.card-title {
  font-size: 0.95rem;
  color: #2c3e50;
  font-weight: 500;
  line-height: 1.3;
  padding: 0;
}
</style>
