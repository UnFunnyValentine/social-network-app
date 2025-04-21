// Conference registration function
const faunaQueries = require('./fauna-db');

exports.handler = async (event, context) => {
  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    // Parse the incoming request body
    const data = JSON.parse(event.body);
    const { userId, conferenceId, isVisible, userData } = data;
    
    if (!userId || !conferenceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }
    
    // Format data for storage
    const attendeeData = {
      userId,
      conferenceId,
      isVisible: isVisible !== false, // Default to visible if not specified
      name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      profilePicture: userData.profilePicture || userData.pictureUrl || userData.picture || '',
      role: userData.headline || userData.title || 'Conference Attendee',
      linkedinUrl: userData.profileUrl || '',
      joinedAt: new Date().toISOString()
    };
    
    // Store in FaunaDB
    const result = await faunaQueries.registerAttendee(attendeeData);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Registration successful',
        data: result.data
      })
    };
  } catch (error) {
    console.error('Registration error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to register for conference',
        details: error.message
      })
    };
  }
}; 
