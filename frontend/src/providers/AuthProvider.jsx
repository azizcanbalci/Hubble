import { createContext, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { axiosInstance } from "../lib/axios";
import { useAppAuth } from "../context/AppAuthContext";
import toast from "react-hot-toast";

const AuthContext = createContext({});

export default function AuthProvider({ children }) {
  const { getToken } = useAuth();
  const { customToken } = useAppAuth();

  useEffect(() => {
    const interceptor = axiosInstance.interceptors.request.use(
      async (config) => {
        try {
          if (customToken) {
            config.headers.Authorization = `Bearer ${customToken}`;
          } else {
            const token = await getToken();
            if (token) config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          if (error.message?.includes("auth") || error.message?.includes("token")) {
            toast.error("Authentication issue. Please refresh the page.");
          }
          console.log("Error getting token:", error);
        }
        return config;
      },
      (error) => {
        console.error("Axios request error:", error);
        return Promise.reject(error);
      }
    );

    return () => axiosInstance.interceptors.request.eject(interceptor);
  }, [getToken, customToken]);

  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>;
}
