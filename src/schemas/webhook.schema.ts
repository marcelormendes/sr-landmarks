import { z } from 'zod'

import { BodyCoordinateSchema } from './coordinate-validation.schema'

export const WebhookSchema = BodyCoordinateSchema
export type Webhook = z.infer<typeof WebhookSchema>

export const WebhookRequestIdSchema = z
  .object({
    requestId: z.string().uuid('Request ID must be a valid UUID'),
  })
  .describe('webhook-request-id-schema')
export type WebhookRequestId = z.infer<typeof WebhookRequestIdSchema>
