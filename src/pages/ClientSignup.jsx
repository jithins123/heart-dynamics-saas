import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ClientSignup() {
  const { token } = useParams();

  const [client, setClient] = useState(null);
  const [password, setPassword] = useState("");
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

  async function handleCreateAccount(e) {
    e.preventDefault();

    if (!client) return;
    if (!password) return alert("Password is required");

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: client.client_email,
      password,
      options: {
        data: {
          role: "client"
        }
      }
    });

    if (signupError) {
      alert(signupError.message);
      return;
    }

    const userId = signupData.user?.id;

    if (userId) {
      await supabase
        .from("clients")
        .update({
          client_auth_id: userId,
          invite_status: "accepted"
        })
        .eq("id", client.id);
    }

    alert("Account created. Please check your email to confirm your account.");
    window.location.href = "/login";
  }

  if (loading) return <p>Loading invite...</p>;

  if (!client) {
    return <h1>Invalid or expired invite link</h1>;
  }

  return (
    <div style={{ padding: "40px", color: "white" }}>
      <h1>Create Your Client Account</h1>

      <p>
        Invite for: <strong>{client.client_email}</strong>
      </p>

      <form onSubmit={handleCreateAccount}>
        <input
          type="password"
          placeholder="Create password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" style={{ marginLeft: "8px" }}>
          Create Account
        </button>
      </form>
    </div>
  );
}
