import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import LogoutButton from "../components/LogoutButton";
import HeartApp from "./HeartApp";

export default function ClientApp() {
  const [user, setUser] = useState(null);
  const [clientRecord, setClientRecord] = useState(null);
  const [practitionerProfile, setPractitionerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClient();
  }, []);

  async function loadClient() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      window.location.href = "/login";
      return;
    }

    setUser(data.user);

    const { data: clientData, error } = await supabase
      .from("clients")
      .select("*")
      .eq("client_auth_id", data.user.id)
      .single();

    if (error || !clientData) {
      setLoading(false);
      return;
    }

    setClientRecord(clientData);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", clientData.practitioner_id)
      .single();

    if (profileData) {
      setPractitionerProfile(profileData);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-shell">
          <p className="portal-muted">Loading client portal...</p>
        </div>
      </main>
    );
  }

  if (!clientRecord) {
    return (
      <main className="dashboard-page">
        <div className="dashboard-shell">
          <div className="dashboard-card">
            <h1 className="portal-title">
              No Client <em>Access</em>
            </h1>

            <p className="portal-subtitle">
              You are logged in as {user?.email}, but this account is not linked
              to a client invite.
            </p>

            <LogoutButton />
          </div>
        </div>
      </main>
    );
  }

  const clientName = clientRecord.client_name || user?.email;
  const practitionerName =
    practitionerProfile?.full_name || "your practitioner";
  const businessName =
    practitionerProfile?.business_name || "The Mind Academy";

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
              <p>{businessName} · Client Portal</p>
            </div>
          </div>

          <div className="dashboard-actions">
            <LogoutButton />
          </div>
        </header>

        <section className="dashboard-card glow" style={{ marginBottom: "22px" }}>
          <h2>
            Welcome, <em>{clientName}</em>
          </h2>

          <p>
            Your Heart Dynamics training portal is connected to{" "}
            <strong style={{ color: "var(--hd-ink)" }}>
              {practitionerName}
            </strong>
            {businessName ? (
              <>
                {" "}
                at{" "}
                <strong style={{ color: "var(--hd-ink)" }}>
                  {businessName}
                </strong>
              </>
            ) : null}
            .
          </p>

          <p className="portal-muted" style={{ marginTop: "10px" }}>
            Use the session below to practise coherence, stress regulation, and
            performance lock training. Your session summaries will be saved for
            practitioner review.
          </p>
        </section>

        <HeartApp
          clientId={clientRecord.id}
          practitionerId={clientRecord.practitioner_id}
        />
      </div>
    </main>
  );
}
