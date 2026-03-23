import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { CATEGORIES } from '../config/categories.js'
import { ACCOUNT_TYPES, TRANSACTION_TYPES } from '../config/enums.js'
import * as recurringRulesService from '../services/recurring-rules.js'

const createBody = z.object({
  description: z.string().min(1),
  amount: z.number().int().positive(),
  category: z.enum(CATEGORIES),
  type: z.enum(TRANSACTION_TYPES),
  account_type: z.enum(ACCOUNT_TYPES),
  day_of_month: z.number().int().min(1).max(31),
})

const updateBody = createBody.partial()

export async function recurringRulesRoutes(app: FastifyInstance) {
  app.post('/recurring-rules', async (request, reply) => {
    const body = createBody.parse(request.body)
    const rule = await recurringRulesService.createRule({
      description: body.description,
      amount: body.amount,
      category: body.category,
      type: body.type,
      accountType: body.account_type,
      dayOfMonth: body.day_of_month,
    })
    return reply.status(201).send(rule)
  })

  app.get('/recurring-rules', async (_request, reply) => {
    const rules = await recurringRulesService.listRules()
    return reply.send(rules)
  })

  app.put('/recurring-rules/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateBody.parse(request.body)
    const rule = await recurringRulesService.updateRule(Number(id), {
      description: body.description,
      amount: body.amount,
      category: body.category,
      type: body.type,
      accountType: body.account_type,
      dayOfMonth: body.day_of_month,
    })
    if (!rule) return reply.status(404).send({ message: 'Recurring rule not found' })
    return reply.send(rule)
  })

  app.delete('/recurring-rules/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const rule = await recurringRulesService.deleteRule(Number(id))
    if (!rule) return reply.status(404).send({ message: 'Recurring rule not found' })
    return reply.status(204).send()
  })

  app.patch('/recurring-rules/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string }
    const rule = await recurringRulesService.activateRule(Number(id))
    if (!rule) return reply.status(404).send({ message: 'Recurring rule not found' })
    return reply.send(rule)
  })

  app.patch('/recurring-rules/:id/deactivate', async (request, reply) => {
    const { id } = request.params as { id: string }
    const rule = await recurringRulesService.deactivateRule(Number(id))
    if (!rule) return reply.status(404).send({ message: 'Recurring rule not found' })
    return reply.send(rule)
  })
}
