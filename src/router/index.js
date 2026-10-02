import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/components/Home.vue';
import Login from '@/components/Login.vue';
import Menu from '@/components/Menu.vue';
// import ChangePassword from '@/components/ChangePassword.vue';
import GastosComunes from '@/components/GastosComunes.vue';
import Listado from '@/components/Listado.vue';
import Profile from '@/components/Profile.vue';
import Contact from '@/components/Contact.vue';
import EditUser from '@/components/EditUser.vue';
import Files from '@/components/Files.vue';
import EnviarCorreo from '@/components/EnviarCorreo.vue';
import ForgotPassword from '@/components/ForgotPassword.vue';
import ResetPassword from '@/components/ResetPassword.vue';
import ImportGastos from '@/components/ImportGastos.vue';
import ImportMorosos from '@/components/ImportMorosos.vue';
import NotificationsCenter from '@/components/NotificationsCenter.vue';
import Turnero from '@/components/Turnero.vue';
import TurneroAdmin from '@/components/TurneroAdmin.vue';
import Paqueteria from '@/components/Paqueteria.vue';
import PaqueteriaAdmin from '@/components/PaqueteriaAdmin.vue';
import PaqueteriaUsuarios from '@/components/PaqueteriaUsuarios.vue';
import Mensajeria from '@/components/mensajeria/Mensajeria.vue';
import MensajeriaUsuarios from '@/components/MensajeriaUsuarios.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/menu', component: Menu, meta: { requiresAuth: true } },
  // { path: '/change-password', component: ChangePassword, meta: { requiresAuth: true } },
  { path: '/gastos', component: GastosComunes, meta: { requiresAuth: true } },
  { path: '/listado-gastos', component: Listado, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/mi-perfil', component: Profile, meta: { requiresAuth: true } },
  { path: '/contact-services', component: Contact, meta: { requiresAuth: true } },
  { path: '/edit-users', component: EditUser, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/files', component: Files, meta: { requiresAuth: true } },
  { path: '/send-email', component: EnviarCorreo, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/forgot-password', component: ForgotPassword },
  { path: '/reset-password', component: ResetPassword },
  { path: '/import-gastos', component: ImportGastos, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/import-morosos', component: ImportMorosos, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/notifications-center', component: NotificationsCenter, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/turnero', component: Turnero, meta: { requiresAuth: true } },
  { path: '/turnero-admin', component: TurneroAdmin, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/paqueteria', component: Paqueteria, meta: { requiresAuth: true } },
  // Sin requiresAdmin: el operario de paquetería no es admin. El permiso lo
  // resuelve el backend y la vista muestra el aviso si no lo tiene.
  { path: '/paqueteria-oficina', component: PaqueteriaAdmin, meta: { requiresAuth: true } },
  { path: '/paqueteria-usuarios', component: PaqueteriaUsuarios, meta: { requiresAuth: true, requiresAdmin: true } },
  // Mensajería interna. `layout: 'completo'` le dice a App.vue que no dibuje
  // navbar, footer ni el widget del bot: el módulo ocupa la pantalla entera.
  // Sin requiresAdmin: el acceso lo da la tabla mensajeria_miembros, y el
  // backend lo revalida en cada endpoint.
  {
    path: '/mensajeria',
    component: Mensajeria,
    meta: { requiresAuth: true, requiresMensajeria: true, layout: 'completo' },
  },
  { path: '/mensajeria-usuarios', component: MensajeriaUsuarios, meta: { requiresAuth: true, requiresAdmin: true } },
];

// Lo único que puede ver una cuenta de portería. `/menu` entra porque el menú
// ya le viene recortado a estas mismas dos secciones, y `/mi-perfil` porque
// tiene que poder cambiar su contraseña.
//
// `/mensajeria` está en la lista para no dejar afuera al personal de portería
// que además tenga cuenta personal habilitada en el chat: sin esto, el guard lo
// expulsaría a la oficina. Entrar igual requiere el flag de mensajería, que la
// cuenta compartida no tiene (el backend se la niega, ver
// MensajeriaMiembroController@update).
const RUTAS_PAQUETERIA = ['/paqueteria-oficina', '/mi-perfil', '/menu', '/mensajeria'];

const router = createRouter({
  history: createWebHistory(),//createWebHistory('/test/'),//createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const user = localStorage.getItem('user');
  const admin = localStorage.getItem('admin');
  const paqueteria = localStorage.getItem('paqueteria');

  // Si intenta ir a /login o a la portada estando logueado, lo mandamos al menú
  if ((to.path === '/login' || to.path === '/') && user) {
    return next(paqueteria ? '/paqueteria-oficina' : '/menu');
  }

  // Si necesita estar logueado y no lo está, lo redirige a /login
  if (to.meta.requiresAuth && !user) {
    return next('/login');
  }

  // ⚠️ Bloqueo de seguridad: si debe cambiar la contraseña, no puede navegar a otro lado
  const mustChangePassword = localStorage.getItem('mustChangePassword');
  if (user && mustChangePassword && to.path !== '/mi-perfil') {
    return next('/mi-perfil?tab=contrasenia');
  }

  // Cuenta de portería: sólo su oficina y su perfil. Esto es UX, no seguridad
  // —el permiso real lo chequea cada endpoint del backend—, pero evita que se
  // meta por URL a secciones que no le sirven y le muestran datos vacíos.
  if (user && paqueteria && !RUTAS_PAQUETERIA.includes(to.path)) {
    return next('/paqueteria-oficina');
  }

  // Si necesita permisos de admin y no los tiene
  if (to.meta.requiresAdmin && !admin) {
    return next('/menu');
  }

  // Mensajería interna. Igual que el resto de este guard, es UX y no seguridad:
  // evita que alguien sin acceso entre por URL y se coma un 403 en pantalla. El
  // permiso real lo chequea el middleware `mensajeria` del backend en cada
  // endpoint, así que tocar este flag en localStorage no habilita nada.
  if (to.meta.requiresMensajeria && !localStorage.getItem('mensajeria')) {
    return next('/menu');
  }

  // Todo bien, continuar
  next();
});

export default router;
