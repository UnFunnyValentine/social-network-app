/**
 * LinkedIn OAuth Configuration
 * This file centralizes the configuration for LinkedIn authentication.
 */

const CONFIG = {
    // LinkedIn OAuth
    LINKEDIN_CLIENT_ID: '86bd4udvjkab6n', // This should come from environment in production
    
    // Default redirect URI - this should match what's configured in LinkedIn Developer Console
    REDIRECT_URI: 'https://cholebhature.netlify.app/docs/user/callback.html',
    
    // App scheme for Capacitor integration
    APP_SCHEME: 'com.znetlive.promeet',
    
    // API endpoints
    API_BASE_URL: typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNative ? 
        'https://cholebhature.netlify.app/api' : 
        '/api',
        
    // Required LinkedIn API scopes
    LINKEDIN_SCOPES: ['openid', 'profile', 'r_basicprofile', 'email'],
    
    // Check if running in Capacitor
    isRunningInCapacitor: function() {
        return (typeof window !== 'undefined' && window.Capacitor !== undefined && window.Capacitor.isNative === true);
    },
    
    // Gets the appropriate redirect URI based on environment
    getRedirectUri: function() {
        // For Capacitor app
        if (this.isRunningInCapacitor()) {
            return `${this.APP_SCHEME}://callback`;
        }
        
        // For local development
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            return `${window.location.origin}/docs/user/callback.html`;
        }
        
        // Default production URL
        return this.REDIRECT_URI;
    }
};

// Prevent modification of the config
Object.freeze(CONFIG); 
