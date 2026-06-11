import axiosInstance from "../api/axiosInstance";

/* =========================
   ADMIN CLIENT FILE APIs
========================= */

export const getAllClientFilesForAdmin = async () => {
  const response = await axiosInstance.get("/client-files/admin/all");
  return response.data;
};

export const uploadClientFileByAdmin = async (formData) => {
  const response = await axiosInstance.post(
    "/client-files/admin/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const updateClientFileStatusByAdmin = async (fileId, statusData) => {
  const response = await axiosInstance.patch(
    `/client-files/admin/${fileId}/status`,
    statusData
  );

  return response.data;
};

export const replaceClientFile = async (fileId, formData) => {
  const response = await axiosInstance.patch(
    `/client-files/${fileId}/replace`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const deleteClientFile = async (fileId) => {
  const response = await axiosInstance.delete(`/client-files/${fileId}`);
  return response.data;
};

/* =========================
   STAFF CLIENT FILE APIs
========================= */

export const getMyStaffClientFiles = async () => {
  const response = await axiosInstance.get("/client-files/staff/my");
  return response.data;
};

export const uploadClientFileByStaff = async (formData) => {
  const response = await axiosInstance.post(
    "/client-files/staff/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

/* =========================
   CLIENT FILE APIs
========================= */

export const getMyClientFiles = async () => {
  const response = await axiosInstance.get("/client-files/client/my");
  return response.data;
};

/* =========================
   DOWNLOAD / VIEW HELPERS
   Backend mounted at: /api/downloads
========================= */

export const downloadClientFile = async (fileId, fileName = "client-file") => {
  const response = await axiosInstance.get(
    `/downloads/client-file/${fileId}`,
    {
      responseType: "blob",
    }
  );

  const contentType =
    response.headers["content-type"] || "application/octet-stream";

  const blobUrl = window.URL.createObjectURL(
    new Blob([response.data], { type: contentType })
  );

  const link = document.createElement("a");
  link.href = blobUrl;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(blobUrl);
};

export const viewClientFile = async (fileId) => {
  const response = await axiosInstance.get(
    `/downloads/client-file/${fileId}`,
    {
      responseType: "blob",
    }
  );

  const contentType =
    response.headers["content-type"] || "application/pdf";

  const blobUrl = window.URL.createObjectURL(
    new Blob([response.data], { type: contentType })
  );

  window.open(blobUrl, "_blank");
};