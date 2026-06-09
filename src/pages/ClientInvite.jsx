import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ClientInvite() {
  const { token } = useParams();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvite();
  }, []);

  async function loadInvite() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("invite_token", token)
      .single();

    if (error || !data) {
      setClient(null);
    } else {
      setClient(data);
    }

    setLoading(false);
  }

  if (loading) return <p>Loading invite...</p>;

  if (!client) {
    return <h1>Invalid or expired invite link</h1>;
  }

  return (
    <div style={{ padding: "40px", color: "white" }}>
      <h1>Welcome to Heart Dynamics</h1>

      <p>
        You have been invited as a client by your practitioner.
      </p>

      <p>
        Client: <strong>{client.client_name || client.client_email}</strong>
      </p>

      <button onClick={() => (window.location.href = `/client-signup/${token}`)}>
        Create Client Account
      </button>
    </div>
  );
}
