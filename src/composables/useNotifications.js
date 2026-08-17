import { ref } from 'vue';
import api from '@/axios';

const notifications = ref([]);
const loading = ref(false);
const loadingMore = ref(false);
const hasMore = ref(false);
const unreadCount = ref(0);
const currentPage = ref(1);

// Limpiar notificaciones si se borra el usuario del localStorage (logout)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'user' && !event.newValue) {
      notifications.value = [];
      unreadCount.value = 0;
      hasMore.value = false;
    }
  });
}

export function useNotifications() {
  const fetchNotifications = async () => {
    const userEmail = localStorage.getItem('user') || null;

    if (!userEmail) {
      notifications.value = [];
      unreadCount.value = 0;
      hasMore.value = false;
      return;
    }

    loading.value = true;
    try {
      const res = await api.post('/notifications', { page: 1 });
      notifications.value = res.data.data;
      currentPage.value = res.data.current_page;
      hasMore.value = res.data.has_more;
      unreadCount.value = res.data.unread_count;
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      loading.value = false;
    }
  };

  const loadMoreNotifications = async () => {
    const userEmail = localStorage.getItem('user') || null;
    if (!userEmail || loadingMore.value || !hasMore.value) return;

    loadingMore.value = true;
    try {
      const nextPage = currentPage.value + 1;
      const res = await api.post('/notifications', { page: nextPage });
      notifications.value.push(...res.data.data);
      currentPage.value = res.data.current_page;
      hasMore.value = res.data.has_more;
    } catch (err) {
      console.error('Error loading more notifications:', err);
    } finally {
      loadingMore.value = false;
    }
  };

  const markOneAsRead = async (id) => {
    const userEmail = localStorage.getItem('user') || null;
    if (!userEmail) return;
    try {
      await api.post('/notifications/read', { id: id });
      const notif = notifications.value.find(n => n.id === id);
      if (notif && !notif.is_read) {
        notif.is_read = true;
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const userEmail = localStorage.getItem('user') || null;
    if (!userEmail) return;
    try {
      await api.post('/notifications/read-all');
      notifications.value = notifications.value.map(n => ({ ...n, is_read: true }));
      unreadCount.value = 0;
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
    unreadCount.value += 1;
  };

  return {
    notifications,
    loading,
    loadingMore,
    hasMore,
    unreadCount,
    fetchNotifications,
    loadMoreNotifications,
    markOneAsRead,
    markAllAsRead,
    addNotification
  };
}
