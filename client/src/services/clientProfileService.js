import axiosInstance from "../api/axiosInstance";

export const getMyClientProfile = async () => {
  const response = await axiosInstance.get("/client-profile/my");
  return response.data;
};

export const updateMyClientProfile = async (profileData) => {
  const response = await axiosInstance.patch(
    "/client-profile/my",
    profileData
  );
  return response.data;
};