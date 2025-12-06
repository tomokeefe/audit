/**
 * API client utility for backend communication
 * Uses Fly.io Express server for all API calls via relative paths
 */

const getApiBaseUrl = (): string => {
  // Always use relative paths - Express server handles /api/* routes
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
