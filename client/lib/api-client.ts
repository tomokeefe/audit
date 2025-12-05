/**
 * API client utility for backend communication
 * Uses Fly.io backend by default, with fallback to local API
 */

const getApiBaseUrl = (): string => {
  // Use environment variable if set (Fly.io backend)
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (backendUrl) {
    return backendUrl;
  }

  // Fallback to relative paths for local development
  return "";
};

export const apiBaseUrl = getApiBaseUrl();

export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<Response> {
  const url = `${apiBaseUrl}${endpoint}`;

  console.log(`API call to: ${url}`);

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

export async function apiGet<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await apiCall(endpoint);
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${error}`);
    return null;
  }
}

export async function apiPost<T>(
  endpoint: string,
  data: any,
): Promise<T | null> {
  try {
    const response = await apiCall(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${error}`);
    return null;
  }
}
