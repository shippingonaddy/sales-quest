import { handle } from 'hono/vercel'
import app from '../server/api/sales-quest'

export const config = { runtime: 'edge' }

export default handle(app)
