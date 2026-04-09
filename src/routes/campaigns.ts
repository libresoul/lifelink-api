import { Hono } from 'hono'
import type { AppEnv } from '@/types/app-env'
import { getSupabase } from '@/middleware/auth/auth.middleware'

export const campaignRoutes = new Hono<AppEnv>()

// GET /api/campaigns - public listing of active campaigns
campaignRoutes.get('/', async (c) => {
  const supabase = getSupabase(c)

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('active', true)
    .order('start_ts', { ascending: false })

  if (error) {
    return c.json({ message: 'Failed to fetch campaigns' }, 500)
  }

  return c.json({ campaigns: data ?? [] })
})
