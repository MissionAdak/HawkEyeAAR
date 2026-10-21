import { APP_CONFIG } from './config.generated';
import { ConfigSchema, type ValidatedConfig } from './schema';

// Validate at load time to catch any build/schema discrepancies
const validationResult = ConfigSchema.safeParse(APP_CONFIG);
if (!validationResult.success) {
  console.error('[Config Error] Inlined configuration failed Zod schema validation:', validationResult.error.format());
  throw new Error('Invalid application configuration');
}

export const CONFIG: ValidatedConfig = validationResult.data;
export { CONFIG_HASH, type AppConfig } from './config.generated';

