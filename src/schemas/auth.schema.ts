import { z } from 'zod'

// Base coordinate validation for numbers
export const authSchema = z.object({
  apiKey: z.string().min(8, 'API key is required'),
})

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
})

export type TokenResponse = z.infer<typeof TokenResponseSchema>
export type ApiKey = z.infer<typeof authSchema>
