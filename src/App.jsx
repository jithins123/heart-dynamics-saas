import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ClientInvite from "./pages/ClientInvite";
import ClientSignup from "./pages/ClientSignup";
import HeartApp from "./pages/HeartApp";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HeartApp />} />
        <Route path="/app" element={<HeartApp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/invite/:token" element={<ClientInvite />} />
        <Route path="/client-signup/:token" element={<ClientSignup />} />
      </Routes>
    </BrowserRouter>
  );
}
