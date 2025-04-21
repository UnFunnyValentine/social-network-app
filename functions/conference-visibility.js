// Conference visibility update function
const supabaseQueries = require('./supabase-db');

exports.handler = async (event, context) => {
  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Only allow PUT requests for updating visibility
  if (event.httpMethod !== 'PUT') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
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
    
    console.log('Updating visibility with userData:', userData);
    
    // If userData is provided, we can also update the LinkedIn URL
    if (userData) {
      console.log('Using userData to update attendee record, including LinkedIn URL');
      
      // Extract LinkedIn URL if available
      const linkedinUrl = userData.linkedinUrl || '';
      console.log('LinkedIn URL for update:', linkedinUrl);
      
      // Register/Update the attendee with the provided data
      const registerData = {
        userId,
        conferenceId,
        isVisible,
        name: userData.name || 'Conference Attendee',
        profilePicture: userData.profilePicture || '',
        role: userData.headline || userData.title || 'Conference Attendee',
        linkedinUrl,
        joinedAt: userData.joinedAt || new Date().toISOString()
      };
      
      // Use the registerAttendee function to do an upsert with the updated data
      const result = await supabaseQueries.registerAttendee(registerData);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: `User data and visibility updated to ${isVisible ? 'visible' : 'hidden'}`,
          data: result.data
        })
      };
    } else {
      // If no userData, just update visibility
      console.log('No userData provided, only updating visibility');
      
      // Update visibility in Supabase
      const result = await supabaseQueries.updateAttendeeVisibility(userId, conferenceId, isVisible);
      
      if (!result) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            error: 'Attendee not found',
            message: 'The attendee must register for the conference first'
          })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: `Visibility updated to ${isVisible ? 'visible' : 'hidden'}`,
          data: {
            userId,
            conferenceId,
            isVisible
          }
        })
      };
    }
  } catch (error) {
    console.error('Visibility update error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update visibility',
        details: error.message
      })
    };
  }
}; 
