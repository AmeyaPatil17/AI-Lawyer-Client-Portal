export const JWT_CONFIG = {
    // Determine the secret: fail-fast in production if missing.
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('FATAL: JWT_SECRET not set'); })() : 'dev-only-insecure-secret'),
    
    // Configurable expiry values
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiryDays: parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS || '7', 10),
    
    // Cookie options for auth cookies
    cookieOptions: (isProduction: boolean) => ({
        httpOnly: true,
        secure: isProduction,
        // The strictest cross-site request setting
        sameSite: 'strict' as const,
        maxAge: 15 * 60 * 1000, // 15 minutes to match accessTokenExpiry
    })
};
