import { z } from 'zod'
import { UUID_REGEX } from '../constants'

export const UuidSchema = z.string().refine(
  (val) => {
    const result = UUID_REGEX.test(val)
    return result
  },
  {
    message: 'Request ID must be a valid UUID',
    path: ['uuid'],
  },
)

export const WebhookSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(100).max(10000).optional(),
})

export type Webhook = z.infer<typeof WebhookSchema>

export const WebhookRequestIdSchema = z
  .object({
    requestId: z.string().uuid('Request ID must be a valid UUID'),
  })
  .describe('webhook-request-id-schema')
export type WebhookRequestId = z.infer<typeof WebhookRequestIdSchema>

export type Uuid = z.infer<typeof UuidSchema>
