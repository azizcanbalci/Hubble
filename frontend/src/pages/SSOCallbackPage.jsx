import { useEffect } from "react";
import { useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router";

const SSOCallbackPage = () => {
  const { handleRedirectCallback } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    handleRedirectCallback({
      afterSignInUrl: "/",
      afterSignUpUrl: "/",
    }).catch(() => navigate("/auth"));
  }, [handleRedirectCallback, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(125deg, #1a0b2e, #16213e, #0f3460)",
        color: "white",
        fontSize: "1rem",
      }}
    >
      Giriş yapılıyor...
    </div>
  );
};

export default SSOCallbackPage;
