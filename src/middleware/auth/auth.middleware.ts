import { AppEnv } from '@/types/app-env'
import { createClient } from '@supabase/supabase-js'
import type { Context, MiddlewareHandler } from 'hono'

export const getSupabase = (c: Context<AppEnv>) => {
  return c.get('supabase')
}

export const supabaseMiddleware = (): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const supabaseUrl = c.env.SUPABASE_URL
    const supabaseAnonKey = c.env.SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl) {
      return c.json({ error: 'SUPABASE_URL missing!' }, 500)
    }

    if (!supabaseAnonKey) {
      return c.json({ error: 'SUPABASE_PUBLISHABLE_KEY missing!' }, 500)
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    c.set('supabase', client)

    await next()
  }
}
