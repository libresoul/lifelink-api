import { SupabaseClient, User } from "@supabase/supabase-js"

export type AppEnv = {
  Bindings: {
    SUPABASE_URL: string
    SUPABASE_PUBLISHABLE_KEY: string
  }
  Variables: {
    supabase: SupabaseClient
    user: User
  }
}
