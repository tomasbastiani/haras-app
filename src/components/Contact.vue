<template>
  <div class="contact-wrapper">
    <div class="back-arrow" @click="$router.push('/menu')">
      <span class="arrow">←</span>
    </div>

    <v-tabs v-model="tab" class="custom-tabs" background-color="white" grow>
      <v-tab value="contactos">Contactos</v-tab>
      <v-tab value="servicios">Servicios</v-tab>
    </v-tabs>

    <v-window v-model="tab" class="tab-content">
      <v-window-item value="contactos">
        <div class="card-grid">
          <div class="contact-card" v-for="item in contactos" :key="item.titulo">
            <h3>{{ item.titulo }}</h3>
            <p v-if="item.mail"><i class="fas fa-envelope"></i> {{ item.mail }}</p>
            <p v-if="item.tel"><i class="fas fa-phone"></i> {{ item.tel }}</p>
          </div>
        </div>
      </v-window-item>

      <v-window-item value="servicios">
        <div class="card-grid">
          <div class="contact-card" v-for="item in servicios" :key="item.titulo">
            <h3>{{ item.titulo }}</h3>
            <p v-if="item.mail"><i class="fas fa-envelope"></i> {{ item.mail }}</p>
            <p v-if="item.tel"><i class="fas fa-phone"></i> {{ item.tel }}</p>
            <p v-if="item.ws"><i class="fab fa-whatsapp"></i> {{ item.ws }}</p>
          </div>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const tab = ref('contactos');

const contactos = [
  { titulo: 'Intendencia', mail: 'servicios@harassantamaria.com.ar', tel: '0348-4494369' },
  { titulo: 'Administración', mail: 'administracion@harassantamaria.com.ar', tel: '0348-4268016' },
  { titulo: 'Arquitectura', mail: 'arquitectura@harassantamaria.com.ar', tel: '0348-4268019' },
  { titulo: 'Guardia emergencias', tel: '0348-4268006' },
  { titulo: 'Guardia portería', tel: '0348-4494363 / 0348-4494366' },
  { titulo: 'Family', tel: '0348-4494365' }
];

const servicios = [
  { titulo: 'Family Service Center', tel: '0348-4494365', mail: 'Family@harassantamaria.com.ar' },
  { titulo: 'Exactio', tel: '0348-4494397', ws: '1161340233', mail: '' },
  { titulo: 'Actividades deportivas para niños - Cristian Lobosco', tel: '01115628857144' }
];
</script>

<style scoped>
.contact-wrapper {
  padding: 1.5rem;
  font-family: 'Roboto', sans-serif;
}

.back-arrow {
  font-size: 1.5rem;
  cursor: pointer;
  margin-right: 1rem;
}

.custom-tabs {
  width: 60%;
margin: 0 auto 2rem auto;
}

.tab-content {
  margin-top: 1rem;
}

.card-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    justify-content: center;
    margin-top: 1rem;
    width: 80%;
    margin-right: auto;
    margin-left: auto;
}

.contact-card {
  background: white;
  border-radius: 10px;
  padding: 1.2rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  word-break: break-word;
}

.contact-card h3 {
  margin-bottom: 0.8rem;
  color: #e74c3c;
  font-size: 1.2rem;
}

.contact-card p {
  margin: 0.3rem 0;
  display: flex;
  align-items: center;
  font-size: 1rem;
  gap: 0.5rem;
}

.contact-card i {
  color: #3498db;
}
</style>
