import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://backend-clothing-store2.obl.ee",
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const pathname = window.location.pathname;

    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      if (pathname === "/admin") {
        window.location.href = "/login";
        return Promise.reject(error);
      }
      
   
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
