import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";
import { requireSupabaseConfig } from "@/lib/supabase/config";

/**
 * Creates a Supabase client for server-side usage.
 * This should be used in Server Components, Server Actions, and Route Handlers.
 *
 * @returns Supabase client configured for server-side usage
 *
 * @example
 * // In a Server Component
 * import { createClient } from "@/lib/supabase/server";
 *
 * export default async function MyComponent() {
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   return <div>{user?.email}</div>;
 * }
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabaseConfig();

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
