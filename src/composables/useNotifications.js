import { ref, computed, watch } from 'vue';
import api from '@/axios';

const notifications = ref([]);
const loading = ref(false);

// Limpiar notificaciones si se borra el usuario del localStorage (logout)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'user' && !event.newValue) {
      notifications.value = [];
    }
  });
}

export function useNotifications() {
  const fetchNotifications = async () => {
    const userEmail = localStorage.getItem('user') || null;
    
    if (!userEmail) {
      notifications.value = [];
      return;
    }
    
    loading.value = true;
    try {
      // Limpiamos la lista antes de cargar para evitar que el usuario actual vea datos del anterior
      notifications.value = []; 
      
      const res = await api.post('/notifications', { email: userEmail });
      notifications.value = res.data;
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      loading.value = false;
    }
  };

  const markOneAsRead = async (id) => {
    const userEmail = localStorage.getItem('user') || null;
    if (!userEmail) return;
    try {
      await api.post('/notifications/read', { 
        id: id,
        email: userEmail 
      });
      // Actualizar estado local
      const notif = notifications.value.find(n => n.id === id);
      if (notif) notif.is_read = true;
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const userEmail = localStorage.getItem('user') || null;
    if (!userEmail) return;
    try {
      await api.post('/notifications/read-all', { email: userEmail });
      notifications.value = notifications.value.map(n => ({ ...n, is_read: true }));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const addNotification = (notif) => {
    // Agregamos al inicio de la lista local
    notifications.value.unshift({
      id: Date.now(), // ID temporal
      title: notif.title,
      body: notif.body,
      is_read: false,
      created_at: new Date().toISOString()
    });
  };

  const unreadCount = computed(() => {
    return notifications.value.filter(n => !n.is_read).length;
  });

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAllAsRead,
    addNotification
  };
}
