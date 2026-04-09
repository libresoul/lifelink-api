import { Hono } from 'hono'
import type { AppEnv } from '@/types/app-env'
import { getSupabase, getUser, requireAuth } from '@/middleware/auth/auth.middleware'
import * as z from 'zod'

export const donationRoutes = new Hono<AppEnv>()

// Require auth for donation endpoints
donationRoutes.use('*', requireAuth())

const createDonationSchema = z.object({
  volume_ml: z.number().int().min(1).max(10000),
  donated_at: z.string().optional(),
  location: z.string().max(255).optional(),
  campaign_name: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
})

// POST /api/donations - create a donation record
donationRoutes.post('/', async (c) => {
  const supabase = getSupabase(c)
  const user = getUser(c)

  const payload = await c.req.json()

  try {
    const validated = createDonationSchema.safeParse(payload)
    if (!validated.success) {
      return c.json({ message: `Invalid donation payload: ${z.prettifyError(validated.error)}` }, 400)
    }

    // ensure donor exists for this user; if not, create one
    const { data: existingDonor, error: donorErr } = await supabase
      .from('donors')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (donorErr) {
      return c.json({ message: 'Failed to lookup donor' }, 500)
    }

    let donorId = existingDonor?.id

    if (!donorId) {
      const { data: newDonor, error: createDonorErr } = await supabase
        .from('donors')
        .insert({ user_id: user.id, full_name: user.user_metadata?.fullname ?? null, email: user.email })
        .select('id')
        .maybeSingle()

      if (createDonorErr) {
        return c.json({ message: 'Failed to create donor record' }, 500)
      }

      if (!newDonor) {
        return c.json({ message: 'Failed to create donor record' }, 500)
      }

      donorId = newDonor.id
    }

    const insertPayload: any = {
      user_id: user.id,
      donor_id: donorId,
      volume_ml: validated.data.volume_ml,
      location: validated.data.location ?? null,
      campaign_name: validated.data.campaign_name ?? null,
      notes: validated.data.notes ?? null,
      status: 'completed',
    }

    if (validated.data.donated_at) {
      insertPayload.donated_at = validated.data.donated_at
    }

    const { data: inserted, error: insertError } = await supabase
      .from('donation_records')
      .insert(insertPayload)
      .select('*')
      .maybeSingle()

    if (insertError) {
      console.error('Insert donation error', insertError)
      return c.json({ message: 'Failed to create donation record' }, 500)
    }

    return c.json({ donation: inserted })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return c.json({ message: `Error creating donation: ${message}` }, 500)
  }
})

// GET /api/donations - list donations for current user
donationRoutes.get('/', async (c) => {
  const supabase = getSupabase(c)
  const user = getUser(c)

  const { data, error } = await supabase
    .from('donation_records')
    .select('*')
    .eq('user_id', user.id)
    .order('donated_at', { ascending: false })

  if (error) {
    return c.json({ message: 'Failed to fetch donations' }, 500)
  }

  return c.json({ donations: data ?? [] })
})
