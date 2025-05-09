/**
 * Netlify Functions Index
 * 
 * This file documents the available API endpoints in this application.
 * All endpoints are exposed as Netlify serverless functions.
 */

// Import the LinkedIn token function
const linkedinToken = require('./linkedin-token');

// Document the available functions
const functions = {
    // LinkedIn Authentication
    'linkedin-token': {
        description: 'Exchange a LinkedIn authorization code for an access token',
        method: 'POST',
        path: '/.netlify/functions/linkedin-token',
        params: {
            code: 'The authorization code from LinkedIn',
            code_verifier: 'Optional PKCE code verifier',
            conferenceId: 'Conference ID',
            conferenceName: 'Conference name',
            conferenceLocation: 'Conference location'
        }
    },
    
    // Conference management
    'conference-register': {
        description: 'Register a user for a conference',
        method: 'POST',
        path: '/.netlify/functions/conference-register'
    },
    
    'conference-attendees': {
        description: 'Get list of attendees for a conference',
        method: 'GET',
        path: '/.netlify/functions/conference-attendees'
    }
};

// Helper function to test if environment variables are correctly set
function testEnvironmentVariables() {
    const requiredVars = [
        'LINKEDIN_CLIENT_ID',
        'LINKEDIN_CLIENT_SECRET'
    ];
    
    const results = {};
    
    requiredVars.forEach(varName => {
        // Check if variable exists (without revealing its value)
        const value = process.env[varName];
        results[varName] = {
            exists: !!value,
            length: value ? value.length : 0,
            // Only show prefix/suffix for IDs, not for secrets
            preview: varName.includes('SECRET') ? 
                '***hidden***' : 
                value ? `${value.substring(0, 3)}...${value.substring(value.length - 3)}` : 'missing'
        };
    });
    
    return results;
}

// Export the functions with documentation
exports.handler = async function(event, context) {
    // Only allow GET requests to this endpoint
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    // Test environment variables
    const envVarStatus = testEnvironmentVariables();
    
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: 'API Documentation',
            functions: functions,
            environment: envVarStatus
        })
    };
};

// Also export the handler from linkedin-token
exports.linkedinTokenHandler = linkedinToken.handler; 