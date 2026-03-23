import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '@/db'
import { creditCards, transactions } from '@/db/schema'
import { IdParams } from '@/types'

const createBody = z.object({
  name: z.string().min(1),
  card_limit: z.number().int().nonnegative(),
  closing_day: z.number().int().min(1).max(31),
  due_day: z.number().int().min(1).max(31),
})

const updateBody = createBody.partial()

const payBody = z.object({
  amount: z.number().int().positive(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function creditCardsRoutes(app: FastifyInstance) {
  app.post('/credit-cards', async (request, reply) => {
    const body = createBody.parse(request.body)
    const [card] = await db
      .insert(creditCards)
      .values({
        name: body.name,
        cardLimit: body.card_limit,
        closingDay: body.closing_day,
        dueDay: body.due_day,
      })
      .returning()
    return reply.status(201).send(card)
  })

  app.get('/credit-cards', async (_request, reply) => {
    const cards = await db.select().from(creditCards)
    return reply.send(cards)
  })

  app.put('/credit-cards/:id', async (request, reply) => {
    const { id } = request.params as IdParams
    const body = updateBody.parse(request.body)
    const [card] = await db
      .update(creditCards)
      .set({
        name: body.name,
        cardLimit: body.card_limit,
        closingDay: body.closing_day,
        dueDay: body.due_day,
        updatedAt: new Date(),
      })
      .where(eq(creditCards.id, Number(id)))
      .returning()
    if (!card) return reply.status(404).send({ message: 'Credit card not found' })
    return reply.send(card)
  })

  app.delete('/credit-cards/:id', async (request, reply) => {
    const { id } = request.params as IdParams
    const [card] = await db
      .delete(creditCards)
      .where(eq(creditCards.id, Number(id)))
      .returning()
    if (!card) return reply.status(404).send({ message: 'Credit card not found' })
    return reply.status(204).send()
  })

  app.post('/credit-cards/:id/pay', async (request, reply) => {
    const { id } = request.params as IdParams
    const body = payBody.parse(request.body)

    const [card] = await db
      .select()
      .from(creditCards)
      .where(eq(creditCards.id, Number(id)))
    if (!card) return reply.status(404).send({ message: 'Credit card not found' })

    const [transaction] = await db
      .insert(transactions)
      .values({
        description: `Invoice payment - ${card.name}`,
        amount: body.amount,
        category: 'payment',
        type: 'expense',
        status: 'completed',
        accountType: 'wallet',
        isRecurring: false,
        transactionDate: body.payment_date,
      })
      .returning()

    return reply.status(201).send(transaction)
  })
}
