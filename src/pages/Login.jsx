import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message);
      return;
    }

    const { data } = await supabase.auth.getUser();

    const { data: clientRow } = await supabase
      .from("clients")
      .select("*")
      .eq("client_auth_id", data.user.id)
      .maybeSingle();

    if (clientRow) {
      window.location.href = "/client-app";
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="hd-logo"></div>

          <h1>
            Heart <em>Dynamics</em>
          </h1>

          <p>The Mind Academy Coherence System</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <input
              className="portal-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="portal-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button className="portal-button" type="submit">
              Sign In
            </button>
          </div>
        </form>

        <p className="portal-muted" style={{ marginTop: "22px", fontSize: "13px" }}>
          Practitioner?{" "}
          <a href="/signup" style={{ color: "var(--hd-green)" }}>
            Create an account
          </a>
        </p>
      </section>
    </main>
  );
}
