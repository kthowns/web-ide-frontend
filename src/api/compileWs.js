// src/api/compileWs.js
import { getAccessToken } from "../auth/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://t2.mobidic.shop";

// ✅ http(s) baseURL에서 ws(s) URL로 변환 (path 안전 결합)
function toWsUrl(baseUrl, path) {
  const u = new URL(baseUrl);
  const wsProtocol = u.protocol === "https:" ? "wss:" : "ws:";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${wsProtocol}//${u.host}${normalizedPath}`;
}

/**
 * 브라우저 WebSocket은 handshake Authorization 헤더를 직접 못 넣음.
 * 1) 우선 query token (?token=) 방식으로 연결 시도
 * 2) (옵션) Sec-WebSocket-Protocol(subprotocol)로도 토큰 전달 시도
 *
 * ⚠️ 서버가 Authorization 헤더만 허용하면 프론트만으로 해결 불가:
 * - 서버가 query/subprotocol 허용하도록 변경 필요
 */
export function createCompileSocket({ onMessage, onOpen, onClose, onError }) {
  const token = getAccessToken();
  const wsBase = toWsUrl(BASE_URL, "/ws/compile");

  const url = token ? `${wsBase}?token=${encodeURIComponent(token)}` : wsBase;

  // ✅ subprotocol로도 토큰 전달(서버가 읽게 구현되어 있다면 성공)
  // 서버가 프로토콜 협상을 엄격히 하면 오히려 거부할 수 있어서 try-catch
  let ws;
  try {
    ws = token ? new WebSocket(url, [`bearer`, token]) : new WebSocket(url);
  } catch {
    ws = new WebSocket(url);
  }

  ws.onopen = () => onOpen?.();
  ws.onclose = (e) => onClose?.(e);
  ws.onerror = (e) => onError?.(e);

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      onMessage?.(msg);
    } catch {
      onMessage?.({ type: "output", stream: "stderr", data: String(evt.data) });
    }
  };

  return ws;
}

export function wsStart(ws, { code, language, params = [] }) {
  ws.send(
    JSON.stringify({
      type: "start",
      code,
      language, // "java" | "python"
      params,
    })
  );
}

export function wsInput(ws, data) {
  ws.send(JSON.stringify({ type: "input", data }));
}

export function wsStop(ws) {
  ws.send(JSON.stringify({ type: "stop" }));
}
