const axios = require('axios');

exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { accessToken } = data;
    
    if (!accessToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Access token is required',
          environment: {
            LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID ? 'Set' : 'Not set',
            LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET ? 'Set' : 'Not set',
            REDIRECT_URI: process.env.REDIRECT_URI ? 'Set' : 'Not set',
            NODE_VERSION: process.version
          }
        })
      };
    }

    // Test different LinkedIn API endpoints to diagnose issues
    const results = {
      environment: {
        LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID ? 'Set' : 'Not set',
        LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET ? 'Set' : 'Not set',
        REDIRECT_URI: process.env.REDIRECT_URI ? 'Set' : 'Not set',
        NODE_VERSION: process.version
      },
      endpoints: {}
    };

    // Test endpoints
    const endpoints = [
      { name: 'userinfo', url: 'https://api.linkedin.com/v2/userinfo' },
      { name: 'me', url: 'https://api.linkedin.com/v2/me' },
      { name: 'emailAddress', url: 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        results.endpoints[endpoint.name] = {
          status: 'success',
          statusCode: response.status,
          headers: response.headers,
          data: response.data
        };
      } catch (error) {
        results.endpoints[endpoint.name] = {
          status: 'error',
          statusCode: error.response?.status || 'unknown',
          message: error.message,
          errorData: error.response?.data || {},
          errorHeaders: error.response?.headers || {}
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results)
    };
  } catch (error) {
    console.error('Error in linkedin-test function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        environment: {
          LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID ? 'Set' : 'Not set',
          LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET ? 'Set' : 'Not set',
          REDIRECT_URI: process.env.REDIRECT_URI ? 'Set' : 'Not set',
          NODE_VERSION: process.version
        }
      })
    };
  }
}; 