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
    if (envio.value && envio.value.estado === 'en_curso') {
      timer = setTimeout(consultar, 5000);
    }
  };

  // Empieza a seguir un envío (el resumen que devuelve el POST). Pausado no
  // se consulta: no cambia hasta que alguien lo reanude.
  const seguir = (resumen) => {
    detener();
    envio.value = resumen;
    if (resumen && resumen.estado === 'en_curso') {
      timer = setTimeout(consultar, 5000);
    }
  };

  const limpiar = () => {
    detener();
    envio.value = null;
  };

  // pausar | reanudar | cancelar
  const ejecutando = ref(false);
  const accion = async (nombre) => {
    if (!envio.value) return;
    if (nombre === 'cancelar' && !confirm('¿Cancelar el envío? Los que todavía no lo recibieron no lo van a recibir. Después podés usar "Reenviar" para mandarles sólo a ellos.')) {
      return;
    }
    ejecutando.value = true;
    try {
      const { data } = await axios.post(`/admin/envios-masivos/${envio.value.id}/${nombre}`);
      seguir(data.envio);
    } catch (e) {
      console.error(`Error al ${nombre} el envío:`, e);
      alert(e.response?.data?.message || `No se pudo ${nombre} el envío.`);
    } finally {
      ejecutando.value = false;
    }
  };

  const progreso = computed(() => {
    const e = envio.value;
    if (!e) return '';
    const aMandar = e.total - e.omitidos - (e.ya_recibidos || 0);
    let txt;
    if (e.estado === 'finalizado') txt = `Terminado: ${e.enviados} de ${aMandar} enviados.`;
    else if (e.estado === 'pausado') txt = `Pausado: ${e.enviados} de ${aMandar} enviados.`;
    else txt = `Enviando: ${e.enviados} de ${aMandar}…`;
    if (e.ya_recibidos) txt += ` ${e.ya_recibidos} ya lo habían recibido.`;
    if (e.omitidos) txt += ` ${e.omitidos} omitido(s) por email rebotado.`;
    if (e.cancelados) txt += ` ${e.cancelados} cancelado(s).`;
    if (e.errores) txt += ` ${e.errores} con error.`;
    return txt;
  });

  onBeforeUnmount(detener);

  return { envio, seguir, limpiar, progreso, accion, ejecutando };
}
