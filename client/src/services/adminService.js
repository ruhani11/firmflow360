import axiosInstance from "../api/axiosInstance";

/* =========================
   CLIENT APIs
========================= */

export const getAllClients = async () => {
  const response = await axiosInstance.get("/admin/clients");
  return response.data;
};

export const createClientByAdmin = async (clientData) => {
  const response = await axiosInstance.post("/admin/client", clientData);
  return response.data;
};

export const updateClientByAdmin = async (clientId, clientData) => {
  const response = await axiosInstance.patch(
    `/admin/client/${clientId}`,
    clientData
  );
  return response.data;
};

export const deleteClientByAdmin = async (clientId) => {
  const response = await axiosInstance.delete(`/admin/client/${clientId}`);
  return response.data;
};

/* =========================
   STAFF APIs
========================= */

export const getAllStaff = async () => {
  const response = await axiosInstance.get("/admin/staff");
  return response.data;
};

export const createStaffByAdmin = async (staffData) => {
  const response = await axiosInstance.post("/admin/staff", staffData);
  return response.data;
};

export const updateStaffByAdmin = async (staffId, staffData) => {
  const response = await axiosInstance.patch(
    `/admin/staff/${staffId}`,
    staffData
  );
  return response.data;
};

export const deleteStaffByAdmin = async (staffId) => {
  const response = await axiosInstance.delete(`/admin/staff/${staffId}`);
  return response.data;
};

/* =========================
   USERS APIs
========================= */

export const getAllUsers = async () => {
  const response = await axiosInstance.get("/admin/users");
  return response.data;
};