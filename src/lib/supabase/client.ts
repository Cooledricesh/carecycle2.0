import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates and returns a new Supabase client instance using environment configuration.
 *
 * The client is initialized with the Supabase URL and publishable key from environment variables.
 * @returns A Supabase client instance configured for browser usage
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
