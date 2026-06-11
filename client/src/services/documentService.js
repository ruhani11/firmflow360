import axiosInstance from "../api/axiosInstance";

/* =========================
   ADMIN DOCUMENT APIs
========================= */

export const getAllDocumentsForAdmin = async () => {
  const response = await axiosInstance.get("/documents/admin/all");
  return response.data;
};

export const uploadDocumentByAdmin = async (formData) => {
  const response = await axiosInstance.post(
    "/documents/admin/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const updateDocumentStatusByAdmin = async (documentId, statusData) => {
  const response = await axiosInstance.patch(
    `/documents/admin/${documentId}/status`,
    statusData
  );

  return response.data;
};

export const linkDocumentToAssignmentByAdmin = async (
  documentId,
  assignmentData
) => {
  const response = await axiosInstance.patch(
    `/documents/admin/${documentId}/link-assignment`,
    assignmentData
  );

  return response.data;
};

export const replaceDocumentFile = async (documentId, formData) => {
  const response = await axiosInstance.patch(
    `/documents/${documentId}/replace`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const deleteDocument = async (documentId) => {
  const response = await axiosInstance.delete(`/documents/${documentId}`);
  return response.data;
};

/* =========================
   CLIENT DOCUMENT APIs
========================= */

export const getMyClientDocuments = async () => {
  const response = await axiosInstance.get("/documents/client/my");
  return response.data;
};

export const uploadDocumentByClient = async (formData) => {
  const response = await axiosInstance.post(
    "/documents/client/upload",
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
   STAFF DOCUMENT APIs
========================= */

export const getMyStaffClientDocuments = async () => {
  const response = await axiosInstance.get("/documents/staff/my-clients");
  return response.data;
};

export const uploadDocumentByStaff = async (formData) => {
  const response = await axiosInstance.post(
    "/documents/staff/upload",
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
   DOWNLOAD / VIEW HELPERS
   Backend mounted at: /api/downloads
========================= */

export const downloadDocument = async (documentId, fileName = "document") => {
  const response = await axiosInstance.get(`/downloads/document/${documentId}`, {
    responseType: "blob",
  });

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

export const viewDocument = async (documentId) => {
  const response = await axiosInstance.get(`/downloads/document/${documentId}`, {
    responseType: "blob",
  });

  const contentType = response.headers["content-type"] || "application/pdf";

  const blobUrl = window.URL.createObjectURL(
    new Blob([response.data], { type: contentType })
  );

  window.open(blobUrl, "_blank");
};