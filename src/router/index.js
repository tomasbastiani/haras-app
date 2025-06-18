import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/components/Home.vue';
import Login from '@/components/Login.vue';
import Menu from '@/components/Menu.vue';
// import ChangePassword from '@/components/ChangePassword.vue';
import GastosComunes from '@/components/GastosComunes.vue';
import Listado from '@/components/Listado.vue';
import Profile from '@/components/Profile.vue';
import Contact from '@/components/Contact.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/menu', component: Menu, meta: { requiresAuth: true } },
  // { path: '/change-password', component: ChangePassword, meta: { requiresAuth: true } },
  { path: '/gastos', component: GastosComunes, meta: { requiresAuth: true } },
  { path: '/listado-gastos', component: Listado, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/mi-perfil', component: Profile, meta: { requiresAuth: true } },
  { path: '/contact-services', component: Contact, meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const user = localStorage.getItem('user');
  const admin = localStorage.getItem('admin');

  // Si intenta ir a /login estando logueado, lo mandamos al menú
  if (to.path === '/login' && user) {
    return next('/menu');
  }

  // Si necesita estar logueado y no lo está, lo redirige a /login
  if (to.meta.requiresAuth && !user) {
    return next('/login');
  }

  // Si necesita permisos de admin y no los tiene
  if (to.meta.requiresAdmin && !admin) {
    return next('/menu');
  }

  // Todo bien, continuar
  next();
});

export default router;
