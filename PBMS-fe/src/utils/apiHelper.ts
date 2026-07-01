import { ApiResponse } from "../services/authService"; // Import any shared type if needed, or define here.

/**
 * Utility function to handle fetch responses safely, avoiding JSON parse errors
 * when the server returns empty bodies or plain text.
 */
export async function safeJson<T>(response: Response): Promise<T> {
  try {
    const text = await response.text();
    if (!text || text.trim() === "") {
      return {} as T;
    }
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn("safeJson: failed to parse response body", e);
    return {} as T;
  }
}

/**
 * Utility function to handle fetch responses safely, avoiding JSON parse errors
 * when the server returns empty bodies or plain text.
 */
export async function handleResponse<T>(response: Response): Promise<T> {
  let data: any = null;
  const contentType = response.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch (e) {
      // JSON parse error, ignore and fallback to checking response.ok
      console.warn("JSON parse error despite application/json content-type", e);
    }
  } else {
    try {
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          // It's just plain text
          data = { message: text };
        }
      }
    } catch (e) {
      // Ignore text parse errors
    }
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || response.statusText || "Có lỗi xảy ra khi kết nối máy chủ.";
    throw new Error(errorMsg);
  }

  // Assuming most APIs return wrapped data, but return raw if not
  return data as T;
}
