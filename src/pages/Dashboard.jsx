import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import LogoutButton from "../components/LogoutButton";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [profile, setProfile] = useState(null);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");

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

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileRow) {
      setProfile(profileRow);
      setFullName(profileRow.full_name || "");
      setBusinessName(profileRow.business_name || "");
      setPhone(profileRow.phone || "");
    }

    const { data: clientRows, error } = await supabase
      .from("clients")
      .select("*")
      .eq("practitioner_id", data.user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      const clientIds = (clientRows || []).map((client) => client.id);

      let sessionRows = [];

      if (clientIds.length > 0) {
        const { data: sessionsData } = await supabase
          .from("sessions")
          .select("*")
          .in("client_id", clientIds);

        sessionRows = sessionsData || [];
      }

      const clientsWithStats = (clientRows || []).map((client) => {
        const sessions = sessionRows.filter(
          (session) => session.client_id === client.id
        );

        const totalSessions = sessions.length;

        const totalTimeInCoherence = sessions.reduce(
          (sum, session) => sum + Number(session.time_in_coherence_seconds || 0),
          0
        );

        const averageCoherence =
          totalSessions > 0
            ? (
                sessions.reduce(
                  (sum, session) => sum + Number(session.coherence_score || 0),
                  0
                ) / totalSessions
              ).toFixed(2)
            : "—";

        const lastSessionAt =
          sessions.length > 0
            ? sessions
                .map((session) => session.created_at)
                .sort()
                .reverse()[0]
            : null;

        return {
          ...client,
          stats: {
            totalSessions,
            totalTimeInCoherence,
            averageCoherence,
            lastSessionAt
          }
        };
      });

      setClients(clientsWithStats);
    }

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

  async function handleSaveProfile(e) {
    e.preventDefault();

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        business_name: businessName,
        phone: phone
      })
      .eq("id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Profile saved");
    loadDashboard();
  }

  async function copyInvite(link) {
    await navigator.clipboard.writeText(link);
    alert("Invite link copied");
  }

  function formatSeconds(seconds) {
    const mins = Math.floor(Number(seconds || 0) / 60);
    return `${mins} min`;
  }

  function formatDate(dateValue) {
    if (!dateValue) return "No sessions yet";
    return new Date(dateValue).toLocaleDateString();
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
              <p>
                {businessName || "The Mind Academy"} · Practitioner Portal
              </p>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
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

              <p
                className="portal-muted"
                style={{ marginTop: "18px", fontSize: "13px" }}
              >
                Logged in as {user?.email}
              </p>
            </div>

            <div className="dashboard-card">
              <h2>
                Practitioner <em>Profile</em>
              </h2>
              <p>Update the details connected to your practitioner account.</p>

              <form className="dashboard-form" onSubmit={handleSaveProfile}>
                <input
                  className="portal-input"
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />

                <input
                  className="portal-input"
                  type="text"
                  placeholder="Business name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />

                <input
                  className="portal-input"
                  type="text"
                  placeholder="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <button className="portal-button secondary" type="submit">
                  Save Profile
                </button>
              </form>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>
              Your <em>Clients</em>
            </h2>
            <p>
              Manage invite links and review client coherence activity.
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

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(4, 1fr)",
                          gap: "10px",
                          marginBottom: "14px"
                        }}
                      >
                        <div className="portal-muted">
                          Sessions
                          <br />
                          <strong style={{ color: "var(--hd-ink)" }}>
                            {client.stats.totalSessions}
                          </strong>
                        </div>

                        <div className="portal-muted">
                          Avg Score
                          <br />
                          <strong style={{ color: "var(--hd-ink)" }}>
                            {client.stats.averageCoherence}
                          </strong>
                        </div>

                        <div className="portal-muted">
                          Coherence Time
                          <br />
                          <strong style={{ color: "var(--hd-ink)" }}>
                            {formatSeconds(client.stats.totalTimeInCoherence)}
                          </strong>
                        </div>

                        <div className="portal-muted">
                          Last Session
                          <br />
                          <strong style={{ color: "var(--hd-ink)" }}>
                            {formatDate(client.stats.lastSessionAt)}
                          </strong>
                        </div>
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
