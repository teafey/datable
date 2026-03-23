import { createClient } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (typeof window === "undefined" && !supabaseServiceKey) {
  console.warn(
    "[datatable-app] SUPABASE_SERVICE_ROLE_KEY not set — server actions will use anon key (RLS enforced)."
  )
}

// Client-side Supabase client (uses anon key, respects RLS)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Disable automatic token refresh on tab visibility change
if (typeof window !== "undefined") {
  supabase.auth.stopAutoRefresh()
}

// Server-side Supabase client (uses service role, bypasses RLS)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Auth helper functions
export const auth = {
  async signInWithEmail(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password })
  },

  async signInWithGoogle(inviteToken?: string) {
    const redirectUrl = new URL(`${window.location.origin}/auth/callback`)
    if (inviteToken) {
      redirectUrl.searchParams.set("invite_token", inviteToken)
    }
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl.toString() },
    })
  },

  async signUp(email: string, password: string) {
    return supabase.auth.signUp({ email, password })
  },

  async signOut() {
    return supabase.auth.signOut()
  },

  async resetPassword(email: string) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  },

  async updatePassword(newPassword: string) {
    return supabase.auth.updateUser({ password: newPassword })
  },

  async getSession() {
    return supabase.auth.getSession()
  },

  async getUser() {
    return supabase.auth.getUser()
  },
}
