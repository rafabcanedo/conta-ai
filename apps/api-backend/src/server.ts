import fastify from 'fastify'
import { processRecurrences } from './services/recurring-rules.js'

const app = fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
    },
  },
})

app.get('/ping', async () => {
  return { message: 'pong', timestamp: new Date().toISOString() }
})

app.listen({ port: 3333, host: '0.0.0.0' })
  .then(async (address: string) => {
    console.log(`API runing ${address} 💶`)
    await processRecurrences()
  })
  .catch((err: Error) => {
    console.error('Error for start conta-ai :', err)
    process.exit(1)
  })
