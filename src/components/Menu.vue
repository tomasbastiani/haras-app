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
        @click="router.push(item.to)"
      >
        <div class="card-icon-wrapper" :style="{ background: item.color }">
          <v-icon size="30" color="white">{{ item.icon }}</v-icon>
        </div>
        <v-card-text class="card-title">{{ item.fullTitle }}</v-card-text>
      </v-card>
    </div>

    <!-- El operario de paquetería no es admin, pero su sección vive acá igual:
         la lista de tarjetas ya viene filtrada por rol desde adminItems. -->
    <template v-if="mostrarAdmin">
      <p class="section-label">Administración</p>
      <div class="cards-grid">
        <v-card
          v-for="item in adminItems"
          :key="item.fullTitle"
          class="menu-card"
          elevation="0"
          rounded="lg"
          @click="router.push(item.to)"
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
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { useMenuItems } from '@/composables/useMenuItems';

const router = useRouter();
const { user, userName } = useAuth();
const { generalItems, adminItems, mostrarAdmin, cargarAcceso } = useMenuItems();

const displayName = computed(() => userName.value || user.value);

onMounted(cargarAcceso);
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

/* Mobile: dos tarjetas por fila aprovechando todo el ancho. */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .cards-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;
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

/* Ajustes finos sólo para la app mobile: tarjetas más compactas para que
   entren dos por fila sin que el texto se corte. */
@media (max-width: 767px) {
  .menu-container {
    padding: 1.5rem 0.85rem 3rem;
  }

  .title-row {
    margin-bottom: 1.25rem;
  }

  .title {
    font-size: 1.6rem;
  }

  .user-chip {
    font-size: 1.1rem;
  }

  .section-label {
    margin: 1.5rem 0 0.65rem 0.15rem;
  }

  .menu-card {
    padding: 1rem 0.5rem;
    justify-content: flex-start;
    min-height: 132px;
  }

  .card-icon-wrapper {
    width: 52px;
    height: 52px;
    margin-bottom: 0.55rem;
  }

  .card-icon-wrapper :deep(.v-icon) {
    font-size: 26px !important;
  }

  .card-title {
    font-size: 0.82rem;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }
}
</style>
