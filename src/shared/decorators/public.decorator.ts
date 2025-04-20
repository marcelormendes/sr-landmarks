import { SetMetadata } from '@nestjs/common'
import { IS_PUBLIC_KEY } from '@shared/constants/auth.constants'

/**
 * Decorator to mark a controller or route as public (bypass auth)
 * @returns Decorator function
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
