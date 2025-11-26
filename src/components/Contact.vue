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
            <v-btn
              v-if="item.mail"
              color="deep-orange"
              small
              elevation="2"
              class="email-button"
              @click="abrirModal(item.mail)"
            >
              <v-icon left>mdi-email-send</v-icon>
              Enviar mail
            </v-btn>
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
            <v-btn
              v-if="item.mail"
              color="deep-orange"
              small
              elevation="2"
              class="email-button"
              @click="abrirModal(item.mail)"
            >
              <v-icon left>mdi-email-send</v-icon>
              Enviar mail
            </v-btn>
          </div>
        </div>
      </v-window-item>
    </v-window>

    <!-- Modal Enviar Email -->
    <v-dialog v-model="showEmailModal" max-width="500px">
      <v-card>
        <v-card-title class="text-h6">
          Enviar a: {{ emailDestino }}
        </v-card-title>
        <v-card-text>
          <v-form>
            <v-text-field
              v-model="subject"
              label="Asunto"
              outlined
              dense
            />
            <v-textarea
              v-model="mensaje"
              label="Mensaje"
              outlined
              dense
              rows="4"
            />
          </v-form>
          <div v-if="mensajeExito" class="success-message">{{ mensajeExito }}</div>
          <div v-if="mensajeError" class="error-message">{{ mensajeError }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showEmailModal = false">Cancelar</v-btn>
          <v-btn :loading="isSending" color="primary" @click="enviarEmail">
            <span v-if="!isSending">Enviar</span>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from '@/axios';

const isSending = ref(false)
const mensajeExito = ref('')
const mensajeError = ref('')
const tab = ref('contactos');

const showEmailModal = ref(false);
const emailDestino = ref('');
const subject = ref('');
const mensaje = ref('');

const abrirModal = (mail) => {
  emailDestino.value = mail;
  subject.value = '';
  mensaje.value = '';
  showEmailModal.value = true;
};

const enviarEmail = async () => {
  isSending.value = true
  mensajeExito.value = ''
  mensajeError.value = ''

  try {
    // Traemos el usuario del localStorage
    const usuario = localStorage.getItem('user') || 'Usuario desconocido'

    // Armamos el cuerpo del mail agregando el usuario
    const cuerpoMensaje = `
      Usuario: ${usuario}
      
      Mensaje:
      ${mensaje.value}
    `

    const res = await axios.post('/enviar-contacto', {
      to: emailDestino.value,
      subject: subject.value,
      message: cuerpoMensaje
    })

    mensajeExito.value = res.data.message || 'Email enviado correctamente'
    setTimeout(() => {
      showEmailModal.value = false
      mensajeExito.value = ''
    }, 2000)
  } catch (error) {
    mensajeError.value = 'Ocurrió un error al enviar el correo.'
    console.error('Error al enviar el email:', error)
  } finally {
    isSending.value = false
  }
}


// const contactos = [
//   { titulo: 'Intendencia', mail: 'servicios@harassantamaria.com.ar', tel: '0348-4494369' },
//   { titulo: 'Administración', mail: 'administracion@harassantamaria.com.ar', tel: '0348-4268016' },
//   { titulo: 'Arquitectura', mail: 'arquitectura@harassantamaria.com.ar', tel: '0348-4268019' },
//   { titulo: 'Guardia emergencias', tel: '0348-4268006' },
//   { titulo: 'Guardia portería', tel: '0348-4494363 / 0348-4494366' },
//   { titulo: 'Family', tel: '0348-4494365' }
// ];

const contactos = [
  { titulo: 'Intendencia', mail: 'tomas.bastiani@hotmail.com', tel: '0348-4494369' },
  { titulo: 'Administración', mail: 'tomas.bastiani@hotmail.com', tel: '0348-4268016' },
  { titulo: 'Arquitectura', mail: 'tomas.bastiani@hotmail.com', tel: '0348-4268019' },
  { titulo: 'Guardia emergencias', tel: '0348-4268006' },
  { titulo: 'Guardia portería', tel: '0348-4494363 / 0348-4494366' },
  { titulo: 'Family', tel: '0348-4494365' }
];

// const servicios = [
//   { titulo: 'Family Service Center', tel: '0348-4494365', mail: 'Family@harassantamaria.com.ar' },
//   { titulo: 'Exactio', tel: '0348-4494397', ws: '1161340233', mail: '' },
//   { titulo: 'Actividades deportivas para niños - Cristian Lobosco', tel: '01115628857144' }
// ];

const servicios = [
  { titulo: 'Family Service Center', tel: '0348-4494365', mail: 'tomas.bastiani@hotmail.com' },
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
  color: #ff8328;
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

.email-button {
  margin-top: 0.8rem;
}

.email-button {
  margin-top: 0.8rem;
  font-size: 0.9rem;
  font-weight: 500;
  text-transform: none;
}

.success-message {
  color: green;
  margin-top: 10px;
  font-weight: bold;
}

.error-message {
  color: red;
  margin-top: 10px;
  font-weight: bold;
}


@media (max-width: 480px) {

  .contact-card{
    color: #111 !important;             /* color del texto */
    caret-color: #111;
  }
  
  span{
    color: #111 !important;             /* color del texto */
    background-color: #ffffff;          /* fondo blanco */
    caret-color: #111;  
  }

  .custom-tabs{
    color: #111 !important;             /* color del texto */
    background-color: #ffffff;          /* fondo blanco */
    caret-color: #111;  
  }

}

</style>
