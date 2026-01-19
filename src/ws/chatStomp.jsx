// src/ws/chatStomp.js
import { Client } from "@stomp/stompjs";
import { getAccessToken } from "../auth/auth";

// http(s) baseURL -> ws(s) url
function toWsUrl(baseUrl, path) {
  const u = new URL(baseUrl);
  const wsProtocol = u.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${u.host}${path}`;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://t2.mobidic.shop";

/**
 * 백엔드가 알려준 명세
 * - WebSocket 접속: /ws-chat
 * - 전송: /app/chat/{roomId}
 * - 수신: /topic/chat/{roomId}
 */
export function createChatClient({ roomId, onConnected, onMessage, onError }) {
  const token = getAccessToken();

  // ✅ STOMP가 사용할 실제 WebSocket URL
  // 1) STOMP CONNECT frame에 Authorization 넣기 (서버가 이 방식 허용하면 OK)
  // 2) 혹시 서버가 query token 방식만 받는 경우 대비해서 token도 query로 붙여줌(안 받으면 무시됨)
  const wsUrlBase = toWsUrl(BASE_URL, "/ws-chat");
  const wsUrl = token
    ? `${wsUrlBase}?token=${encodeURIComponent(token)}`
    : wsUrlBase;

  const client = new Client({
    brokerURL: wsUrl,
    reconnectDelay: 1500,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    // ✅ STOMP CONNECT frame header (브라우저 WS handshake 헤더가 아님)
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},

    debug: () => {},

    onConnect: () => {
      onConnected?.();

      // ✅ 구독
      const topic = `/topic/chat/${roomId}`;
      client.subscribe(topic, (frame) => {
        try {
          const body = frame.body ? JSON.parse(frame.body) : null;
          onMessage?.(body);
        } catch (e) {
          onMessage?.({ content: frame.body });
        }
      });
    },

    onStompError: (frame) => {
      onError?.(frame?.headers?.message ?? frame?.body ?? "STOMP error");
    },

    onWebSocketError: (evt) => {
      onError?.(evt);
    },
  });

  return client;
}

export function sendChat(client, roomId, payload) {
  if (!client?.connected) return;

  const dest = `/app/chat/${roomId}`;
  client.publish({
    destination: dest,
    body: JSON.stringify(payload),
  });
}
