/**
 * 智谱 API JWT token 生成器
 * --------------------------------
 * 智谱 API v4 的某些 key 不能直接用 Bearer <api_key>，
 * 需要先用 api_key 的 secret 部分做 HS256 签名生成 JWT token，
 * 再用 Bearer <jwt_token> 发请求。
 *
 * 算法（来自 zhipuai Python SDK 的 core/_jwt_token.py）：
 * 1. api_key 格式为 "id.secret"，拆分得到 id 和 secret
 * 2. payload = { api_key: id, exp: now + 3.5min, timestamp: now }
 * 3. 用 secret 做 HS256 签名，header = { alg: "HS256", sign_type: "SIGN" }
 * 4. 返回 JWT 字符串
 */

import crypto from "crypto";

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 分钟
const TOKEN_TTL_MS = CACHE_TTL_MS + 30 * 1000; // 比 cache 多 30 秒

let cachedToken: { token: string; exp: number } | null = null;

/**
 * 用智谱 API Key 生成 JWT token。
 * @param apiKey 智谱 API Key，格式 "id.secret"
 * @returns JWT token 字符串
 */
export function generateZhipuToken(apiKey: string): string {
  // 命中缓存（3 分钟内有效）
  if (cachedToken && Date.now() < cachedToken.exp) {
    return cachedToken.token;
  }

  const [id, secret] = apiKey.split(".");
  if (!id || !secret) {
    throw new Error("Invalid Zhipu API key format (expected 'id.secret')");
  }

  const now = Date.now();
  const payload = {
    api_key: id,
    exp: now + TOKEN_TTL_MS,
    timestamp: now,
  };

  const header = { alg: "HS256", sign_type: "SIGN" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const token = `${data}.${signature}`;

  // 缓存 3 分钟
  cachedToken = { token, exp: now + CACHE_TTL_MS };
  return token;
}

/** Base64Url 编码（无 padding） */
function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
