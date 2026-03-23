import fastify from 'fastify'
import { processRecurrences } from '@/services/recurring-rules'
import { transactionsRoutes } from '@/routes/transactions'
import { recurringRulesRoutes } from '@/routes/recurring-rules'
import { summaryRoutes } from '@/routes/summary'
import { creditCardsRoutes } from '@/routes/credit-cards'
import { zodErrorsPlugin } from '@/plugins/zod-errors'

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

app.register(zodErrorsPlugin)

app.register(transactionsRoutes)
app.register(recurringRulesRoutes)
app.register(summaryRoutes)
app.register(creditCardsRoutes)

app.listen({ port: 3333, host: '0.0.0.0' })
  .then(async (address: string) => {
    console.log(`API runing ${address} 💶`)
    await processRecurrences()
  })
  .catch((err: Error) => {
    console.error('Error for start conta-ai :', err)
    process.exit(1)
  })
