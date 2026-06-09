import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login";
        return;
      }

      setUser(data.user);
      setLoading(false);
    }

    loadUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: "40px", color: "white" }}>
      <h1>Practitioner Dashboard</h1>

      <p>Logged in as: {user.email}</p>

      <button onClick={() => (window.location.href = "/app")}>
        Launch Heart Dynamics
      </button>

      <button onClick={handleLogout} style={{ marginLeft: "12px" }}>
        Logout
      </button>
    </div>
  );
}
