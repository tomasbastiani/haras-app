<template>
  <div class="listado-container">
    <!-- Header -->
    <div class="header">
      <button class="back-button" @click="goBack">←</button>
      <h2>Enviar correo personalizado</h2>
    </div>

    <!-- Spinner general mientras envía -->
    <div class="spinner-mounted-container" v-if="isSending">
      <span class="spinner-mounted"></span>
    </div>

    <!-- Mensajes globales -->
    <div v-if="successMessage" class="alert alert-success">
      {{ successMessage }}
    </div>
    <div v-if="errorMessage" class="alert alert-error">
      {{ errorMessage }}
    </div>

    <!-- Contenido principal -->
    <div class="mail-container">
      <!-- Sección 1: emails por chips (Opción A) -->
      <section class="card-section">
        <h3>Destinatarios (uno por uno)</h3>
        <p class="help-text">
          Escribí un email y presioná <strong>Enter</strong> o <strong>,</strong> para agregarlo a la lista.
        </p>

        <div class="chip-input-wrapper">
          <div class="chips-container">
            <span
              v-for="(email, index) in emails"
              :key="email + index"
              class="chip"
            >
              {{ email }}
              <button type="button" class="chip-remove" @click="removeEmail(index)">×</button>
            </span>
          </div>

          <input
            v-model="emailInput"
            type="text"
            class="chip-input"
            placeholder="Ingresá un email y presioná Enter"
            @keydown.enter.prevent="addEmailFromInput"
            @keydown.space.exact.prevent
            @keydown.tab.exact.prevent="addEmailFromInput"
            @blur="addEmailFromInput"
          />
        </div>

        <div class="actions-inline">
          <button class="btn-secondary" type="button" @click="clearEmails">
            Limpiar lista
          </button>
          <span class="small-info">
            Destinatarios actuales: <strong>{{ emails.length }}</strong>
          </span>
        </div>
      </section>

      <!-- Sección 2: carga masiva (Opción B) -->
      <section class="card-section">
        <h3>Carga masiva de emails</h3>
        <p class="help-text">
          Podés pegar una lista de emails separados por coma, punto y coma, espacio o salto de línea
          (por ejemplo, exportados de Excel).
        </p>

        <textarea
          v-model="bulkEmailsText"
          class="textarea-bulk"
          rows="6"
          placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
        ></textarea>

        <div class="actions-inline">
          <button class="btn-primary" type="button" @click="processBulkEmails">
            Procesar lista y agregar
          </button>
          <span class="small-info" v-if="lastBulkResult">
            Agregados: <strong>{{ lastBulkResult.added }}</strong> |
            Duplicados ignorados: <strong>{{ lastBulkResult.duplicates }}</strong> |
            Inválidos: <strong>{{ lastBulkResult.invalid }}</strong>
          </span>
        </div>

        <div v-if="invalidEmails.length" class="invalid-list">
          <span class="invalid-title">Emails inválidos detectados:</span>
          <span class="invalid-item" v-for="email in invalidEmails" :key="email">
            {{ email }}
          </span>
        </div>
      </section>

      <!-- Sección 3: contenido del correo -->
      <section class="card-section">
        <h3>Contenido del correo</h3>

        <div class="form-group">
          <label>Asunto</label>
          <input
            v-model="subject"
            type="text"
            class="text-input"
            placeholder="Asunto del correo"
          />
        </div>

        <div class="form-group">
          <label>Cuerpo del mensaje</label>
          <textarea
            v-model="body"
            class="textarea-body"
            rows="8"
            placeholder="Escribí el contenido del correo. Podés usar {nombre}, {lote}, {lotemoroso} y {detalleDeudaxLote} como variables."
          ></textarea>
          <p class="help-text">
            Variables disponibles:
            <strong>{nombre}</strong>,
            <strong>{lote}</strong>,
            <strong>{lotemoroso}</strong>,
            <strong>{detalleDeudaxLote}</strong>
        </p>
        </div>

        <div class="summary">
          <div>
            <strong>Destinatarios válidos:</strong> {{ emails.length }}
          </div>
        </div>

        <div class="send-actions">
          <button
            type="button"
            class="btn-success"
            :disabled="isSending || !canSend"
            @click="handleSend"
          >
            <span v-if="isSending" class="spinner"></span>
            <span v-else>Enviar correo</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/axios';

const router = useRouter();
const goBack = () => router.push('/menu');

// Estado principal
const emails = ref([]); // lista final de destinatarios
const emailInput = ref(''); // input individual (chips)
const bulkEmailsText = ref(''); // textarea para carga masiva

const subject = ref('');
const body = ref('');

const isSending = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

const invalidEmails = ref([]);
const lastBulkResult = ref(null);

// Validación simple de email
const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const canSend = computed(() => {
  return emails.value.length > 0 && subject.value.trim() !== '' && body.value.trim() !== '';
});

// Helpers
const normalizeEmail = (email) => email.trim().toLowerCase();

const addEmail = (rawEmail) => {
  const normalized = normalizeEmail(rawEmail);
  if (!normalized) return false;
  if (!emailRegex.test(normalized)) {
    if (!invalidEmails.value.includes(normalized)) {
      invalidEmails.value.push(normalized);
    }
    return false;
  }
  if (!emails.value.includes(normalized)) {
    emails.value.push(normalized);
    return true;
  }
  return 'duplicate';
};

const addEmailFromInput = () => {
  if (!emailInput.value) return;

  // permitir que el admin pegue "mail1, mail2"
  const potential = emailInput.value.split(/[\s,;]+/);
  let added = 0;
  potential.forEach((e) => {
    const res = addEmail(e);
    if (res === true) added++;
  });

  emailInput.value = '';
  return added;
};

const removeEmail = (index) => {
  emails.value.splice(index, 1);
};

const clearEmails = () => {
  emails.value = [];
  invalidEmails.value = [];
  lastBulkResult.value = null;
};

// Procesar textarea masivo
const processBulkEmails = () => {
  invalidEmails.value = [];
  let added = 0;
  let duplicates = 0;
  let invalid = 0;

  const raw = bulkEmailsText.value || '';
  const parts = raw.split(/[\s,;]+/).filter(Boolean);

  parts.forEach((p) => {
    const res = addEmail(p);
    if (res === true) added++;
    else if (res === 'duplicate') duplicates++;
    else if (res === false) invalid++;
  });

  lastBulkResult.value = {
    added,
    duplicates,
    invalid,
  };

  // opcional: limpiar textarea después
  // bulkEmailsText.value = '';
};

// Enviar al backend
const handleSend = async () => {
  if (!canSend.value) {
    errorMessage.value = 'Completá al menos un destinatario, asunto y cuerpo del mensaje.';
    successMessage.value = '';
    return;
  }

  isSending.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    await axios.post('/admin/enviar-mail-personalizado', {
      emails: emails.value,
      subject: subject.value,
      body: body.value,
    });

    successMessage.value = `Correo enviado con éxito a ${emails.value.length} destinatario(s).`;
    errorMessage.value = '';
  } catch (error) {
    console.error('Error al enviar correo personalizado:', error);
    errorMessage.value = 'Ocurrió un error al enviar el correo. Intente nuevamente.';
    successMessage.value = '';
  } finally {
    isSending.value = false;
  }
};
</script>

<style scoped>
.listado-container {
  width: 70%;
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

.back-button {
  font-size: 22px;
  background: none;
  border: none;
  color: #333;
  cursor: pointer;
  margin-right: 10px;
  transition: color 0.2s;
}

.back-button:hover {
  color: #007bff;
}

h2 {
  font-size: 24px;
  margin: 0;
}

/* Alertas */
.alert {
  padding: 10px 14px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-size: 14px;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
}

.alert-error {
  background-color: #f8d7da;
  color: #721c24;
}

.mail-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Card sección */
.card-section {
  border: 1px solid #e2e2e2;
  border-radius: 8px;
  padding: 16px 18px;
}

.card-section h3 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 18px;
}

.help-text {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #555;
}

/* Chips */
.chip-input-wrapper {
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  background-color: #f1f1f1;
  border-radius: 999px;
  font-size: 12px;
}

.chip-remove {
  margin-left: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}

.chip-input {
  flex: 1;
  min-width: 160px;
  border: none;
  outline: none;
  font-size: 14px;
  padding: 4px;
}

/* Textarea y inputs */
.textarea-bulk,
.textarea-body,
.text-input {
  width: 100%;
  border-radius: 6px;
  border: 1px solid #ccc;
  padding: 8px;
  font-size: 14px;
  resize: vertical;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  font-weight: bold;
  margin-bottom: 6px;
  display: block;
}

/* Botones */
.actions-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  gap: 12px;
}

.small-info {
  font-size: 13px;
  color: #555;
}

.btn-primary,
.btn-secondary,
.btn-success {
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
}

.btn-primary {
  background-color: #ffd100;
  color: #111;
}

.btn-primary:hover {
  background-color: #e0b800;
}

.btn-secondary {
  background-color: #6c757d;
  color: #fff;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:disabled {
  background-color: #dee4e9;
  color: #6c757d;
  cursor: not-allowed;
}

.btn-success:not(:disabled):hover {
  background-color: #218838;
}

/* Invalid emails */
.invalid-list {
  margin-top: 10px;
  font-size: 12px;
}

.invalid-title {
  display: block;
  font-weight: bold;
  margin-bottom: 4px;
}

.invalid-item {
  display: inline-block;
  margin-right: 6px;
  margin-bottom: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f8d7da;
  color: #721c24;
}

/* Summary */
.summary {
  margin-top: 10px;
  font-size: 14px;
}

.send-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* Spinners (reutilizados) */
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

.spinner-mounted {
  border: 3px solid #fff;
  border-top: 3px solid #2c3e50;
  border-radius: 50%;
  width: 55px;
  height: 55px;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  vertical-align: middle;
}

.spinner-mounted-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .listado-container {
    width: 95%;
    margin: 2rem auto;
    padding: 1.4rem;
  }

  .actions-inline {
    flex-direction: column;
    align-items: flex-start;
  }

  .send-actions {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .header h2 {
    font-size: 16px;
  }

  h2 {
    color: #111 !important;
    background-color: #ffffff;
    caret-color: #111;
  }
}
</style>
