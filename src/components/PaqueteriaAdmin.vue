<template>
  <div class="paq-admin">
    <div class="header">
      <button class="back-button" @click="goBack">←</button>
      <h2>Oficina de Paquetería</h2>
    </div>

    <div v-if="sinAcceso" class="empty-state">
      No tenés acceso a la paquetería. Pedile a la administración que te habilite
      como operario.
    </div>

    <template v-else>
      <div class="tabs">
        <button :class="['tab', { activo: tab === 'recibir' }]" @click="tab = 'recibir'">
          Recibir paquete
        </button>
        <button :class="['tab', { activo: tab === 'bandeja' }]" @click="tab = 'bandeja'">
          Bandeja
          <span v-if="pendientes" class="tab-badge">{{ pendientes }}</span>
        </button>
      </div>

      <!-- ============ ALTA ============ -->
      <form v-if="tab === 'recibir'" class="form-card" @submit.prevent="registrar">
        <div class="grid">
          <div class="campo">
            <label>Lote *</label>
            <input v-model="alta.nlote" type="text" required placeholder="Ej: 45" />
          </div>
          <div class="campo">
            <label>Correo *</label>
            <select v-model="alta.correo" required>
              <option v-for="(t, k) in CORREOS" :key="k" :value="k">{{ t }}</option>
            </select>
          </div>
          <div class="campo">
            <label>Tipo *</label>
            <select v-model="alta.tipo" required>
              <option v-for="(t, k) in TIPOS" :key="k" :value="k">{{ t }}</option>
            </select>
          </div>
          <div class="campo">
            <label>Destinatario (según etiqueta)</label>
            <input v-model="alta.destinatario" type="text" />
          </div>
          <div class="campo">
            <label>ID del correo</label>
            <input v-model="alta.tracking" type="text" placeholder="Nº de seguimiento del correo" />
          </div>
        </div>

        <!-- Foto del paquete. Es la prueba de en qué estado llegó: si después
             aparece abierto o dañado, la discusión se resuelve mirando esto. -->
        <FotoCaptura v-model="fotoAlta" label="Foto del paquete" />

        <div class="campo">
          <label>Observaciones</label>
          <textarea v-model="alta.observaciones" rows="2"></textarea>
        </div>

        <button class="btn-principal" type="submit" :disabled="guardando">
          {{ guardando ? 'Registrando…' : 'Registrar y avisar al propietario' }}
        </button>

        <p v-if="altaResultado" :class="altaResultado.sin_propietario ? 'aviso' : 'ok'">
          {{ altaResultado.message }}
          <span v-if="altaResultado.sin_propietario">
            El paquete quedó cargado como <strong>{{ altaResultado.paquete.codigo }}</strong>,
            pero sólo se va a poder entregar por método manual.
          </span>
          <span v-else>
            Código del paquete: <strong>{{ altaResultado.paquete.codigo }}</strong> —
            escribilo en la etiqueta.
          </span>
        </p>
      </form>

      <!-- ============ BANDEJA ============ -->
      <div v-else>
        <div class="filtros">
          <input v-model="filtroTexto" type="text" placeholder="Código, nombre, ID del correo o lote" @keyup.enter="cargar" />
          <select v-model="filtroEstado" @change="cargar">
            <option value="recibido">Para retirar</option>
            <option value="retirado">Retirados</option>
            <option value="devuelto">Devueltos</option>
            <option value="">Todos</option>
          </select>
          <label class="check">
            <input v-model="soloSinPropietario" type="checkbox" @change="cargar" />
            Sin propietario vinculado
          </label>
          <button class="btn-secundario" @click="cargar">Buscar</button>
        </div>

        <div class="spinner-mounted-container" v-if="isLoading">
          <span class="spinner-mounted"></span>
        </div>

        <div v-else-if="paquetes.length === 0" class="empty-state">
          No hay paquetes para este filtro.
        </div>

        <div v-else class="tabla-wrap">
          <table class="tabla">
            <thead>
              <tr>
                <th>Código</th>
                <th>Lote</th>
                <th>Propietario</th>
                <th>Correo</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <!-- La fila entera abre el detalle. El resto de los datos (tipo,
                   ID del correo, fechas, fotos, firma y seguimiento) viven ahí:
                   en la tabla sólo queda lo que sirve para encontrar el paquete. -->
              <tr
                v-for="p in paquetes"
                :key="p.id"
                class="fila-clickeable"
                @click="abrirDetalle(p)"
              >
                <td class="mono col-codigo">{{ p.codigo }}</td>
                <td data-label="Lote">{{ p.nlote }}</td>
                <td data-label="Propietario">
                  <span v-if="p.user">{{ p.user.nombre || p.user.email }}</span>
                  <span v-else class="sin-prop" :title="p.email_destino || 'Sin email en gastos comunes'">
                    ⚠ sin vincular
                  </span>
                </td>
                <td data-label="Correo">{{ CORREOS[p.correo] || p.correo }}</td>
                <td class="col-estado">
                  <span :class="['estado-badge', p.estado]">{{ ESTADOS[p.estado] }}</span>
                  <span v-if="p.entrega" :class="['solidez', solidez(p.entrega)]">
                    {{ solidezLabel(p.entrega) }}
                  </span>
                </td>
                <!-- .stop en cada acción: si no, tocar un botón abriría además
                     el detalle. -->
                <td class="acciones">
                  <template v-if="p.estado === 'recibido'">
                    <button class="link" @click.stop="abrirEntrega(p)">Entregar</button>
                    <button class="link gris" @click.stop="abrirDevolucion(p)">Devolver</button>
                  </template>
                  <button class="link gris" @click.stop="abrirObservacion(p)">Observar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <p v-if="mensajeError" class="error-message">{{ mensajeError }}</p>

    <!-- ============ MODAL ENTREGA ============ -->
    <v-dialog v-model="showEntrega" max-width="560px" persistent>
      <v-card v-if="paqueteAEntregar">
        <v-card-title class="text-h6">
          Entregar {{ paqueteAEntregar.codigo }} · Lote {{ paqueteAEntregar.nlote }}
        </v-card-title>

        <v-card-text>
          <div class="metodo-tabs">
            <button
              :class="['metodo', { activo: entrega.metodo === 'pin' }]"
              :disabled="pinBloqueado"
              @click="entrega.metodo = 'pin'"
            >
              Con PIN
            </button>
            <button :class="['metodo', { activo: entrega.metodo === 'manual' }]" @click="entrega.metodo = 'manual'">
              Manual
            </button>
          </div>

          <div v-if="entrega.metodo === 'pin'" class="campo">
            <label>PIN que dicta quien retira *</label>
            <input
              v-model="entrega.pin"
              :class="['pin-input', { invalido: errores.pin }]"
              type="text"
              inputmode="numeric"
              maxlength="6"
              placeholder="······"
            />
            <p v-if="errores.pin" class="campo-error">{{ errores.pin }}</p>
          </div>

          <div v-else class="campo">
            <label>Motivo de la entrega sin PIN *</label>
            <textarea
              v-model="entrega.motivo_manual"
              :class="{ invalido: errores.motivo_manual }"
              rows="2"
              placeholder="Ej: el propietario no tiene el celular a mano"
            ></textarea>
            <p v-if="errores.motivo_manual" class="campo-error">{{ errores.motivo_manual }}</p>
            <p class="aviso-manual">
              La entrega manual queda registrada como evidencia más débil y se
              revisa en los reportes.
            </p>
          </div>

          <div class="campo">
            <label>Quién retira *</label>
            <select v-model="entrega.retirado_por">
              <option value="titular">El titular</option>
              <option value="autorizado">Una persona autorizada</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div class="grid-2">
            <div class="campo">
              <label>Nombre y apellido *</label>
              <input v-model="entrega.nombre" :class="{ invalido: errores.nombre }" type="text" />
              <p v-if="errores.nombre" class="campo-error">{{ errores.nombre }}</p>
            </div>
            <div class="campo">
              <label>DNI</label>
              <input v-model="entrega.dni" type="text" inputmode="numeric" />
            </div>
          </div>

          <div class="campo">
            <label>Firma de quien retira *</label>
            <canvas
              ref="canvasFirma"
              :class="['canvas-firma', { invalido: errores.firma }]"
              @pointerdown="empezarTrazo"
              @pointermove="dibujar"
              @pointerup="terminarTrazo"
              @pointerleave="terminarTrazo"
            ></canvas>
            <button class="link" type="button" @click="limpiarFirma">Borrar firma</button>
            <p v-if="errores.firma" class="campo-error">{{ errores.firma }}</p>
          </div>

          <!-- Foto del momento de la entrega. Va al acta junto con la firma:
               deja constancia de quién se llevó qué y en qué estado. -->
          <FotoCaptura
            v-model="fotoEntrega"
            label="Foto de la entrega *"
            :error="errores.foto"
          />

          <!-- Errores que no son de un campo puntual (el paquete ya estaba
               entregado, se cayó la red). Van acá adentro y no en la pantalla
               de atrás, que el modal tapa. -->
          <p v-if="errores.general" class="error-modal">{{ errores.general }}</p>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text @click="cerrarEntrega" :disabled="entregando">Cancelar</v-btn>
          <v-btn color="green-darken-2" :loading="entregando" @click="confirmarEntrega">
            Confirmar entrega
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ============ MODAL OBSERVACIÓN ============ -->
    <v-dialog v-model="showObservacion" max-width="520px">
      <v-card v-if="paqueteAObservar">
        <v-card-title class="text-h6">
          Observaciones de {{ paqueteAObservar.codigo }}
        </v-card-title>

        <v-card-text>
          <p class="ayuda-obs">
            Se suma al seguimiento del paquete y <strong>el propietario la va a ver</strong>.
            Queda sellada en la bitácora: no se puede editar ni borrar después.
          </p>

          <!-- Las anteriores, para no repetir lo ya anotado. -->
          <div v-if="cargandoObs" class="obs-cargando">Cargando observaciones…</div>
          <div v-else-if="observaciones.length" class="obs-lista">
            <div v-for="o in observaciones" :key="o.id" class="obs-item">
              <p class="obs-texto">{{ o.nota }}</p>
              <p class="obs-meta">
                {{ formatearFecha(o.created_at) }}
                <span v-if="o.por"> · {{ o.por }}</span>
              </p>
            </div>
          </div>
          <p v-else class="obs-vacio">Todavía no hay observaciones en este paquete.</p>

          <v-textarea
            v-model="notaObservacion"
            label="Nueva observación *"
            rows="3"
            maxlength="500"
            counter="500"
          />

          <p v-if="errorObservacion" class="foto-error">{{ errorObservacion }}</p>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn text :disabled="guardandoObs" @click="showObservacion = false">Cerrar</v-btn>
          <v-btn
            color="green-darken-2"
            :loading="guardandoObs"
            :disabled="!notaObservacion.trim()"
            @click="guardarObservacion"
          >
            Agregar al seguimiento
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ============ MODAL DETALLE ============ -->
    <v-dialog v-model="showDetalle" max-width="720px" scrollable>
      <v-card v-if="detalle">
        <v-card-title class="detalle-titulo">
          <span class="mono">{{ detalle.codigo }}</span>
          <span :class="['estado-badge', detalle.estado]">{{ ESTADOS[detalle.estado] }}</span>
          <span v-if="detalle.entrega" :class="['solidez', solidez(detalle.entrega)]">
            {{ solidezLabel(detalle.entrega) }}
          </span>
        </v-card-title>

        <v-card-text class="detalle-body">
          <div v-if="cargandoDetalle" class="spinner-mounted-container">
            <span class="spinner-mounted"></span>
          </div>

          <template v-else>
            <!-- ---- Datos del paquete ---- -->
            <p class="detalle-seccion">Paquete</p>
            <dl class="detalle-datos">
              <div><dt>Lote</dt><dd>{{ detalle.nlote }}</dd></div>
              <div>
                <dt>Propietario</dt>
                <dd>
                  <span v-if="detalle.user">{{ detalle.user.nombre || detalle.user.email }}</span>
                  <span v-else class="sin-prop">⚠ sin vincular</span>
                </dd>
              </div>
              <div v-if="detalle.email_destino">
                <dt>Email</dt><dd class="quiebre">{{ detalle.email_destino }}</dd>
              </div>
              <div v-if="detalle.destinatario">
                <dt>Destinatario</dt><dd>{{ detalle.destinatario }}</dd>
              </div>
              <div><dt>Correo</dt><dd>{{ CORREOS[detalle.correo] || detalle.correo }}</dd></div>
              <div><dt>Tipo</dt><dd>{{ TIPOS[detalle.tipo] || detalle.tipo }}</dd></div>
              <div><dt>ID del correo</dt><dd class="quiebre">{{ detalle.tracking || '—' }}</dd></div>
              <div><dt>Ubicación</dt><dd>{{ detalle.ubicacion || '—' }}</dd></div>
              <div><dt>Ingreso</dt><dd>{{ formatearFecha(detalle.recibido_at) }}</dd></div>
              <div v-if="detalle.notificado_at">
                <dt>Aviso enviado</dt><dd>{{ formatearFecha(detalle.notificado_at) }}</dd>
              </div>
              <div v-if="detalle.recordatorio_at">
                <dt>Recordatorio</dt><dd>{{ formatearFecha(detalle.recordatorio_at) }}</dd>
              </div>
              <div v-if="detalle.retirado_at">
                <dt>Retirado</dt><dd>{{ formatearFecha(detalle.retirado_at) }}</dd>
              </div>
            </dl>

            <div v-if="detalle.observaciones" class="detalle-obs-alta">
              <span class="detalle-obs-label">Observaciones del ingreso</span>
              {{ detalle.observaciones }}
            </div>

            <!-- ---- Acta de entrega ---- -->
            <template v-if="detalle.entrega">
              <p class="detalle-seccion">Acta de entrega</p>
              <dl class="detalle-datos">
                <div><dt>Folio</dt><dd class="mono">{{ detalle.entrega.folio }}</dd></div>
                <div><dt>Método</dt><dd>{{ detalle.entrega.metodo === 'pin' ? 'Con PIN' : 'Manual' }}</dd></div>
                <div v-if="detalle.entrega.motivo_manual">
                  <dt>Motivo del manual</dt><dd>{{ detalle.entrega.motivo_manual }}</dd>
                </div>
                <div><dt>Quién retiró</dt><dd>{{ RETIRADO_POR[detalle.entrega.retirado_por] }}</dd></div>
                <div><dt>Nombre</dt><dd>{{ detalle.entrega.nombre }}</dd></div>
                <div v-if="detalle.entrega.dni"><dt>DNI</dt><dd>{{ detalle.entrega.dni }}</dd></div>
                <div><dt>Fecha</dt><dd>{{ formatearFecha(detalle.entrega.entregado_at) }}</dd></div>
                <div>
                  <dt>Acuse del titular</dt>
                  <dd>
                    {{ ACKS[detalle.entrega.ack_estado] || detalle.entrega.ack_estado }}
                    <span v-if="detalle.entrega.ack_at"> · {{ formatearFecha(detalle.entrega.ack_at) }}</span>
                  </dd>
                </div>
              </dl>
            </template>

            <!-- ---- Constancias: fotos y firma ---- -->
            <template v-if="tieneImagenes">
              <p class="detalle-seccion">Constancias</p>
              <div class="detalle-imagenes">
                <figure v-if="imgIngreso">
                  <img :src="imgIngreso" alt="Foto del ingreso" @click="ampliar(imgIngreso, 'Foto del ingreso')" />
                  <figcaption>Foto del ingreso</figcaption>
                </figure>
                <figure v-if="imgEntrega">
                  <img :src="imgEntrega" alt="Foto de la entrega" @click="ampliar(imgEntrega, 'Foto de la entrega')" />
                  <figcaption>Foto de la entrega</figcaption>
                </figure>
                <figure v-if="imgFirma" class="figura-firma">
                  <img :src="imgFirma" alt="Firma de quien retiró" @click="ampliar(imgFirma, 'Firma de quien retiró')" />
                  <figcaption>Firma de {{ detalle.entrega?.nombre }}</figcaption>
                </figure>
              </div>
              <p class="detalle-nota-img">Tocá una imagen para verla en grande.</p>
            </template>

            <!-- ---- Seguimiento, el mismo que ve el propietario ---- -->
            <p class="detalle-seccion">Seguimiento</p>
            <div class="timeline">
              <div v-for="e in eventosDetalle" :key="e.id" class="evento">
                <span class="punto"></span>
                <div class="evento-cuerpo">
                  <p class="evento-tipo">{{ EVENTOS[e.tipo] || e.tipo }}</p>
                  <p v-if="e.nota" class="evento-nota">{{ e.nota }}</p>
                  <p class="evento-fecha">
                    {{ formatearFecha(e.created_at) }}
                    <span v-if="e.por"> · {{ e.por }}</span>
                  </p>
                </div>
              </div>
            </div>
          </template>
        </v-card-text>

        <v-card-actions class="detalle-acciones">
          <template v-if="detalle.estado === 'recibido'">
            <button class="link" @click="desdeDetalle(abrirEntrega)">Entregar</button>
            <button class="link gris" @click="desdeDetalle(abrirDevolucion)">Devolver</button>
          </template>
          <button class="link gris" @click="desdeDetalle(abrirObservacion)">Observar</button>
          <v-spacer />
          <v-btn text @click="cerrarDetalle">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ============ IMAGEN AMPLIADA ============ -->
    <v-dialog v-model="showImagen" max-width="900px">
      <v-card>
        <v-card-title class="text-h6">{{ imagenAmpliada.titulo }}</v-card-title>
        <v-card-text>
          <img :src="imagenAmpliada.url" :alt="imagenAmpliada.titulo" class="imagen-grande" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showImagen = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ============ MODAL DEVOLUCIÓN ============ -->
    <v-dialog v-model="showDevolucion" max-width="440px">
      <v-card v-if="paqueteADevolver">
        <v-card-title class="text-h6">Devolver {{ paqueteADevolver.codigo }}</v-card-title>
        <v-card-text>
          <p>El paquete se lo lleva el correo. Queda asentado en el seguimiento.</p>
          <v-textarea
            v-model="motivoDevolucion"
            label="Motivo *"
            rows="2"
            maxlength="300"
            counter="300"
            :error-messages="errorDevolucion"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showDevolucion = false" :disabled="devolviendo">Cancelar</v-btn>
          <v-btn color="deep-orange" :loading="devolviendo" @click="confirmarDevolucion">
            Registrar devolución
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from '@/axios';
import FotoCaptura from '@/components/FotoCaptura.vue';

const router = useRouter();
const goBack = () => router.push('/menu');

const CORREOS = {
  mercadolibre: 'Mercado Libre',
  andreani: 'Andreani',
  oca: 'OCA',
  correo_argentino: 'Correo Argentino',
  urbano: 'Urbano',
  otro: 'Otro',
};

const TIPOS = {
  sobre: 'Sobre',
  caja_chica: 'Caja chica',
  caja_grande: 'Caja grande',
  bulto: 'Bulto',
};

const RETIRADO_POR = {
  titular: 'El titular',
  autorizado: 'Persona autorizada',
  otro: 'Otro',
};

const ACKS = {
  pendiente: 'Pendiente de respuesta',
  confirmado: '✓ Confirmado por el titular',
  desconocido: '⚠ El titular desconoce la entrega',
  tacito: 'Cerrado sin respuesta (tácito)',
};

// Mismo timeline que ve el propietario, pero redactado en tercera persona: acá
// lo lee la oficina, no el vecino.
const EVENTOS = {
  ingreso: 'Ingresó a paquetería',
  notificado: 'Se avisó al propietario',
  recordatorio: 'Se envió un recordatorio',
  entregado: 'Entregado',
  ack_confirmado: 'El propietario confirmó la recepción',
  ack_desconocido: 'El propietario desconoció la entrega',
  ack_tacito: 'Cerrado sin respuesta',
  pin_fallido: 'Intento de PIN incorrecto',
  observacion: 'Observación de la oficina',
  devuelto: 'Devuelto al correo',
  vencido: 'Vencido por falta de retiro',
};

const ESTADOS = {
  recibido: 'Para retirar',
  retirado: 'Retirado',
  devuelto: 'Devuelto',
  vencido: 'Vencido',
};

const tab = ref('recibir');
const sinAcceso = ref(false);
const isLoading = ref(false);
const mensajeError = ref('');

// ---------- Alta ----------
const altaVacia = () => ({
  nlote: '',
  destinatario: '',
  correo: 'mercadolibre',
  tracking: '',
  tipo: 'caja_chica',
  // Ya no se pide en pantalla: todos los paquetes se guardan en el mismo lugar.
  // Se sigue mandando para no dejar el campo vacío en los registros nuevos ni
  // romper la vista del vecino, que muestra dónde está el paquete.
  ubicacion: 'Paquetería',
  observaciones: '',
});
const alta = reactive(altaVacia());
const guardando = ref(false);
const altaResultado = ref(null);

async function registrar() {
  guardando.value = true;
  mensajeError.value = '';
  altaResultado.value = null;
  try {
    const { data } = await axios.post('/paquetes', {
      ...alta,
      foto: fotoAlta.value || null,
    });
    altaResultado.value = data;
    Object.assign(alta, altaVacia());
    fotoAlta.value = '';
  } catch (e) {
    mensajeError.value = e.response?.data?.message || 'No pudimos registrar el paquete.';
  } finally {
    guardando.value = false;
  }
}

// ---------- Fotos ----------
// La captura, la compresión y el EXIF los resuelve FotoCaptura; acá sólo
// viven los data URL que se mandan al backend.
const fotoAlta = ref('');
const fotoEntrega = ref('');

// ---------- Observaciones ----------
// Alimentan el mismo timeline sellado que ve el propietario, así que se traen
// del detalle del paquete en vez de guardarse aparte.
const showObservacion = ref(false);
const paqueteAObservar = ref(null);
const observaciones = ref([]);
const cargandoObs = ref(false);
const guardandoObs = ref(false);
const notaObservacion = ref('');
const errorObservacion = ref('');

async function abrirObservacion(paquete) {
  paqueteAObservar.value = paquete;
  observaciones.value = [];
  notaObservacion.value = '';
  errorObservacion.value = '';
  showObservacion.value = true;

  cargandoObs.value = true;
  try {
    const { data } = await axios.get(`/paquetes/${paquete.id}`);
    observaciones.value = data.eventos.filter((e) => e.tipo === 'observacion');
  } catch (e) {
    errorObservacion.value = 'No pudimos cargar las observaciones anteriores.';
  } finally {
    cargandoObs.value = false;
  }
}

async function guardarObservacion() {
  const nota = notaObservacion.value.trim();
  if (!nota) return;

  guardandoObs.value = true;
  errorObservacion.value = '';
  try {
    const { data } = await axios.post(
      `/paquetes/${paqueteAObservar.value.id}/observacion`,
      { nota }
    );
    observaciones.value.push(data.evento);
    notaObservacion.value = '';
  } catch (e) {
    errorObservacion.value =
      e.response?.data?.errors?.nota?.[0] ||
      e.response?.data?.message ||
      'No pudimos guardar la observación.';
  } finally {
    guardandoObs.value = false;
  }
}

// ---------- Detalle del paquete ----------
// La tabla quedó con lo mínimo para encontrar el paquete; todo lo demás se
// pide acá al abrir la fila. Es un request por apertura y no 200 al cargar la
// bandeja, que es lo que costaría tener las imágenes en la tabla.
const showDetalle = ref(false);
const detalle = ref(null);
const eventosDetalle = ref([]);
const cargandoDetalle = ref(false);

// Las imágenes van por endpoint autenticado, así que no se pueden poner en un
// <img src>: se piden con el token y se arma un object URL.
const imgIngreso = ref('');
const imgEntrega = ref('');
const imgFirma = ref('');

const tieneImagenes = computed(() => !!(imgIngreso.value || imgEntrega.value || imgFirma.value));

async function abrirDetalle(paquete) {
  // Se muestra lo que ya tenemos de la fila para que el modal abra al instante,
  // y se completa cuando responde el detalle.
  detalle.value = paquete;
  eventosDetalle.value = [];
  liberarImagenes();
  showDetalle.value = true;
  cargandoDetalle.value = true;

  try {
    const { data } = await axios.get(`/paquetes/${paquete.id}`);
    detalle.value = data.paquete;
    eventosDetalle.value = data.eventos;
    await cargarImagenes(data.paquete);
  } catch (e) {
    mensajeError.value = e.response?.data?.message || 'No pudimos abrir el detalle del paquete.';
    showDetalle.value = false;
  } finally {
    cargandoDetalle.value = false;
  }
}

/**
 * Trae sólo las que existen: pedir una que no está devuelve 404 y ensuciaría
 * la consola en cada apertura.
 */
async function cargarImagenes(paquete) {
  const pedidos = [];

  if (paquete.foto_path) {
    pedidos.push(descargar(`/paquetes/${paquete.id}/foto`).then((u) => (imgIngreso.value = u)));
  }
  if (paquete.entrega?.tiene_foto) {
    pedidos.push(descargar(`/paquetes/${paquete.id}/entrega-foto`).then((u) => (imgEntrega.value = u)));
  }
  if (paquete.entrega?.tiene_firma) {
    pedidos.push(descargar(`/paquetes/${paquete.id}/firma`).then((u) => (imgFirma.value = u)));
  }

  await Promise.all(pedidos);
}

async function descargar(ruta) {
  try {
    const { data } = await axios.get(ruta, { responseType: 'blob' });
    return URL.createObjectURL(data);
  } catch (e) {
    return '';
  }
}

function liberarImagenes() {
  [imgIngreso, imgEntrega, imgFirma].forEach((img) => {
    if (img.value) URL.revokeObjectURL(img.value);
    img.value = '';
  });
}

function cerrarDetalle() {
  showDetalle.value = false;
  liberarImagenes();
  detalle.value = null;
  eventosDetalle.value = [];
}

/** Encadena una acción de la bandeja desde el detalle, cerrándolo primero. */
function desdeDetalle(accion) {
  const paquete = detalle.value;
  cerrarDetalle();
  accion(paquete);
}

// ---------- Imagen ampliada ----------
// No revoca el object URL: la imagen sigue siendo del detalle, que es quien lo
// creó y quien lo va a liberar al cerrarse.
const showImagen = ref(false);
const imagenAmpliada = ref({ url: '', titulo: '' });

function ampliar(url, titulo) {
  imagenAmpliada.value = { url, titulo };
  showImagen.value = true;
}

// ---------- Bandeja ----------// ---------- Bandeja ----------
const paquetes = ref([]);
const filtroTexto = ref('');
const filtroEstado = ref('recibido');
const soloSinPropietario = ref(false);

const pendientes = computed(() => paquetes.value.filter((p) => p.estado === 'recibido').length);

async function cargar() {
  isLoading.value = true;
  mensajeError.value = '';
  try {
    const { data } = await axios.get('/paquetes', {
      params: {
        estado: filtroEstado.value || undefined,
        q: filtroTexto.value || undefined,
        sin_propietario: soloSinPropietario.value ? 1 : undefined,
      },
    });
    paquetes.value = data;
  } catch (e) {
    if (e.response?.status === 403) {
      sinAcceso.value = true;
    } else {
      mensajeError.value = 'No pudimos cargar la bandeja.';
    }
  } finally {
    isLoading.value = false;
  }
}

function solidez(entrega) {
  if (entrega.ack_estado === 'desconocido') return 'impugnada';
  if (entrega.metodo === 'pin' && entrega.ack_estado === 'confirmado') return 'alta';
  if (entrega.metodo === 'pin') return 'media';
  return 'baja';
}

const SOLIDEZ = {
  alta: 'PIN + acuse',
  media: 'PIN',
  baja: 'manual',
  impugnada: 'impugnada',
};
const solidezLabel = (e) => SOLIDEZ[solidez(e)];

function formatearFecha(valor) {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------- Entrega ----------
const showEntrega = ref(false);
const paqueteAEntregar = ref(null);
const entregando = ref(false);
const pinBloqueado = ref(false);
const entrega = reactive({
  metodo: 'pin',
  pin: '',
  motivo_manual: '',
  retirado_por: 'titular',
  nombre: '',
  dni: '',
});

// Un mensaje por campo. El error global de la pantalla no sirve acá: el modal
// lo tapa y el operario no llega a ver qué le falta.
const erroresVacios = () => ({
  pin: '',
  motivo_manual: '',
  nombre: '',
  firma: '',
  foto: '',
  general: '',
});
const errores = reactive(erroresVacios());

function limpiarErrores() {
  Object.assign(errores, erroresVacios());
}

function abrirEntrega(p) {
  paqueteAEntregar.value = p;
  fotoEntrega.value = '';
  limpiarErrores();
  pinBloqueado.value = !!p.pin_bloqueado_at;
  Object.assign(entrega, {
    metodo: pinBloqueado.value ? 'manual' : 'pin',
    pin: '',
    motivo_manual: pinBloqueado.value ? 'PIN bloqueado por intentos fallidos' : '',
    retirado_por: 'titular',
    nombre: '',
    dni: '',
  });
  showEntrega.value = true;
}

function cerrarEntrega() {
  showEntrega.value = false;
  paqueteAEntregar.value = null;
  fotoEntrega.value = '';
  limpiarErrores();
}

/**
 * Valida todo el formulario de una y devuelve si está en condiciones.
 *
 * Marca todos los campos que faltan, no sólo el primero: si faltan el nombre y
 * la foto, mostrarlos de a uno obliga a mandar dos veces para enterarse.
 */
function validarEntrega() {
  limpiarErrores();

  if (entrega.metodo === 'pin' && !entrega.pin.trim()) {
    errores.pin = 'Pedile el PIN a quien retira y escribilo acá.';
  }

  if (entrega.metodo === 'manual' && !entrega.motivo_manual.trim()) {
    errores.motivo_manual = 'Explicá por qué se entrega sin PIN.';
  }

  if (!entrega.nombre.trim()) {
    errores.nombre = 'Falta el nombre de quien retira.';
  }

  if (firmaVacia.value) {
    errores.firma = 'Falta la firma de quien retira.';
  }

  if (!fotoEntrega.value) {
    errores.foto = 'Sacá una foto de la entrega antes de confirmarla.';
  }

  return !Object.values(errores).some(Boolean);
}

async function confirmarEntrega() {
  if (!validarEntrega()) return;

  entregando.value = true;
  try {
    await axios.post(`/paquetes/${paqueteAEntregar.value.id}/entregar`, {
      ...entrega,
      firma: canvasFirma.value.toDataURL('image/png'),
      foto: fotoEntrega.value,
    });
    cerrarEntrega();
    await cargar();
  } catch (e) {
    manejarErrorEntrega(e);
  } finally {
    entregando.value = false;
  }
}

/** Traduce la respuesta del backend a los mismos campos del formulario. */
function manejarErrorEntrega(e) {
  const data = e.response?.data;
  const status = e.response?.status;

  // PIN incorrecto: el backend contesta 422 con el contador de intentos.
  if (status === 422 && data?.bloqueado !== undefined) {
    errores.pin = data.message;
    if (data.bloqueado) {
      pinBloqueado.value = true;
      entrega.metodo = 'manual';
      entrega.motivo_manual = 'PIN bloqueado por intentos fallidos';
    }
    return;
  }

  // PIN ya bloqueado de antes.
  if (status === 423) {
    pinBloqueado.value = true;
    entrega.metodo = 'manual';
    errores.pin = data.message;
    return;
  }

  // Validación de Laravel: cada clave es el nombre del campo.
  if (status === 422 && data?.errors) {
    let ubicado = false;
    Object.entries(data.errors).forEach(([campo, mensajes]) => {
      if (campo in errores && campo !== 'general') {
        errores[campo] = mensajes[0];
        ubicado = true;
      }
    });
    // Un campo que el formulario no muestra (dni, retirado_por) igual tiene que
    // verse en algún lado.
    if (!ubicado) {
      errores.general = Object.values(data.errors)[0][0];
    }
    return;
  }

  errores.general = data?.message || 'No pudimos registrar la entrega.';
}

// ---------- Firma ----------
const canvasFirma = ref(null);
const firmaVacia = ref(true);
let dibujando = false;

// El canvas se monta recién cuando se abre el diálogo, así que hay que
// dimensionarlo después de que Vuetify lo inserte en el DOM.
watch(showEntrega, async (abierto) => {
  if (!abierto) return;
  await nextTick();
  prepararCanvas();
});

function prepararCanvas() {
  const canvas = canvasFirma.value;
  if (!canvas) return;

  // Escalamos por devicePixelRatio para que el trazo no se vea pixelado en
  // los celulares, que es donde se va a firmar siempre.
  const ratio = window.devicePixelRatio || 1;
  const ancho = canvas.offsetWidth;
  const alto = 160;

  canvas.width = ancho * ratio;
  canvas.height = alto * ratio;
  canvas.style.height = `${alto}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2c3e50';

  firmaVacia.value = true;
}

function posicion(evento) {
  const rect = canvasFirma.value.getBoundingClientRect();
  return { x: evento.clientX - rect.left, y: evento.clientY - rect.top };
}

function empezarTrazo(evento) {
  dibujando = true;
  canvasFirma.value.setPointerCapture(evento.pointerId);
  const { x, y } = posicion(evento);
  const ctx = canvasFirma.value.getContext('2d');
  ctx.beginPath();
  ctx.moveTo(x, y);
  firmaVacia.value = false;
}

function dibujar(evento) {
  if (!dibujando) return;
  evento.preventDefault();
  const { x, y } = posicion(evento);
  const ctx = canvasFirma.value.getContext('2d');
  ctx.lineTo(x, y);
  ctx.stroke();
}

function terminarTrazo() {
  dibujando = false;
}

function limpiarFirma() {
  const canvas = canvasFirma.value;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  firmaVacia.value = true;
}

// ---------- Devolución ----------
const showDevolucion = ref(false);
const paqueteADevolver = ref(null);
const motivoDevolucion = ref('');
const devolviendo = ref(false);
const errorDevolucion = ref('');

function abrirDevolucion(p) {
  paqueteADevolver.value = p;
  motivoDevolucion.value = '';
  errorDevolucion.value = '';
  showDevolucion.value = true;
}

async function confirmarDevolucion() {
  // Antes no decía nada y el botón parecía no responder.
  if (!motivoDevolucion.value.trim()) {
    errorDevolucion.value = 'Escribí el motivo de la devolución.';
    return;
  }

  devolviendo.value = true;
  errorDevolucion.value = '';
  try {
    await axios.post(`/paquetes/${paqueteADevolver.value.id}/devolver`, {
      motivo: motivoDevolucion.value,
    });
    showDevolucion.value = false;
    await cargar();
  } catch (e) {
    // Dentro del modal, por el mismo motivo que en el de entrega.
    errorDevolucion.value =
      e.response?.data?.errors?.motivo?.[0] ||
      e.response?.data?.message ||
      'No pudimos registrar la devolución.';
  } finally {
    devolviendo.value = false;
  }
}

onMounted(cargar);
</script>

<style scoped>
.paq-admin {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.header h2 {
  color: #2c3e50;
  margin: 0;
}

.back-button {
  background: none;
  border: none;
  font-size: 1.6rem;
  color: #2c3e50;
  cursor: pointer;
  line-height: 1;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.tab {
  background: #fff;
  border: 1px solid #dde3e1;
  border-radius: 8px;
  padding: 0.55rem 1.1rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: #2c3e50;
  cursor: pointer;
}

.tab.activo {
  background: #27ae60;
  border-color: #27ae60;
  color: #fff;
}

.tab-badge {
  display: inline-block;
  margin-left: 0.4rem;
  background: #e53935;
  color: #fff;
  border-radius: 9px;
  font-size: 0.7rem;
  padding: 0 0.35rem;
}

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.9rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

/* En celulares angostos nombre y DNI no entran uno al lado del otro. */
@media (max-width: 430px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 700px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.campo {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.9rem;
  /* Sin esto el ancho mínimo intrínseco del input (size=20) desborda la
     columna de la grilla y el campo queda cortado en pantallas angostas. */
  min-width: 0;
}

.campo label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #5a6a66;
  margin-bottom: 0.25rem;
}

.campo input,
.campo select,
.campo textarea {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  border: 1px solid #dde3e1;
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  font-size: 0.92rem;
  font-family: inherit;
  color: #2c3e50;
  background: #fff;
}

.campo input:focus,
.campo select:focus,
.campo textarea:focus {
  outline: 2px solid #27ae60;
  outline-offset: -1px;
}

.pin-input {
  font-family: monospace;
  font-size: 1.6rem;
  letter-spacing: 0.5rem;
  text-align: center;
}

.pin-error {
  margin: 0.35rem 0 0;
  color: #c0392b;
  font-size: 0.82rem;
  font-weight: 600;
}

.aviso-manual {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  color: #b9770e;
}

.metodo-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.metodo {
  flex: 1;
  border: 1px solid #dde3e1;
  background: #fff;
  border-radius: 8px;
  padding: 0.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  color: #2c3e50;
}

.metodo.activo {
  background: #2c3e50;
  border-color: #2c3e50;
  color: #fff;
}

.metodo:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.canvas-firma {
  width: 100%;
  height: 160px;
  border: 1px dashed #b9c4c0;
  border-radius: 8px;
  background: #fdfdfd;
  touch-action: none;
  cursor: crosshair;
}

.btn-principal {
  width: 100%;
  background: #27ae60;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
}

.btn-principal:disabled {
  opacity: 0.6;
  cursor: default;
}

.btn-secundario {
  background: #2c3e50;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  margin-bottom: 1rem;
}

.filtros input[type='text'],
.filtros select {
  border: 1px solid #dde3e1;
  border-radius: 8px;
  padding: 0.5rem 0.7rem;
  font-size: 0.9rem;
  font-family: inherit;
}

.filtros input[type='text'] {
  flex: 1;
  min-width: 200px;
}

.check {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #5a6a66;
}

.tabla-wrap {
  overflow-x: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.tabla th {
  text-align: left;
  padding: 0.7rem 0.8rem;
  background: #f6f8f7;
  color: #5a6a66;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.tabla td {
  padding: 0.7rem 0.8rem;
  border-top: 1px solid #eef1f0;
  color: #2c3e50;
  white-space: nowrap;
}

.mono {
  font-family: monospace;
  font-weight: 600;
}

.sin-prop {
  color: #b9770e;
  font-weight: 600;
  cursor: help;
}

.estado-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
}

.estado-badge.recibido { background: #f39c12; }
.estado-badge.retirado { background: #27ae60; }
.estado-badge.devuelto { background: #7f8c8d; }
.estado-badge.vencido  { background: #c0392b; }

.solidez {
  display: inline-block;
  margin-left: 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
}

.solidez.alta { background: #e8f6ee; color: #1e8449; }
.solidez.media { background: #fdf3e3; color: #b9770e; }
.solidez.baja { background: #fdecea; color: #c0392b; }
.solidez.impugnada { background: #c0392b; color: #fff; }

.acciones {
  display: flex;
  gap: 0.6rem;
}

.link {
  background: none;
  border: none;
  color: #2980b9;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.link.gris {
  color: #7f8c8d;
}

.empty-state {
  text-align: center;
  color: #7a7a7a;
  padding: 3rem 1rem;
}

.ok {
  margin-top: 1rem;
  color: #1e8449;
  font-weight: 600;
}

.aviso {
  margin-top: 1rem;
  color: #b9770e;
  font-weight: 600;
}

.error-message {
  margin-top: 1.2rem;
  color: #c0392b;
  text-align: center;
  font-weight: 600;
}

/* ============ BANDEJA EN MOBILE ============
   Ocho columnas no entran en un celular y el scroll horizontal esconde las
   acciones. Cada fila pasa a ser una tarjeta: código y estado arriba, el
   resto como pares etiqueta/valor y los botones abajo a lo ancho. */
@media (max-width: 700px) {
  .tabla-wrap {
    overflow-x: visible;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
  }

  .tabla,
  .tabla tbody,
  .tabla tr,
  .tabla td {
    display: block;
    width: 100%;
  }

  .tabla thead {
    display: none;
  }

  .tabla tr {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.35rem 0.75rem;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    padding: 0.85rem 1rem;
    margin-bottom: 0.75rem;
  }

  .tabla td {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0;
    border-top: none;
    white-space: normal;
    overflow-wrap: anywhere;
    text-align: right;
  }

  .tabla td[data-label]::before {
    content: attr(data-label);
    flex: 0 0 auto;
    color: #5a6a66;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    text-align: left;
  }

  /* Código y estado forman la cabecera de la tarjeta. */
  .tabla td.col-codigo {
    order: -2;
    flex: 1 1 auto;
    width: auto;
    font-size: 1rem;
    text-align: left;
  }

  .tabla td.col-estado {
    order: -1;
    flex: 0 0 auto;
    width: auto;
    justify-content: flex-end;
  }

  .tabla td.acciones {
    justify-content: stretch;
    gap: 0.5rem;
    margin-top: 0.35rem;
  }

  .tabla td.acciones .link {
    flex: 1;
    border: 1px solid #2980b9;
    border-radius: 8px;
    padding: 0.5rem;
    font-size: 0.9rem;
  }

  .tabla td.acciones .link.gris {
    border-color: #b9c4c0;
  }

  .filtros .btn-secundario {
    flex: 1;
  }
}

.spinner-mounted-container {
  display: flex;
  justify-content: center;
  padding: 3rem 0;
}

.spinner-mounted {
  width: 34px;
  height: 34px;
  border: 3px solid #d9e2df;
  border-top-color: #27ae60;
  border-radius: 50%;
  animation: girar 0.8s linear infinite;
}

@keyframes girar {
  to { transform: rotate(360deg); }
}

/* ===== Foto del paquete ===== */


.foto-error {
  color: #c0392b;
  font-size: 0.8rem;
  margin-top: 0.4rem;
}


/* ===== Observaciones ===== */

.ayuda-obs {
  color: #5a6b7a;
  font-size: 0.82rem;
  line-height: 1.5;
  margin-bottom: 0.9rem;
}

.obs-cargando,
.obs-vacio {
  color: #8a8a8a;
  font-size: 0.85rem;
  margin-bottom: 0.9rem;
}

.obs-lista {
  max-height: 210px;
  overflow-y: auto;
  margin-bottom: 0.9rem;
  border: 1px solid #eceeed;
  border-radius: 8px;
}

.obs-item {
  padding: 0.6rem 0.7rem;
  border-bottom: 1px solid #f2f4f3;
}

.obs-item:last-child {
  border-bottom: none;
}

.obs-texto {
  font-size: 0.88rem;
  color: #2c3e50;
  line-height: 1.45;
  margin: 0;
  overflow-wrap: anywhere;
}

.obs-meta {
  font-size: 0.72rem;
  color: #9aa5ad;
  margin: 0.25rem 0 0;
}

/* ===== Detalle del paquete ===== */

.fila-clickeable {
  cursor: pointer;
}

.fila-clickeable:hover {
  background-color: #f7faf8;
}

.detalle-titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: #2c3e50;
}

.detalle-body {
  min-height: 200px;
}

.detalle-seccion {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #8a8a8a;
  margin: 1.25rem 0 0.55rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid #eceeed;
}

.detalle-seccion:first-child {
  margin-top: 0;
}

.detalle-datos {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem 1rem;
  margin: 0;
}

@media (max-width: 560px) {
  .detalle-datos {
    grid-template-columns: 1fr;
  }
}

.detalle-datos dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9aa5ad;
  margin-bottom: 0.1rem;
}

.detalle-datos dd {
  margin: 0;
  font-size: 0.9rem;
  color: #2c3e50;
}

.quiebre {
  overflow-wrap: anywhere;
}

.detalle-obs-alta {
  margin-top: 0.9rem;
  background: #fbfbfa;
  border: 1px solid #eceeed;
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  font-size: 0.87rem;
  color: #2c3e50;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.detalle-obs-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9aa5ad;
  margin-bottom: 0.2rem;
}

.detalle-imagenes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.detalle-imagenes figure {
  margin: 0;
}

.detalle-imagenes img {
  display: block;
  width: 100%;
  height: 170px;
  object-fit: contain;
  background: #f5f5f4;
  border: 1px solid #eceeed;
  border-radius: 8px;
  cursor: zoom-in;
}

/* La firma es un trazo sobre blanco: sobre gris se ve sucia. */
.figura-firma img {
  background: #fff;
  object-fit: contain;
}

.detalle-imagenes figcaption {
  margin-top: 0.3rem;
  font-size: 0.75rem;
  color: #8a8a8a;
  text-align: center;
  overflow-wrap: anywhere;
}

.detalle-nota-img {
  margin: 0.5rem 0 0;
  font-size: 0.73rem;
  color: #9aa5ad;
}

.detalle-acciones {
  flex-wrap: wrap;
  gap: 0.4rem;
}

.imagen-grande {
  display: block;
  width: 100%;
  max-height: 72vh;
  object-fit: contain;
  background: #f5f5f4;
  border-radius: 8px;
}

/* ===== Timeline (mismo lenguaje visual que la vista del propietario) ===== */

.timeline {
  margin-top: 0.5rem;
  padding-left: 0.4rem;
  border-left: 2px solid #e4e7e6;
}

.evento {
  position: relative;
  padding: 0.4rem 0 0.4rem 1rem;
}

.punto {
  position: absolute;
  left: -6px;
  top: 0.75rem;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #27ae60;
  border: 2px solid #fff;
}

.evento-tipo {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 600;
  color: #2c3e50;
}

.evento-nota {
  margin: 0.1rem 0 0;
  font-size: 0.82rem;
  color: #555;
  overflow-wrap: anywhere;
}

.evento-fecha {
  margin: 0.1rem 0 0;
  font-size: 0.75rem;
  color: #8a8a8a;
}

/* ===== Errores de validación dentro de los modales ===== */

.campo-error {
  margin: 0.3rem 0 0;
  color: #c0392b;
  font-size: 0.8rem;
  font-weight: 600;
}

/* El borde marca el campo aunque el mensaje quede fuera de la vista al hacer
   scroll dentro del modal. */
.campo input.invalido,
.campo textarea.invalido,
.canvas-firma.invalido {
  border-color: #e08a7d;
  background-color: #fdf6f5;
}

.error-modal {
  margin: 1rem 0 0;
  background: #fdecea;
  color: #c0392b;
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 600;
}
</style>
