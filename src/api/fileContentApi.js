// src/api/fileContentApi.js
import axios from "axios";
import { getAccessToken } from "../auth/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://t2.mobidic.shop";

function authHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const fileContentApi = {
  // ✅ Swagger: GET /api/file-contents/file/{fileId}
  async getLatest(fileId) {
    const res = await axios.get(
      `${BASE_URL}/api/file-contents/file/${fileId}`,
      {
        headers: authHeaders(),
      }
    );
    return res.data;
  },

  // ✅ Swagger: GET /api/file-contents/file/{fileId}/version/{version}
  async getByVersion(fileId, version) {
    const res = await axios.get(
      `${BASE_URL}/api/file-contents/file/${fileId}/version/${version}`,
      { headers: authHeaders() }
    );
    return res.data;
  },

  // ✅ Swagger: GET /api/file-contents/file/{fileId}/history
  async getHistory(fileId) {
    const res = await axios.get(
      `${BASE_URL}/api/file-contents/file/${fileId}/history`,
      { headers: authHeaders() }
    );
    return res.data;
  },

  // ✅ Swagger: POST /api/file-contents  body: { fileId, content }
  async save(fileId, content) {
    const res = await axios.post(
      `${BASE_URL}/api/file-contents`,
      { fileId, content },
      { headers: authHeaders() }
    );
    return res.data;
  },
};
