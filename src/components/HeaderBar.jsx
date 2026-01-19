export default function HeaderBar({
  onToggleLeft,
  onToggleRight,
  onToggleTerminal,

  onRun,
  onStop,
  onSave,

  isRunDisabled = false,
  isStopDisabled = true,
  isSaveDisabled = false,
  runDisabledReason = "",

  onLogout,
  user,
}) {
  return (
    <header
      className="headerbar"
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" onClick={onToggleLeft}>
          Left
        </button>
        <button type="button" onClick={onToggleRight}>
          Right
        </button>
        <button type="button" onClick={onToggleTerminal}>
          Terminal
        </button>

        <div style={{ width: 10 }} />

        <button type="button" onClick={onRun} disabled={isRunDisabled}>
          Run
        </button>

        <button type="button" onClick={onStop} disabled={isStopDisabled}>
          Stop
        </button>

        <button type="button" onClick={onSave} disabled={isSaveDisabled}>
          Save
        </button>
        {runDisabledReason && (
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            {runDisabledReason}
          </span>
        )}
      </div>

      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        {user && (
          <div
            className="profile"
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <div className="profile-avatar">👤</div>
            <span className="profile-name">
              {user.name ?? user.id ?? "User"}
            </span>
          </div>
        )}

        {onLogout && (
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
