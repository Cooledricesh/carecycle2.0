import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates and returns a Supabase server client configured for SSR in a Next.js environment, with cookie management enabled.
 *
 * The client uses the current request's cookies for authentication and session management. Errors encountered while setting cookies are silently ignored, as they may occur in certain server-side contexts.
 *
 * @returns A Supabase server client instance with cookie support
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Creates and returns a Supabase server client that does not interact with cookies.
 *
 * This client is configured for server-side environments where cookie management is unnecessary or undesired.
 * The Supabase URL and secret key are sourced from environment variables.
 *
 * @returns A Supabase server client instance with disabled cookie handling
 */
export async function createPureClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}
