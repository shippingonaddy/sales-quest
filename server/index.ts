import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import salesQuestApi from './api/sales-quest'

const app = new Hono()

// CORS middleware
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Clerk-Token', 'X-Zo-Client-Auth'],
  credentials: true,
}))

// API routes
app.route('/api/sales-quest', salesQuestApi)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './dist' }))
}

const port = parseInt(process.env.PORT || "3001", 10)

Bun.serve({
  port,
  fetch: app.fetch,
})

console.log(`🚀 Server running at http://localhost:${port}`)
console.log(`📊 API endpoint: http://localhost:${port}/api/sales-quest`)
console.log(`🏥 Health check: http://localhost:${port}/health`)
