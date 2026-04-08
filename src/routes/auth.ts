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

const donorDetailsSchema = z.object({
  userId: z.uuid('Invalid userId'),
  phoneNumber: z.string().regex(/^\+?[0-9]{9,12}$/, 'Enter a valid phone number'),
  district: z.enum([
    "Ampara",
    "Anuradhapura",
    "Badulla",
    "Batticaloa",
    "Bexley",
    "Colombo",
    "Galle",
    "Gampaha",
    "Hambantota",
    "Jaffna",
    "Kalutara",
    "Kandy",
    "Kegalle",
    "Kilinochchi",
    "Kurunegala",
    "Matale",
    "Matara",
    "Monaragala",
    "Mullaitivu",
    "Nuwara Eliya",
    "Polonnaruwa",
    "Puttalam",
    "Ratnapura",
    "Trincomalee",
    "Vavuniya",
    "Hambanthota"
  ]),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  gender: z.enum(['Male', 'Female', 'Other']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  weightKg: z.coerce.number().gte(50, 'Minimum 50kg required')
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
      : c.json({ message: 'Registration successfull', userId })


  } catch (authError) {
    const message = authError instanceof Error ? authError.message : 'Unexpected error'
    return c.json({ message: `Error while signing up: ${message}` }, 500)
  }

})

authRoutes.post('/register/details', async (c) => {
  const supabase = getSupabase(c)
  const payload = await c.req.json()

  try {
    const validated = donorDetailsSchema.safeParse(payload)

    if (!validated.success) {
      return c.json(
        { message: `Invalid donor details: ${z.prettifyError(validated.error)}` },
        400,
      )
    }

    const { data: updatedDonor, error } = await supabase
      .from('donors')
      .update({
        phone_number: validated.data.phoneNumber,
        district: validated.data.district,
        blood_type: validated.data.bloodType,
        gender: validated.data.gender,
        date_of_birth: validated.data.dateOfBirth,
        weight_kg: validated.data.weightKg,
      })
      .eq('user_id', validated.data.userId)
      .select('id')
      .maybeSingle()

    if (error) {
      return c.json({ message: 'Failed to update donor details' }, 500)
    }

    if (!updatedDonor) {
      return c.json({ message: 'Donor not found' }, 404)
    }

    return c.json({ message: 'Donor details updated successfully' })
  } catch (detailsError) {
    const message = detailsError instanceof Error ? detailsError.message : 'Unexpected error'
    return c.json({ message: `Error while updating donor details: ${message}` }, 500)
  }
})
