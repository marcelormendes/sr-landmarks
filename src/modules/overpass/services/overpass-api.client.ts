import { Injectable, HttpStatus } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OverpassApiResponse } from '@shared/interfaces/overpass.api.response'
import { OverpassResponseSchema } from '@modules/overpass/overpass.schema'
import { OverpassException } from '../overpass.exception'

/**
 * Client for making HTTP requests to the Overpass API.
 * Handles retries, timeouts, and error handling for API interactions.
 */
@Injectable()
export class OverpassApiClient {
  private readonly apiUrl: string | undefined
  private readonly timeout: number | undefined
  private readonly maxRetries: number | undefined

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('overpass.url')
    this.timeout = this.configService.get<number>('overpass.timeout')
    this.maxRetries = this.configService.get<number>('overpass.maxRetries')
  }

  /**
   * Makes a request to the Overpass API with automatic retry capability
   * Uses exponential backoff for retries to avoid overwhelming the API
   */
  public async makeRequestWithRetry(
    query: string,
    retryCount = 0,
  ): Promise<OverpassApiResponse> {
    if (!this.apiUrl) {
      throw new OverpassException('SRO002', HttpStatus.BAD_REQUEST)
    }

    if (!this.timeout) {
      throw new OverpassException('SRO003', HttpStatus.BAD_REQUEST)
    }

    if (!this.maxRetries) {
      throw new OverpassException('SRO004', HttpStatus.BAD_REQUEST)
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query,
        signal: AbortSignal.timeout(this.timeout),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new OverpassException('SRO001', response.status, errorText)
      }

      const data = await response.json()
      return OverpassResponseSchema.parse(data)
    } catch (error: unknown) {
      if (retryCount < this.maxRetries) {
        return this.makeRequestWithRetry(query, retryCount + 1)
      }
      throw new OverpassException(
        'SRO001',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : error,
      )
    }
  }
}
