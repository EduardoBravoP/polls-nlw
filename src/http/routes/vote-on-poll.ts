import {z} from "zod"
import { prisma } from "../../lib/prisma"
import { FastifyInstance } from "fastify"
import { randomUUID } from "crypto"

export async function voteOnPoll(app: FastifyInstance) {
  app.post('/polls/:pollId/votes', async (request, reply) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid(),
    })

    const voteOnPollParams = z.object({
      pollId: z.string().uuid()
    })
  
    const { pollId } = voteOnPollParams.parse(request.params)
    const { pollOptionId } = voteOnPollBody.parse(request.body)

    let { sessionId } = request.cookies

    const parsedSessionId = sessionId?.split('.')[0]

    if (parsedSessionId) {
      const userAlreadyVotedOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId: parsedSessionId,
            pollId
          }
        }
      })

      if (userAlreadyVotedOnPoll && userAlreadyVotedOnPoll.pollOptionId !== pollOptionId) {
        await prisma.vote.delete({
          where: {
            id: userAlreadyVotedOnPoll.id
          }
        })
      } else if (userAlreadyVotedOnPoll) {
        return reply.status(400).send({ message: 'You already voted on this poll' })
      }
    }

    if (!sessionId) {
      sessionId = randomUUID()

      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        signed: true,
        httpOnly: true
      })
    }

    await prisma.vote.create({
      data: {
        sessionId: sessionId.split('.')[0],
        pollId,
        pollOptionId
      }
    })

    return reply.status(201).send({ sessionId })
  })
}