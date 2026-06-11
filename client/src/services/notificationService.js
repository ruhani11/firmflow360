import axiosInstance from "../api/axiosInstance";

export const getMyNotifications = async () => {
  const response = await axiosInstance.get("/notifications/my");
  return response.data;
};

export const getUnreadNotificationCount = async () => {
  const response = await axiosInstance.get("/notifications/unread-count");
  return response.data;
};

export const markNotificationAsRead = async (id) => {
  const response = await axiosInstance.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await axiosInstance.patch("/notifications/mark-all/read");
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await axiosInstance.delete(`/notifications/${id}`);
  return response.data;
};