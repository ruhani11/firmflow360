export const saveAuthData = (token, user) => {
  localStorage.setItem("firmflow_token", token);
  localStorage.setItem("firmflow_user", JSON.stringify(user));
};

export const getToken = () => {
  return localStorage.getItem("firmflow_token");
};

export const getUser = () => {
  const user = localStorage.getItem("firmflow_user");

  if (!user) return null;

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
};

export const getUserRole = () => {
  const user = getUser();
  return user?.role ? String(user.role).toUpperCase() : null;
};

export const isLoggedIn = () => {
  return Boolean(getToken() && getUser());
};

export const logout = () => {
  localStorage.removeItem("firmflow_token");
  localStorage.removeItem("firmflow_user");

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("authToken");
  localStorage.removeItem("loggedInUser");

  window.location.replace("/");
};

export const getDashboardPathByRole = (role) => {
  const normalizedRole = String(role || "").toUpperCase();

  if (normalizedRole === "ADMIN") return "/admin-dashboard";
  if (normalizedRole === "STAFF") return "/staff-dashboard";
  if (normalizedRole === "CLIENT") return "/client-dashboard";

  return "/";
};