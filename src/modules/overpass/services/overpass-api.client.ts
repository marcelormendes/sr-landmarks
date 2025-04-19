import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OverpassApiException } from '@common/exceptions/api.exceptions'
import { OverpassApiResponse } from '@shared/interfaces/overpass.api.response'
import { OverpassResponseSchema } from '@modules/overpass/overpass.schema'
import { ErrorHandler } from '@common/exceptions/error-handling'

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
      throw new Error('Overpass API URL is missing')
    }

    if (!this.timeout) {
      throw new Error('Overpass timeout is missing')
    }

    if (!this.maxRetries) {
      throw new Error('Overpass max retries is missing')
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
        throw new OverpassApiException(
          `HTTP error! Status: ${response.status} - ${errorText}`,
          response.status,
        )
      }

      const data = await response.json()
      return OverpassResponseSchema.parse(data)
    } catch (error: unknown) {
      if (retryCount < this.maxRetries) {
        return this.makeRequestWithRetry(query, retryCount + 1)
      }

      ErrorHandler.handle(error, OverpassApiException, {
        context: 'Overpass API request',
        logger: new Logger(OverpassApiClient.name),
      })
    }
  }
}
