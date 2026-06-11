import { supabase } from "../lib/supabase";

export default function LogoutButton() {
  async function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to log out?"
    );

    if (!confirmed) return;

    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button className="logout-btn" onClick={handleLogout}>
      <span>Logout</span>
    </button>
  );
}
