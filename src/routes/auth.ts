import { Hono } from "hono";
import type { AppEnv } from "@/types/app-env";
import { getSupabase } from "@/middleware/auth/auth.middleware";
import * as z from 'zod'

export const authRoutes = new Hono<AppEnv>()

const registrationSchema = z.object({
  fullname: z.string().min(3, 'Full Name is required'),
  email: z.email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

authRoutes.post('/register', async (c) => {
  const supabase = getSupabase(c)
  const payload = await c.req.json()

  try {
    const validated = registrationSchema.safeParse(payload)

    if (!validated.success) {
      return c.json(
        { message: `Invalid registration data: ${z.prettifyError(validated.error)}` },
        400,
      )
    }

    const { data: authData, error } = await supabase.auth.signUp({
      email: validated.data.email,
      password: validated.data.password,
      options: {
        emailRedirectTo: undefined,
        data:
          { fullname: validated.data.fullname, email: validated.data.email }
      }
    })

    if (error) {
      console.log(error)
      return c.json({ message: error.message }, 400)
    }

    if (!authData.user) {
      return c.json({ message: 'Registration failed' }, 500)
    }

    if (!authData.user.identities || authData.user.identities.length === 0) {
      return c.json({ message: 'Email is already registered' }, 409)
    }

    const userId = authData.user.id

    const { data, error: donorError } = await supabase
      .from('donors')
      .insert({
        user_id: userId,
        full_name: validated.data.fullname,
        email: validated.data.email
      })

    console.log(`Donor data: ${data}, error: ${donorError?.message}`)

    return donorError
      ? c.json({ message: 'Registration failed' }, 500)
      : c.json({ message: 'Registration successfull' })


  } catch (authError) {
    const message = authError instanceof Error ? authError.message : 'Unexpected error'
    return c.json({ message: `Error while signing up: ${message}` }, 500)
  }

})
