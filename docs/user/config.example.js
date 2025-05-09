/**
 * LinkedIn OAuth Configuration - EXAMPLE FILE
 * 
 * IMPORTANT: Copy this file to config.js and update with your actual values.
 * DO NOT commit config.js to your repository - add it to .gitignore
 */

const CONFIG = {
    // LinkedIn OAuth
    LINKEDIN_CLIENT_ID: 'YOUR_LINKEDIN_CLIENT_ID',  // Replace with your LinkedIn app client ID
    
    // Default redirect URI - this should match what's configured in LinkedIn Developer Console
    REDIRECT_URI: 'https://your-domain.com/docs/user/callback.html',
    
    // App scheme for Capacitor integration
    APP_SCHEME: 'com.yourdomain.yourapp',
    
    // API endpoints
    API_BASE_URL: window.Capacitor && window.Capacitor.isNative ? 
        'https://your-domain.com/api' : 
        '/api',
        
    // Required LinkedIn API scopes
    LINKEDIN_SCOPES: ['openid', 'profile', 'r_basicprofile', 'email'],
    
    // Check if running in Capacitor
    isRunningInCapacitor: function() {
        return (window.Capacitor !== undefined && window.Capacitor.isNative === true);
    },
    
    // Gets the appropriate redirect URI based on environment
    getRedirectUri: function() {
        // For Capacitor app
        if (this.isRunningInCapacitor()) {
            return `${this.APP_SCHEME}://callback`;
        }
        
        // For local development
        if (window.location.hostname === 'localhost') {
            return `${window.location.origin}/docs/user/callback.html`;
        }
        
        // Default production URL
        return this.REDIRECT_URI;
    }
};

// Prevent modification of the config
Object.freeze(CONFIG); 