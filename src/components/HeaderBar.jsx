function HeaderBar({
  onToggleLeft,
  onToggleRight,
  onToggleTerminal,
  onRun,
  onStop,
  onSave,
  isRunDisabled,
  isStopDisabled,
  isSaveDisabled,
  runDisabledReason,
  onLogout,
  user,
}) {
  return (
    <header className="headerbar">
      {/* Left side */}
      <div className="headerbar-left">
        <button onClick={onToggleLeft}>Left</button>
        <button onClick={onToggleRight}>Right</button>
        <button onClick={onToggleTerminal}>Terminal</button>

        {onRun && (
          <button onClick={onRun} disabled={isRunDisabled}>
            Run
          </button>
        )}
        {onStop && (
          <button onClick={onStop} disabled={isStopDisabled}>
            Stop
          </button>
        )}
        {onSave && (
          <button onClick={onSave} disabled={isSaveDisabled}>
            Save
          </button>
        )}
        {runDisabledReason && (
          <span className="headerbar-hint">{runDisabledReason}</span>
        )}
      </div>

      {/* Right side */}
      <div className="headerbar-right">
        {user && (
          <div className="profile">
            <div className="profile-avatar">U</div>
            <span className="profile-name">{user.name}</span>
          </div>
        )}

        {onLogout && (
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        )}
      </div>
    </header>
  );
}

export default HeaderBar;
