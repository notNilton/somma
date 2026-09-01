export const AndroidImportance = {
  MAX: 5,
};

const permissionStatus: { status: string } = { status: "granted" };

export const __setPermissionStatus = (status: string) => {
  permissionStatus.status = status;
};

export const getPermissionsAsync = jest.fn(async () => ({
  status: permissionStatus.status,
}));

export const requestPermissionsAsync = jest.fn(async () => ({
  status: permissionStatus.status,
}));

let scheduledNotifications: any[] = [];

export const scheduleNotificationAsync = jest.fn(
  async (notification: any) => {
    scheduledNotifications.push(notification);
    return "notification-id";
  },
);

export const setNotificationHandler = jest.fn();
export const addNotificationResponseReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));
export const addNotificationReceivedListener = jest.fn(() => ({
  remove: jest.fn(),
}));
export const setNotificationChannelAsync = jest.fn();
export const getExpoPushTokenAsync = jest.fn(async () => ({
  data: "expo-push-token-mock",
}));

/** Retorna todas as notificações agendadas durante o teste */
export const __getScheduledNotifications = () => scheduledNotifications;

/** Limpa as notificações agendadas */
export const __resetScheduledNotifications = () => {
  scheduledNotifications = [];
};
