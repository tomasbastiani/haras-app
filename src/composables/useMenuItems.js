import { computed, effectScope, ref, watch } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useNotifications } from '@/composables/useNotifications';
import { useMensajeriaAvisos } from '@/composables/useMensajeriaAvisos';
import axios from '@/axios';

const GREEN = 'linear-gradient(135deg, #2ecc71, #1e8449)';
const NAVY = 'linear-gradient(135deg, #2c3e50, #1a2733)';
// La mensajería interna tiene su propia identidad visual (módulo oscuro, aparte
// del portal), así que su tarjeta del menú también se distingue del resto.
const SLATE = 'linear-gradient(135deg, #2f3a46, #14161c)';

// El rol de operario de paquetería vive en su propia tabla, no en users.admin,
// así que hay que preguntarlo. Si falla, simplemente no se muestra la sección.
// El estado es de módulo: el menú y el drawer del navbar lo comparten y se
// consulta una sola vez por sesión.
const esOperarioPaqueteria = ref(false);
let accesoPedido = false;
let watchRegistrado = false;

/**
 * Acceso a la mensajería interna.
 *
 * También hay que preguntarlo, y por un motivo más fuerte que el de paquetería:
 * el flag viaja en el login, pero las sesiones de esta app no expiran nunca. Sin
 * esta consulta, a quien ya estaba logueado cuando se le habilitó el chat no le
 * aparecería el módulo jamás —y a quien se le quitó le seguiría apareciendo.
 */
async function cargarAcceso() {
  const { user, isPaqueteria, setMensajeria } = useAuth();
  if (accesoPedido || !user.value) return;

  accesoPedido = true;

  // La cuenta dedicada de portería ya trae el permiso de paquetería desde el
  // login: eso no hay que preguntarlo. La mensajería sí, porque una cuenta de
  // portería puede tener además acceso al chat.
  if (isPaqueteria()) {
    esOperarioPaqueteria.value = true;
  } else {
    try {
      const { data } = await axios.get('/paqueteria/acceso');
      esOperarioPaqueteria.value = !!data.operario;
    } catch (e) {
      esOperarioPaqueteria.value = false;
    }
  }

  // Independiente del anterior: si falla uno, el otro se resuelve igual.
  try {
    const { data } = await axios.get('/mensajeria/acceso');
    setMensajeria(!!data.acceso);

    // El contador del navbar arranca sólo si la persona tiene acceso Y participa
    // del chat. Un admin que entra sólo a supervisar grupos no tiene no leídos
    // propios, así que ponerlo a consultar cada minuto sería puro gasto.
    const { configurar, iniciar, detener } = useMensajeriaAvisos();

    if (data.acceso && data.miembro) {
      configurar(data.badge_ms);
      iniciar();
    } else {
      detener();
    }
  } catch (e) {
    // Se deja el flag como está: un corte de red no es motivo para sacarle el
    // módulo a alguien que lo tiene.
  }
}

export function useMenuItems() {
  const { user, isAdmin, isPaqueteria, tieneMensajeria } = useAuth();
  const { unreadCount } = useNotifications();

  // Entrada a la mensajería interna. Se arma aparte porque aplica a los dos
  // menús: el general de un empleado-propietario y el recortado de portería.
  const itemMensajeria = {
    fullTitle: 'Mensajería Interna',
    icon: 'mdi-forum-outline',
    color: SLATE,
    to: '/mensajeria',
  };

  // Al cambiar de usuario (login/logout) el permiso se vuelve a pedir. El scope
  // es desprendido para que el watcher no muera al desmontarse el componente
  // que resultó ser el primero en usar el composable.
  if (!watchRegistrado) {
    watchRegistrado = true;
    effectScope(true).run(() => {
      watch(user, (nuevo) => {
        accesoPedido = false;
        esOperarioPaqueteria.value = false;

        if (nuevo) {
          cargarAcceso();
        } else {
          // Logout: cortar el contador del navbar. Si no, seguiría consultando con
          // un token ya revocado hasta que se recargara la página.
          useMensajeriaAvisos().detener();
        }
      });
    });
  }

  // Menú recortado de la cuenta de portería: su puesto de trabajo y el cambio
  // de contraseña, nada más. No tiene lote, así que Gastos Comunes, Archivos y
  // Turnero no le aplican.
  const paqueteriaItems = [
    { fullTitle: 'Oficina de Paquetería', icon: 'mdi-package-variant', color: NAVY, to: '/paqueteria-oficina' },
    { fullTitle: 'Mi Perfil', icon: 'mdi-account-circle-outline', color: GREEN, to: '/mi-perfil' },
  ];

  const generalItems = computed(() => (isPaqueteria() ? [
    ...paqueteriaItems,
    ...(tieneMensajeria() ? [itemMensajeria] : []),
  ] : [
    { fullTitle: 'Gastos Comunes', icon: 'mdi-cash-multiple', color: GREEN, to: '/gastos' },
    { fullTitle: 'Sacar turno', icon: 'mdi-calendar-check-outline', color: GREEN, to: '/turnero' },
    { fullTitle: 'Mis Paquetes', icon: 'mdi-package-variant-closed', color: GREEN, to: '/paqueteria' },
    { fullTitle: 'Mi Perfil', icon: 'mdi-account-circle-outline', color: GREEN, to: '/mi-perfil' },
    { fullTitle: 'Contacto/Servicios', icon: 'mdi-phone-in-talk-outline', color: GREEN, to: '/contact-services' },
    {
      fullTitle: isAdmin() ? 'Ver Archivos' : 'Adjuntar Archivos',
      icon: isAdmin() ? 'mdi-folder-open-outline' : 'mdi-file-upload-outline',
      color: GREEN,
      to: '/files',
    },
    // Va en el menú general y no en el de administración: para un empleado es su
    // herramienta de trabajo diaria, no una sección de gestión.
    ...(tieneMensajeria() ? [itemMensajeria] : []),
  ]));

  // La cuenta de portería no tiene bloque de Administración: su única sección
  // ya está en el menú general.
  const adminItems = computed(() => (isPaqueteria() ? [] : [
    // Se muestra al operario de paquetería aunque no sea admin; el resto de la
    // sección sigue siendo sólo para admins.
    ...(esOperarioPaqueteria.value
      ? [{ fullTitle: 'Oficina de Paquetería', icon: 'mdi-package-variant', color: NAVY, to: '/paqueteria-oficina' }]
      : []),
    ...(isAdmin()
      ? [
          { fullTitle: 'Cuentas de Paquetería', icon: 'mdi-account-key-outline', color: NAVY, to: '/paqueteria-usuarios' },
          { fullTitle: 'Acceso a Mensajería', icon: 'mdi-forum-outline', color: NAVY, to: '/mensajeria-usuarios' },
          { fullTitle: 'Administrar Turnos', icon: 'mdi-clipboard-list-outline', color: NAVY, to: '/turnero-admin' },
          { fullTitle: 'Listado Total Gastos Comunes', icon: 'mdi-format-list-bulleted', color: NAVY, to: '/listado-gastos' },
          { fullTitle: 'Editar Usuarios por Lote', icon: 'mdi-account-group-outline', color: NAVY, to: '/edit-users' },
          { fullTitle: 'Enviar Email', icon: 'mdi-email-send-outline', color: NAVY, to: '/send-email' },
          { fullTitle: 'Importador Gastos Comunes', icon: 'mdi-file-import-outline', color: NAVY, to: '/import-gastos' },
          { fullTitle: 'Importador Morosos', icon: 'mdi-file-alert-outline', color: NAVY, to: '/import-morosos' },
          {
            fullTitle: 'Centro de Notificaciones',
            icon: 'mdi-bell-ring-outline',
            color: NAVY,
            badge: unreadCount.value || null,
            to: '/notifications-center',
          },
        ]
      : []),
  ]));

  const mostrarAdmin = computed(() => !isPaqueteria() && (isAdmin() || esOperarioPaqueteria.value));

  return {
    generalItems,
    adminItems,
    mostrarAdmin,
    esOperarioPaqueteria,
    cargarAcceso,
  };
}
