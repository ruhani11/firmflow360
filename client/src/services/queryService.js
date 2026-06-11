import axiosInstance from "../api/axiosInstance";

/* =========================
   CLIENT QUERY APIs - ADMIN
========================= */

export const getAllClientQueriesForAdmin = async () => {
  const response = await axiosInstance.get("/client-queries/admin/all");
  return response.data;
};

export const createClientQueryByAdmin = async (queryData) => {
  const response = await axiosInstance.post(
    "/client-queries/admin/create",
    queryData
  );
  return response.data;
};

export const addReplyToClientQuery = async (queryId, replyData) => {
  const response = await axiosInstance.post(
    `/client-queries/${queryId}/reply`,
    replyData
  );
  return response.data;
};

export const updateClientQueryStatus = async (queryId, statusData) => {
  const response = await axiosInstance.patch(
    `/client-queries/${queryId}/status`,
    statusData
  );
  return response.data;
};

export const deleteClientQueryByAdmin = async (queryId) => {
  const response = await axiosInstance.delete(
    `/client-queries/admin/${queryId}`
  );
  return response.data;
};

/* =========================
   CLIENT QUERY APIs - CLIENT
========================= */

export const createQueryByClient = async (queryData) => {
  const response = await axiosInstance.post(
    "/client-queries/client/create",
    queryData
  );
  return response.data;
};

export const getMyClientQueries = async () => {
  const response = await axiosInstance.get("/client-queries/client/my");
  return response.data;
};

/* =========================
   CLIENT QUERY APIs - STAFF
========================= */

export const getMyStaffClientQueries = async () => {
  const response = await axiosInstance.get("/client-queries/staff/my");
  return response.data;
};

export const createClientQueryByStaff = async (queryData) => {
  const response = await axiosInstance.post(
    "/client-queries/staff/create",
    queryData
  );
  return response.data;
};

/* =========================
   INTERNAL QUERY APIs - ADMIN
========================= */

export const getAllInternalQueriesForAdmin = async () => {
  const response = await axiosInstance.get("/internal-queries/admin/all");
  return response.data;
};

export const createInternalQuery = async (queryData) => {
  const response = await axiosInstance.post(
    "/internal-queries/create",
    queryData
  );
  return response.data;
};

export const addReplyToInternalQuery = async (queryId, replyData) => {
  const response = await axiosInstance.post(
    `/internal-queries/${queryId}/reply`,
    replyData
  );
  return response.data;
};

export const updateInternalQueryStatus = async (queryId, statusData) => {
  const response = await axiosInstance.patch(
    `/internal-queries/${queryId}/status`,
    statusData
  );
  return response.data;
};

export const deleteInternalQueryByAdmin = async (queryId) => {
  const response = await axiosInstance.delete(
    `/internal-queries/admin/${queryId}`
  );
  return response.data;
};

/* =========================
   INTERNAL QUERY APIs - STAFF
========================= */

export const getMyInternalQueriesForStaff = async () => {
  const response = await axiosInstance.get("/internal-queries/staff/my");
  return response.data;
};