import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OverpassApiException } from '../../exceptions/api.exceptions'
import { OverpassApiResponse } from '../../interfaces/overpass.api.response'

/**
 * Client for making HTTP requests to the Overpass API.
 * Handles retries, timeouts, and error handling for API interactions.
 */
@Injectable()
export class OverpassApiClient {
  private readonly apiUrl: string
  private readonly timeout: number
  private readonly maxRetries: number
  private readonly logger = new Logger(OverpassApiClient.name)

  constructor(private readonly configService: ConfigService) {
    this.apiUrl =
      this.configService.get<string>('overpass.url') ||
      'https://overpass-api.de/api/interpreter'
    this.timeout = this.configService.get<number>('overpass.timeout') || 60000
    this.maxRetries = this.configService.get<number>('overpass.maxRetries') || 3
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
      throw new OverpassApiException(
        'Overpass API URL is missing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
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

      return response.json() as Promise<OverpassApiResponse>
    } catch (error) {
      if (retryCount < this.maxRetries) {
        // Exponential backoff: 2^retryCount * 100ms
        const delay = Math.pow(2, retryCount) * 100
        this.logger.warn(
          `Retrying Overpass API request in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`,
        )

        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.makeRequestWithRetry(query, retryCount + 1)
      }

      if (error instanceof OverpassApiException) {
        throw error
      }

      const err = error as Error
      throw new OverpassApiException(`Request failed: ${err.message}`)
    }
  }
}
