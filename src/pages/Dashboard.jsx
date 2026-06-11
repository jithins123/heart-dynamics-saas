import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import LogoutButton from "../components/LogoutButton";

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

  async function copyInvite(link) {
    await navigator.clipboard.writeText(link);
    alert("Invite link copied");
  }

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-shell">
          <p className="portal-muted">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div className="dashboard-brand">
            <div className="hd-logo" style={{ marginBottom: 0 }}></div>

            <div>
              <h1>
                Heart <em>Dynamics</em>
              </h1>
              <p>The Mind Academy · Practitioner Portal</p>
            </div>
          </div>

          <div className="dashboard-actions">
            <button
              className="portal-button secondary"
              onClick={() => (window.location.href = "/app")}
            >
              Launch App
            </button>

            <LogoutButton />
          </div>
        </header>

        <section className="dashboard-grid">
          <div className="dashboard-card glow">
            <h2>
              Add <em>Client</em>
            </h2>
            <p>
              Create a private invite link for a client to access Heart Dynamics.
            </p>

            <form className="dashboard-form" onSubmit={handleAddClient}>
              <input
                className="portal-input"
                type="text"
                placeholder="Client name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />

              <input
                className="portal-input"
                type="email"
                placeholder="Client email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                required
              />

              <button className="portal-button" type="submit">
                Generate Invite
              </button>
            </form>

            <p className="portal-muted" style={{ marginTop: "18px", fontSize: "13px" }}>
              Logged in as {user?.email}
            </p>
          </div>

          <div className="dashboard-card">
            <h2>
              Your <em>Clients</em>
            </h2>
            <p>
              Manage invite links and review session history as the portal grows.
            </p>

            {clients.length === 0 ? (
              <div className="dashboard-empty">
                No clients yet. Add your first client to generate an invite link.
              </div>
            ) : (
              <div className="client-list">
                {clients.map((client) => {
                  const inviteLink = `${window.location.origin}/invite/${client.invite_token}`;
                  const isAccepted = client.invite_status === "accepted";

                  return (
                    <div className="client-card" key={client.id}>
                      <div className="client-top">
                        <div>
                          <div className="client-name">
                            {client.client_name || "Unnamed Client"}
                          </div>
                          <div className="client-email">{client.client_email}</div>
                        </div>

                        <span className={`status-pill ${isAccepted ? "" : "pending"}`}>
                          {client.invite_status}
                        </span>
                      </div>

                      <div className="invite-row">
                        <input
                          className="portal-link-box"
                          value={inviteLink}
                          readOnly
                          onFocus={(e) => e.target.select()}
                        />

                        <button
                          className="portal-button secondary"
                          type="button"
                          onClick={() => copyInvite(inviteLink)}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
