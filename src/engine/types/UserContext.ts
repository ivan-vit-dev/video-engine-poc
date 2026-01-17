/**
 * User context for premium features, AB testing, etc.
 */
export interface UserContext {
  userId?: string;
  isPremium?: boolean;
  abFlags?: Record<string, boolean | string>;
  [key: string]: unknown;
}

