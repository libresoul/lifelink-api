import { Hono } from 'hono'
import { AppEnv } from './types/app-env'
import { authRoutes } from './routes/auth'
import { donorRoutes } from './routes/donors'
import { donationRoutes } from './routes/donations'
import { supabaseMiddleware } from './middleware/auth/auth.middleware'
import { logger } from 'hono/logger'

const app = new Hono<AppEnv>().basePath('/api')

app.use(logger())
app.use('*', supabaseMiddleware())
app.route('/auth', authRoutes)
app.route('/donors', donorRoutes)
app.route('/donations', donationRoutes)

app.get('/', (c) => {
  return c.text('Hello Lifelink!')
})

export default app
