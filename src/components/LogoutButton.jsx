import { supabase } from "../lib/supabase";

export default function LogoutButton() {
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return <button onClick={handleLogout}>Logout</button>;
}
