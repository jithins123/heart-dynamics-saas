import LogoutButton from "./LogoutButton";

export default function AppHeader({ title = "Heart Dynamics" }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 24px",
      borderBottom: "1px solid rgba(255,255,255,.08)",
      color: "white"
    }}>
      <div>
        <strong>{title}</strong>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <a href="/dashboard" style={{ color: "white" }}>Dashboard</a>
        <a href="/client-app" style={{ color: "white" }}>Client App</a>
        <a href="/app" style={{ color: "white" }}>Heart App</a>
        <LogoutButton />
      </div>
    </div>
  );
}
