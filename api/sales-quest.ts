import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import salesQuestApi from '../server/api/sales-quest'

// Mirror server/index.ts: mount the subrouter at the same path Vercel routes to it.
// Hono receives the full path (/api/sales-quest) from Vercel; without this wrapper
// the subrouter's routes (defined at '/') never match.
const app = new Hono()
app.route('/api/sales-quest', salesQuestApi)

export const config = { runtime: 'edge' }
export default handle(app)
