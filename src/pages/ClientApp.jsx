import HeartApp from "./HeartApp";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function ClientApp() {
  const [user, setUser] = useState(null);
  const [clientRecord, setClientRecord] = useState(null);
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

    if (!error) {
      setClientRecord(clientData);
    }

    setLoading(false);
  }

  if (loading) return <p>Loading...</p>;

  if (!clientRecord) {
    return (
      <div style={{ padding: "40px", color: "white" }}>
        <h1>No client access found</h1>
        <p>You are logged in as {user.email}, but this account is not linked to a client invite.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: "16px", color: "white" }}>
        Client: {clientRecord.client_name || clientRecord.client_email}
      </div>

     <HeartApp
  clientId={clientRecord.id}
  practitionerId={clientRecord.practitioner_id}
/>
    </div>
  );
}
