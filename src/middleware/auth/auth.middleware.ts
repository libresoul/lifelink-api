import { AppEnv } from '@/types/app-env'
import { createClient } from '@supabase/supabase-js'
import type { Context, MiddlewareHandler } from 'hono'

export const getSupabase = (c: Context<AppEnv>) => {
  return c.get('supabase')
}

export const getUser = (c: Context<AppEnv>) => {
  return c.get('user')
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

export const requireAuth = (): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const accessToken = authHeader.substring(7).trim()
    if (!accessToken) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    const supabase = getSupabase(c)
    const { data, error } = await supabase.auth.getUser(accessToken)

    if (error || !data.user) {
      return c.json({ message: 'Invalid or expired token' }, 401)
    }

    c.set('accessToken', accessToken)
    c.set('user', data.user)

    await next()
  }
}
