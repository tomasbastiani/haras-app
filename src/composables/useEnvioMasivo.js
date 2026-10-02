import { ref, computed, onBeforeUnmount } from 'vue';
import axios from '@/axios';

/**
 * Progreso de un envío masivo de mail (aviso de gastos comunes, mail
 * personalizado). El backend sólo encola: los mails salen de a tandas cada
 * minuto, así que acá se consulta el estado hasta que termina.
 */
export function useEnvioMasivo() {
  const envio = ref(null);
  let timer = null;

  const detener = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const consultar = async () => {
    if (!envio.value) return;
    try {
      const { data } = await axios.get(`/admin/envios-masivos/${envio.value.id}`);
      envio.value = data.envio;
    } catch (e) {
      console.error('Error consultando el envío:', e);
    }
    if (envio.value && !envio.value.finalizado) {
      timer = setTimeout(consultar, 5000);
    }
  };

  // Empieza a seguir un envío (el resumen que devuelve el POST).
  const seguir = (resumen) => {
    detener();
    envio.value = resumen;
    if (resumen && !resumen.finalizado) {
      timer = setTimeout(consultar, 5000);
    }
  };

  const limpiar = () => {
    detener();
    envio.value = null;
  };

  const progreso = computed(() => {
    const e = envio.value;
    if (!e) return '';
    const aMandar = e.total - e.omitidos;
    let txt = e.finalizado
      ? `Terminado: ${e.enviados} de ${aMandar} enviados.`
      : `Enviando: ${e.enviados} de ${aMandar}…`;
    if (e.omitidos) txt += ` ${e.omitidos} omitido(s) por email rebotado.`;
    if (e.errores) txt += ` ${e.errores} con error.`;
    return txt;
  });

  onBeforeUnmount(detener);

  return { envio, seguir, limpiar, progreso };
}
