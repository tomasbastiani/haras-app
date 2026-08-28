<template>
  <div class="campo foto-campo">
    <label>{{ label }}</label>

    <div v-if="!modelValue" :class="['foto-botones', { invalido: !!mensaje }]">
      <button type="button" class="btn-foto" @click="camaraInput.click()">
        📷 Sacar foto
      </button>
      <button type="button" class="btn-foto" @click="galeriaInput.click()">
        🖼️ Elegir de la galería
      </button>
    </div>

    <div v-else class="foto-preview">
      <img :src="modelValue" :alt="label" />
      <div class="foto-preview-acciones">
        <span class="foto-peso">{{ peso }}</span>
        <button type="button" class="btn-foto chico" @click="camaraInput.click()">Reemplazar</button>
        <button type="button" class="btn-foto chico peligro" @click="limpiar">Quitar</button>
      </div>
    </div>

    <p v-if="mensaje" class="foto-error">{{ mensaje }}</p>

    <!-- `capture` abre la cámara directo en el celu; el segundo input no lo lleva
         para que el sistema ofrezca la galería. En desktop los dos caen en el
         explorador de archivos, que es lo esperable. -->
    <input
      ref="camaraInput"
      class="input-oculto"
      type="file"
      accept="image/*"
      capture="environment"
      @change="procesar"
    />
    <input
      ref="galeriaInput"
      class="input-oculto"
      type="file"
      accept="image/*"
      @change="procesar"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

/**
 * Captura de foto con cámara o galería, con la compresión ya resuelta.
 *
 * El v-model es un data URL JPEG listo para mandar al backend.
 */
const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Foto' },
  // Error de validación que viene del formulario ("falta la foto"). Se muestra
  // igual que los errores propios del componente.
  error: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

// La foto se comprime en el navegador antes de subirla: una cámara de celular
// tira 4-8 MB y la oficina suele estar con datos móviles. A 1280px de lado
// mayor se lee perfecto la etiqueta y el POST queda en 200-400 KB.
const MAX_LADO = 1280;
const CALIDAD = 0.75;

const camaraInput = ref(null);
const galeriaInput = ref(null);
const peso = ref('');
const errorPropio = ref('');

// El error propio manda: si el archivo elegido no se pudo leer, eso es más
// específico que el "falta la foto" que trae el formulario.
const mensaje = computed(() => errorPropio.value || props.error);

// Si el padre resetea el v-model (por ejemplo al limpiar el formulario), el
// peso y el error tienen que irse con la foto.
watch(() => props.modelValue, (valor) => {
  if (!valor) {
    peso.value = '';
    errorPropio.value = '';
  }
});

async function procesar(evento) {
  const archivo = evento.target.files?.[0];
  // Se limpia el input para que elegir dos veces la misma foto vuelva a
  // disparar el change.
  evento.target.value = '';
  if (!archivo) return;

  errorPropio.value = '';

  if (!archivo.type.startsWith('image/')) {
    errorPropio.value = 'El archivo elegido no es una imagen.';
    return;
  }

  try {
    const dataUrl = await comprimir(archivo);
    // El data URL en base64 pesa ~4/3 de los bytes reales.
    peso.value = `${Math.round((dataUrl.length * 0.75) / 1024)} KB`;
    emit('update:modelValue', dataUrl);
  } catch (e) {
    errorPropio.value = 'No pudimos procesar la imagen. Probá con otra foto.';
  }
}

function limpiar() {
  peso.value = '';
  errorPropio.value = '';
  emit('update:modelValue', '');
}

/** Redimensiona y recomprime a JPEG. Devuelve un data URL. */
async function comprimir(archivo) {
  const bitmap = await cargarBitmap(archivo);
  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);

  const ctx = canvas.getContext('2d');
  // Fondo blanco: si la original es un PNG con transparencia, al pasarla a
  // JPEG el alfa quedaría negro.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  if (bitmap.close) bitmap.close();

  return canvas.toDataURL('image/jpeg', CALIDAD);
}

/**
 * createImageBitmap con imageOrientation resuelve el EXIF: sin eso, las fotos
 * verticales de muchos celulares se suben acostadas. Si el navegador no lo
 * soporta, se cae a un <img>, que en navegadores actuales ya auto-orienta.
 */
async function cargarBitmap(archivo) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    } catch (e) {
      // Safari viejo no acepta la opción: se reintenta sin ella.
      try {
        return await createImageBitmap(archivo);
      } catch (e2) {
        // Sigue al fallback de abajo.
      }
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}
</script>

<style scoped>
.input-oculto {
  display: none;
}

.foto-campo {
  display: flex;
  flex-direction: column;
  margin-top: 0.25rem;
}

.foto-campo > label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.35rem;
}

.foto-botones {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn-foto {
  background: #fff;
  border: 1px dashed #b9c4c0;
  border-radius: 8px;
  padding: 0.7rem 1rem;
  font-size: 0.88rem;
  font-weight: 600;
  font-family: inherit;
  color: #2c3e50;
  cursor: pointer;
  flex: 1;
  min-width: 150px;
}

.btn-foto:active {
  background: #f0f3f1;
}

.btn-foto.chico {
  flex: 0 0 auto;
  min-width: 0;
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  border-style: solid;
}

.btn-foto.peligro {
  color: #c0392b;
  border-color: #f0c6c0;
}

.foto-preview {
  border: 1px solid #dde3e1;
  border-radius: 10px;
  padding: 0.5rem;
  background: #fbfbfa;
}

.foto-preview img {
  display: block;
  width: 100%;
  max-height: 260px;
  object-fit: contain;
  border-radius: 6px;
  background: #fff;
}

.foto-preview-acciones {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.foto-peso {
  flex: 1;
  font-size: 0.75rem;
  color: #8a8a8a;
}

.foto-botones.invalido .btn-foto {
  border-color: #e08a7d;
  background: #fdf6f5;
}

.foto-error {
  color: #c0392b;
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 0.4rem;
}
</style>
