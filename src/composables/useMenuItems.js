import { computed, effectScope, ref, watch } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useNotifications } from '@/composables/useNotifications';
import axios from '@/axios';

const GREEN = 'linear-gradient(135deg, #2ecc71, #1e8449)';
const NAVY = 'linear-gradient(135deg, #2c3e50, #1a2733)';

// El rol de operario de paquetería vive en su propia tabla, no en users.admin,
// así que hay que preguntarlo. Si falla, simplemente no se muestra la sección.
// El estado es de módulo: el menú y el drawer del navbar lo comparten y se
// consulta una sola vez por sesión.
const esOperarioPaqueteria = ref(false);
let accesoPedido = false;
let watchRegistrado = false;

async function cargarAcceso() {
  const { user, isPaqueteria } = useAuth();
  if (accesoPedido || !user.value) return;

  // La cuenta dedicada de portería ya trae el permiso desde el login: no hay
  // nada que preguntar.
  if (isPaqueteria()) {
    accesoPedido = true;
    esOperarioPaqueteria.value = true;
    return;
  }

  accesoPedido = true;
  try {
    const { data } = await axios.get('/paqueteria/acceso');
    esOperarioPaqueteria.value = !!data.operario;
  } catch (e) {
    esOperarioPaqueteria.value = false;
  }
}

export function useMenuItems() {
  const { user, isAdmin, isPaqueteria } = useAuth();
  const { unreadCount } = useNotifications();

  // Al cambiar de usuario (login/logout) el permiso se vuelve a pedir. El scope
  // es desprendido para que el watcher no muera al desmontarse el componente
  // que resultó ser el primero en usar el composable.
  if (!watchRegistrado) {
    watchRegistrado = true;
    effectScope(true).run(() => {
      watch(user, (nuevo) => {
        accesoPedido = false;
        esOperarioPaqueteria.value = false;
        if (nuevo) cargarAcceso();
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

  const generalItems = computed(() => (isPaqueteria() ? paqueteriaItems : [
    { fullTitle: 'Gastos Comunes', icon: 'mdi-cash-multiple', color: GREEN, to: '/gastos' },
    // Turnero de Canchas: oculto para usuarios comunes por ahora. Para volver a
    // habilitarlo a todos, quitar el `...(isAdmin() ? [...] : [])` y dejar el objeto suelto.
    ...(isAdmin()
      ? [{ fullTitle: 'Turnero de Canchas', icon: 'mdi-tennis', color: GREEN, to: '/turnero' }]
      : []),
    { fullTitle: 'Mis Paquetes', icon: 'mdi-package-variant-closed', color: GREEN, to: '/paqueteria' },
    { fullTitle: 'Mi Perfil', icon: 'mdi-account-circle-outline', color: GREEN, to: '/mi-perfil' },
    { fullTitle: 'Contacto/Servicios', icon: 'mdi-phone-in-talk-outline', color: GREEN, to: '/contact-services' },
    {
      fullTitle: isAdmin() ? 'Ver Archivos' : 'Adjuntar Archivos',
      icon: isAdmin() ? 'mdi-folder-open-outline' : 'mdi-file-upload-outline',
      color: GREEN,
      to: '/files',
    },
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
