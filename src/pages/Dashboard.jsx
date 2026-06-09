import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    setUser(data.user);

    const { data: clientRows, error } = await supabase
      .from("clients")
      .select("*")
      .eq("practitioner_id", data.user.id)
      .order("created_at", { ascending: false });

    if (!error) setClients(clientRows || []);

    setLoading(false);
  }

  function makeInviteToken() {
    return crypto.randomUUID();
  }

  async function handleAddClient(e) {
    e.preventDefault();

    if (!clientEmail) return alert("Client email is required");

    const inviteToken = makeInviteToken();

    const { error } = await supabase.from("clients").insert({
      practitioner_id: user.id,
      client_name: clientName,
      client_email: clientEmail,
      invite_token: inviteToken,
      invite_status: "pending"
    });

    if (error) {
      alert(error.message);
      return;
    }

    setClientName("");
    setClientEmail("");
    loadDashboard();
  }

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

      <hr style={{ margin: "30px 0" }} />

      <h2>Add Client</h2>

      <form onSubmit={handleAddClient}>
        <input
          type="text"
          placeholder="Client name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Client email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          style={{ marginLeft: "8px" }}
        />

        <button type="submit" style={{ marginLeft: "8px" }}>
          Add Client
        </button>
      </form>

      <h2 style={{ marginTop: "30px" }}>Clients</h2>

      {clients.length === 0 ? (
        <p>No clients yet.</p>
      ) : (
        <ul>
          {clients.map((client) => {
            const inviteLink = `${window.location.origin}/invite/${client.invite_token}`;

            return (
              <li key={client.id} style={{ marginBottom: "16px" }}>
                <strong>{client.client_name || "Unnamed Client"}</strong>
                <br />
                {client.client_email}
                <br />
                Status: {client.invite_status}
                <br />
                Invite link:{" "}
                <input
                  value={inviteLink}
                  readOnly
                  style={{ width: "420px" }}
                  onFocus={(e) => e.target.select()}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
