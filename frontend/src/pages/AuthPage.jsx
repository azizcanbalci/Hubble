import { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useNavigate } from "react-router";
import { useAppAuth } from "../context/AppAuthContext";
import { loginUser, registerUser } from "../lib/api";
import "../styles/auth.css";

const AuthPage = () => {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { loginWithCustom } = useAppAuth();
  const { signIn, isLoaded: clerkLoaded } = useSignIn();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let data;
      if (tab === "login") {
        data = await loginUser(email, password);
      } else {
        data = await registerUser(name, email, password);
      }
      loginWithCustom(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Bir hata oluştu, tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!clerkLoaded) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: "/",
      });
    } catch (err) {
      setError("Google girişi başlatılamadı.");
      console.error(err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-hero">
          <div className="brand-container">
            <img src="/logo.png" alt="Hubble" className="brand-logo" />
            <span className="brand-name">Hubble</span>
          </div>

          <h1 className="hero-title">Where Work Happens ✨</h1>

          <p className="hero-subtitle">
            Ekibinizle anında bağlanın. Gerçek zamanlı mesajlaşma ve güçlü
            işbirliği araçlarıyla modern ekiplere özel deneyim.
          </p>

          <div className="features-list">
            <div className="feature-item">
              <span className="feature-icon">💬</span>
              <span>Gerçek zamanlı mesajlaşma</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎥</span>
              <span>Video görüşme ve toplantı</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span>Güvenli ve özel</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-panel">
          <div className="auth-tabs">
            <button
              className={`auth-tab${tab === "login" ? " active" : ""}`}
              onClick={() => { setTab("login"); setError(""); }}
            >
              Giriş Yap
            </button>
            <button
              className={`auth-tab${tab === "register" ? " active" : ""}`}
              onClick={() => { setTab("register"); setError(""); }}
            >
              Kayıt Ol
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {tab === "register" && (
              <div className="auth-input-group">
                <label>Ad Soyad</label>
                <input
                  className="auth-input"
                  type="text"
                  placeholder="Adınız Soyadınız"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="auth-input-group">
              <label>Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-input-group">
              <label>Şifre</label>
              <input
                className="auth-input"
                type="password"
                placeholder={tab === "register" ? "En az 6 karakter" : "Şifreniz"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              className="auth-submit-btn"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Lütfen bekleyin..."
                : tab === "login"
                ? "Giriş Yap"
                : "Hesap Oluştur"}
            </button>
          </form>

          <div className="auth-divider">veya</div>

          <button
            className="auth-google-btn"
            onClick={handleGoogleLogin}
            disabled={!clerkLoaded || loading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
              <path d="M47.5 24.5C47.5 22.6 47.33 20.8 47.01 19.06H24V29.34H37.24C36.65 32.33 34.95 34.86 32.4 36.54V43.04H40.3C44.9 38.78 47.5 32.19 47.5 24.5Z" fill="#4285F4"/>
              <path d="M24 48C30.6 48 36.16 45.83 40.3 43.04L32.4 36.54C30.21 37.99 27.4 38.86 24 38.86C17.64 38.86 12.24 34.56 10.31 28.74H2.15V35.44C6.27 43.64 14.5 48 24 48Z" fill="#34A853"/>
              <path d="M10.31 28.74C9.81 27.29 9.53 25.74 9.53 24.14C9.53 22.54 9.81 20.99 10.31 19.54V12.84H2.15C0.78 15.56 0 18.76 0 22.14C0 25.52 0.78 28.72 2.15 31.44L10.31 28.74Z" fill="#FBBC05"/>
              <path d="M24 9.5C27.7 9.5 30.98 10.79 33.56 13.28L40.46 6.38C36.16 2.38 30.6 0 24 0C14.5 0 6.27 4.36 2.15 12.56L10.31 19.26C12.24 13.44 17.64 9.5 24 9.5Z" fill="#EA4335"/>
            </svg>
            Google ile Hızlı Giriş
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
