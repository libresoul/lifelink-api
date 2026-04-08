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

  const { data: lastDonationRow, error: lastDonationError } = await supabase
    .from('donation_records')
    .select('donated_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('donated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastDonationError) {
    return c.json({ message: 'Failed to fetch donation history' }, 500)
  }

  const { count: totalDonations, error: donationCountError } = await supabase
    .from('donation_records')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')

  if (donationCountError) {
    return c.json({ message: 'Failed to fetch donation stats' }, 500)
  }

  const today = startOfUtcDay(new Date())
  const cycleDays = 90
  const lastDonationDate = lastDonationRow?.donated_at ?? null

  let nextEligibleDate: string | null = null
  let remainingDays = 0
  let eligibilityProgress = 1

  if (lastDonationDate) {
    const lastDonationUtc = startOfUtcDay(new Date(lastDonationDate))
    const nextEligibleUtc = addUtcDays(lastDonationUtc, cycleDays)
    nextEligibleDate = toIsoDate(nextEligibleUtc)

    const rawRemaining = Math.ceil((nextEligibleUtc.getTime() - today.getTime()) / 86400000)
    remainingDays = Math.max(0, rawRemaining)

    const elapsed = cycleDays - remainingDays
    eligibilityProgress = Math.max(0, Math.min(1, elapsed / cycleDays))
  }

  return c.json({
    donor: {
      ...data,
      stats: {
        total_donations: totalDonations ?? 0,
        last_donation_date: lastDonationDate,
        next_eligible_date: nextEligibleDate,
        remaining_days: remainingDays,
        eligibility_progress: eligibilityProgress,
      },
    },
  })
})

const startOfUtcDay = (date: Date) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

const addUtcDays = (date: Date, days: number) => {
  const out = new Date(date)
  out.setUTCDate(out.getUTCDate() + days)
  return out
}

const toIsoDate = (date: Date) => {
  return date.toISOString().split('T')[0]
}
