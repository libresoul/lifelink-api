import { Hono } from 'hono'
import type { AppEnv } from '@/types/app-env'
import { getSupabase, getUser, requireAuth } from '@/middleware/auth/auth.middleware'

export const donorRoutes = new Hono<AppEnv>()

donorRoutes.use('/me', requireAuth())

donorRoutes.get('/me', async (c) => {
  const supabase = getSupabase(c)
  const userId = getUser(c).id

  const { data, error } = await supabase
    .from('donors')
    .select('full_name,email,phone_number,district,blood_type,gender,date_of_birth,weight_kg')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return c.json({ message: 'Failed to fetch donor profile' }, 500)
  }

  if (!data) {
    return c.json({ message: 'Donor not found' }, 404)
  }

  return c.json({ donor: data })
})
