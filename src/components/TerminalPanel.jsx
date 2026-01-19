import { useEffect, useRef, useState } from "react";

function TerminalPanel({ lines, onSubmitCommand }) {
  const [input, setInput] = useState("");

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmitCommand?.(input);
    setInput("");
  };

  return (
    <div className="terminal-root">
      <div className="terminal-output">
        {lines.map((line, idx) => (
          <div key={idx} className="terminal-line">
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="terminal-inputRow" onSubmit={handleSubmit}>
        <span className="terminal-prompt">{">"}</span>
        <input
          className="terminal-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a command..."
          autoComplete="off"
        />
      </form>
    </div>
  );
}

export default TerminalPanel;
