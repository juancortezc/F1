const requiredEnvVars = {
  DATABASE_URL: 'PostgreSQL database connection string',
  NEXTAUTH_SECRET: 'Secret key for NextAuth.js (32+ chars)',
  NEXTAUTH_URL: 'Base URL of the application',
} as const;

const optionalEnvVars = {
  NODE_ENV: 'Environment mode (development, production, test)',
  VERCEL: 'Vercel deployment flag',
  VERCEL_URL: 'Vercel deployment URL',
} as const;

export function validateEnvironment() {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const [key, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
      missing.push(`${key}: ${description}`);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DATABASE_URL?.startsWith('postgres')) {
      warnings.push('DATABASE_URL should use PostgreSQL in production');
    }
    
    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
      warnings.push('NEXTAUTH_SECRET should be at least 32 characters long');
    }
  }

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(variable => console.error(`  - ${variable}`));
    throw new Error('Environment validation failed');
  }

  if (warnings.length > 0) {
    console.warn('Environment warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  console.log('Environment validation passed');
}

export function getRequiredEnv(key: keyof typeof requiredEnvVars): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnv(key: keyof typeof optionalEnvVars, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}