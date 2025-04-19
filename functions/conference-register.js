// Conference registration function
const axios = require('axios');

exports.handler = async function(event, context) {
  // CORS headers for cross-origin requests
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
    const { userId, conferenceId, isVisible, userData } = data;
    
    // Validate required fields
    if (!userId || !conferenceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'UserId and conferenceId are required',
          received: { userId, conferenceId }
        })
      };
    }

    console.log('Registering user for conference:', { userId, conferenceId, isVisible });
    
    // Store data in a database or external service
    // For this example, we'll just simulate success
    
    // In a real app, you would use a database or API call like:
    // const response = await axios.post('https://your-api.com/register', data);

    // Return success response
    const registrationData = {
      id: `reg_${Date.now()}`,
      userId,
      conferenceId,
      isVisible: isVisible !== false, // Default to visible if not specified
      timestamp: new Date().toISOString(),
      userData: userData || {}
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'success',
        message: 'User registered successfully',
        data: registrationData
      })
    };
  } catch (error) {
    console.error('Error in conference-register function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
}; 