import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { CATEGORIES } from '../config/categories.js'
import { ACCOUNT_TYPES, TRANSACTION_STATUSES, TRANSACTION_TYPES } from '../config/enums.js'
import * as transactionService from '../services/transactions.js'

const createBody = z.object({
  description: z.string().min(1),
  amount: z.number().int().positive(),
  category: z.enum(CATEGORIES),
  type: z.enum(TRANSACTION_TYPES),
  account_type: z.enum(ACCOUNT_TYPES),
  status: z.enum(TRANSACTION_STATUSES),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const updateBody = createBody.partial()

const listQuery = z.object({
  type: z.enum(TRANSACTION_TYPES).optional(),
  account_type: z.enum(ACCOUNT_TYPES).optional(),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
})

export async function transactionsRoutes(app: FastifyInstance) {
  app.post('/transactions', async (request, reply) => {
    const body = createBody.parse(request.body)
    const transaction = await transactionService.createTransaction({
      description: body.description,
      amount: body.amount,
      category: body.category,
      type: body.type,
      accountType: body.account_type,
      status: body.status,
      transactionDate: body.transaction_date,
    })
    return reply.status(201).send(transaction)
  })

  app.get('/transactions', async (request, reply) => {
    const query = listQuery.parse(request.query)
    const result = await transactionService.listTransactions({
      type: query.type,
      accountType: query.account_type,
      status: query.status,
      month: query.month,
    })
    return reply.send(result)
  })

  app.get('/transactions/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const transaction = await transactionService.getTransactionById(Number(id))
    if (!transaction) return reply.status(404).send({ message: 'Transaction not found' })
    return reply.send(transaction)
  })

  app.put('/transactions/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateBody.parse(request.body)
    const transaction = await transactionService.updateTransaction(Number(id), {
      description: body.description,
      amount: body.amount,
      category: body.category,
      type: body.type,
      accountType: body.account_type,
      status: body.status,
      transactionDate: body.transaction_date,
    })
    if (!transaction) return reply.status(404).send({ message: 'Transaction not found' })
    return reply.send(transaction)
  })

  app.delete('/transactions/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const transaction = await transactionService.deleteTransaction(Number(id))
    if (!transaction) return reply.status(404).send({ message: 'Transaction not found' })
    return reply.status(204).send()
  })

  app.patch('/transactions/:id/confirm', async (request, reply) => {
    const { id } = request.params as { id: string }
    const transaction = await transactionService.confirmTransaction(Number(id))
    if (!transaction) return reply.status(404).send({ message: 'Transaction not found' })
    return reply.send(transaction)
  })
}
