// Notification Service

const STORAGE_KEY = "attendance_os_notifications";

const INITIAL_NOTIFICATIONS = [];

export const notificationService = {
    getAll() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to load notifications", e);
        }
        this.save(INITIAL_NOTIFICATIONS);
        return INITIAL_NOTIFICATIONS;
    },

    save(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            console.error("Failed to save notifications", e);
        }
    },

    add(notification) {
        const list = this.getAll();
        const newNotif = {
            id: `notif_${Date.now()}`,
            time: "Just now",
            read: false,
            createdAt: new Date().toISOString(),
            ...notification
        };
        list.unshift(newNotif);
        this.save(list);
        return newNotif;
    },

    markAsRead(id) {
        const list = this.getAll();
        const item = list.find(n => n.id === id);
        if (item) item.read = true;
        this.save(list);
        return list;
    },

    markAllAsRead() {
        const list = this.getAll().map(n => ({ ...n, read: true }));
        this.save(list);
        return list;
    },

    clearAll() {
        this.save([]);
        return [];
    }
};
