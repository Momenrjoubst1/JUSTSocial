import { supabase } from "@/lib/supabaseClient";

async function getFreshAccessToken() {
  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error) {
      session = data.session;
    }
  }

  return session?.access_token ?? null;
}

export async function getAssistantAuthHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  const token = await getFreshAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

export async function assistantFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  let headers = await getAssistantAuthHeaders(init.headers);
  let response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.access_token) {
      headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${data.session.access_token}`);
      response = await fetch(input, { ...init, headers });
    }
  }

  return response;
}
