// src/components/ChatPanel.jsx
import { useEffect, useRef, useState } from "react";
import { getActiveProject, getLocalUser } from "../auth/auth";
import { createChatClient, sendChat } from "../ws/chatStomp";

export default function ChatPanel({ roomId: roomIdProp }) {
  const project = getActiveProject();
  const roomId = roomIdProp ?? project?.id; // ✅ prop 우선, 없으면 fallback
  const user = getLocalUser();

  const [messages, setMessages] = useState([
    { id: 1, author: "system", text: "TEAM CHAT (실시간)" },
  ]);
  const [input, setInput] = useState("");

  const listRef = useRef(null);
  const clientRef = useRef(null);

  const pendingIdsRef = useRef(new Set());
  const composingRef = useRef(false);
  const sendingLockRef = useRef(false);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (!roomId) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          author: "system",
          text: "roomId가 없습니다(프로젝트 선택 필요)",
        },
      ]);
      return;
    }

    const client = createChatClient({
      roomId,
      onConnected: () => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            author: "system",
            text: "채팅 서버에 연결되었습니다.",
          },
        ]);
      },
      onMessage: (msg) => {
        if (!msg) return;

        const incomingClientMsgId = msg.clientMsgId;
        if (
          incomingClientMsgId &&
          pendingIdsRef.current.has(incomingClientMsgId)
        ) {
          pendingIdsRef.current.delete(incomingClientMsgId);
          return;
        }

        const author =
          msg.username ?? msg.author ?? `user:${msg.userId ?? "?"}`;
        const text = msg.content ?? msg.message ?? JSON.stringify(msg);

        setMessages((prev) => [...prev, { id: Date.now(), author, text }]);
      },
      onError: (err) => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            author: "system",
            text: `❌ 채팅 오류: ${String(err?.message ?? err)}`,
          },
        ]);
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      try {
        client.deactivate();
      } catch {}
      clientRef.current = null;
    };
  }, [roomId]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const client = clientRef.current;
    if (!client || !client.connected) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          author: "system",
          text: "아직 채팅 서버에 연결되지 않았습니다.",
        },
      ]);
      return;
    }

    const clientMsgId =
      String(Date.now()) + "-" + Math.random().toString(16).slice(2);

    setMessages((prev) => [...prev, { id: Date.now(), author: "me", text }]);
    pendingIdsRef.current.add(clientMsgId);

    const payload = {
      roomId,
      content: text,
      userId: user?.id ?? null,
      username: user?.id ?? "me",
      clientMsgId,
    };

    setInput("");
    sendChat(client, roomId, payload);
  };

  const onKeyDown = (e) => {
    if (e.isComposing || composingRef.current) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (sendingLockRef.current) return;
      sendingLockRef.current = true;

      handleSend();

      setTimeout(() => {
        sendingLockRef.current = false;
      }, 150);
    }
  };

  return (
    <div
      className="chat-root"
      style={{
        height: "100%",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        minHeight: 0,
      }}
    >
      <div className="chat-header">
        TEAM CHAT{" "}
        <span style={{ opacity: 0.7, fontSize: 12 }}>
          room: {roomId ?? "(none)"}
        </span>
      </div>

      <div
        className="chat-list"
        ref={listRef}
        style={{ overflow: "auto", minHeight: 0, padding: 12 }}
      >
        {messages.map((m) => {
          const isMe = m.author === "me";
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isMe ? "flex-end" : "flex-start",
                gap: 4,
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {isMe ? "Me" : m.author}
              </div>
              <div
                style={{
                  maxWidth: "85%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: isMe
                    ? "rgba(59,130,246,0.35)"
                    : "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, padding: 10 }}>
        <textarea
          placeholder="메시지를 입력하세요... (Enter 전송 / Shift+Enter 줄바꿈)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onCompositionStart={() => (composingRef.current = true)}
          onCompositionEnd={() => (composingRef.current = false)}
          onKeyDown={onKeyDown}
          rows={2}
          style={{
            flex: 1,
            resize: "none",
            padding: 12,
            borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "white",
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          style={{
            width: 90,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(59,130,246,0.75)",
            color: "white",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
