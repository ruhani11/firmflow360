import axiosInstance from "../api/axiosInstance";

export const getAdminDashboardStats = async () => {
  const response = await axiosInstance.get("/dashboard/admin");
  return response.data;
};

export const getStaffDashboardStats = async () => {
  const response = await axiosInstance.get("/dashboard/staff");
  return response.data;
};

export const getClientDashboardStats = async () => {
  const response = await axiosInstance.get("/dashboard/client");
  return response.data;
};