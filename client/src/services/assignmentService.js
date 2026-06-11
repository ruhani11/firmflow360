import axiosInstance from "../api/axiosInstance";

/* =========================
   ADMIN ASSIGNMENT APIs
========================= */

export const getAllAssignmentsForAdmin = async () => {
  const response = await axiosInstance.get("/assignments/admin/all");
  return response.data;
};

export const createAssignment = async (assignmentData) => {
  const response = await axiosInstance.post("/assignments", assignmentData);
  return response.data;
};

export const updateAssignment = async (assignmentId, assignmentData) => {
  const response = await axiosInstance.patch(
    `/assignments/${assignmentId}`,
    assignmentData
  );
  return response.data;
};

export const updateAssignmentStatus = async (assignmentId, statusData) => {
  const response = await axiosInstance.patch(
    `/assignments/${assignmentId}/status`,
    statusData
  );
  return response.data;
};

export const deleteAssignment = async (assignmentId) => {
  const response = await axiosInstance.delete(`/assignments/${assignmentId}`);
  return response.data;
};

/* =========================
   STAFF ASSIGNMENT APIs
========================= */

export const getMyStaffAssignments = async () => {
  const response = await axiosInstance.get("/assignments/staff/my");
  return response.data;
};

/* =========================
   CLIENT SERVICE APIs
========================= */

export const getMyClientServices = async () => {
  const response = await axiosInstance.get("/assignments/client/my");
  return response.data;
};