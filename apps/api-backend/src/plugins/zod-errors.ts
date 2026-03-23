import type { FastifyError } from 'fastify'
import fp from 'fastify-plugin'
import { ZodError } from 'zod'

export const zodErrorsPlugin = fp(async (app) => {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: 'Validation error',
        issues: error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      })
    }

    reply.status((error as FastifyError).statusCode ?? 500).send({ message: 'Internal server error' })
  })
})