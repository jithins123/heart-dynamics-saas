import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup(e) {
    e.preventDefault();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "practitioner"
        }
      }
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Check your email to confirm your account.");
  }

  return (
    <form onSubmit={handleSignup}>
      <h1>Practitioner Sign Up</h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">Create Account</button>
    </form>
  );
}
