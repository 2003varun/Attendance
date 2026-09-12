// Notification Service

const STORAGE_KEY = "attendance_os_notifications";

const INITIAL_NOTIFICATIONS = [
    {
        id: "n1",
        title: "Leave Approved",
        message: "Your Casual Leave for Aug 10 - Aug 12 was approved by Varun Sharma.",
        type: "success",
        time: "10 mins ago",
        read: false,
        recipientRole: "EMPLOYEE",
        recipientId: "428"
    },
    {
        id: "n2",
        title: "Pending Leave Request",
        message: "Amit Patel (Product) requested 3 days of Earned Leave.",
        type: "info",
        time: "1 hour ago",
        read: false,
        recipientRole: "MANAGER",
        recipientId: "all"
    },
    {
        id: "n3",
        title: "Monthly Roster Ready",
        message: "August timesheet logs parsed and aggregated successfully.",
        type: "info",
        time: "Yesterday",
        read: true,
        recipientRole: "ADMIN",
        recipientId: "all"
    }
];

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
