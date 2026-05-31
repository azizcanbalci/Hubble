import { Navigate, Route, Routes } from "react-router";
import { useAppAuth } from "./context/AppAuthContext";

import AuthPage from "./pages/AuthPage";
import CallPage from "./pages/CallPage";
import HomePage from "./pages/HomePage";
import InvitePage from "./pages/InvitePage";
import AnalysesPage from "./pages/AnalysesPage";
import SSOCallbackPage from "./pages/SSOCallbackPage";

import * as Sentry from "@sentry/react";

const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);

const App = () => {
  const { isSignedIn, isLoaded } = useAppAuth();

  if (!isLoaded) return null;

  return (
    <SentryRoutes>
      <Route path="/" element={isSignedIn ? <HomePage /> : <Navigate to={"/auth"} replace />} />
      <Route path="/auth" element={!isSignedIn ? <AuthPage /> : <Navigate to={"/"} replace />} />
      <Route path="/sso-callback" element={<SSOCallbackPage />} />

      <Route
        path="/call/:id"
        element={isSignedIn ? <CallPage /> : <Navigate to={"/auth"} replace />}
      />

      <Route
        path="/invite/:code"
        element={isSignedIn ? <InvitePage /> : <Navigate to={"/auth"} replace />}
      />

      <Route
        path="/analyses"
        element={isSignedIn ? <AnalysesPage /> : <Navigate to={"/auth"} replace />}
      />

      <Route
        path="*"
        element={isSignedIn ? <Navigate to={"/"} replace /> : <Navigate to={"/auth"} replace />}
      />
    </SentryRoutes>
  );
};

export default App;
