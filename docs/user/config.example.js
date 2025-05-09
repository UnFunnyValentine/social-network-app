/**
 * LinkedIn OAuth Configuration Example
 * This file serves as a template for creating your config.js file.
 * 
 * IMPORTANT SETUP INSTRUCTIONS:
 * 1. Copy this file to config.js
 * 2. Replace the LinkedIn Client ID with the one from your LinkedIn Developer Console
 * 3. Make sure your LinkedIn app has the redirect URI set to exactly match the REDIRECT_URI value
 * 4. Ensure your LinkedIn app has the following permissions: 'openid', 'profile', 'r_basicprofile', 'email'
 */

const CONFIG = {
    // LinkedIn OAuth - Replace with your own Client ID from LinkedIn Developer Console
    LINKEDIN_CLIENT_ID: 'your_linkedin_client_id_here', 
    
    // Default redirect URI - must match exactly what's configured in LinkedIn Developer Console
    // IMPORTANT: This URI must be added to the Authorized Redirect URLs in your LinkedIn app
    REDIRECT_URI: 'https://your-domain.com/docs/user/callback.html',
    
    // App scheme for Capacitor integration
    APP_SCHEME: 'com.yourdomain.yourapp',
    
    // API endpoints
    API_BASE_URL: typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNative ? 
        'https://your-api-domain.com/api' : 
        '/api',
        
    // Required LinkedIn API scopes - must be enabled in your LinkedIn app
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
