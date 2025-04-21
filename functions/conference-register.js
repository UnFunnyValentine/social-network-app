// Conference registration function
const supabaseQueries = require('./supabase-db');

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
    
    // Extract LinkedIn profile URL with several fallbacks
    let linkedinUrl = '';
    
    // Try all possible LinkedIn URL formats
    if (userData.publicProfileUrl) {
      linkedinUrl = userData.publicProfileUrl;
    } else if (userData.profileUrl) {
      linkedinUrl = userData.profileUrl;
    } else if (userData.vanityName) {
      linkedinUrl = `https://www.linkedin.com/in/${userData.vanityName}`;
    } else if (userData.vanity) {
      linkedinUrl = `https://www.linkedin.com/in/${userData.vanity}`;
    } else if (userData.profileLink) {
      linkedinUrl = userData.profileLink;
    } else if (userData.linkedinUrl) {
      linkedinUrl = userData.linkedinUrl;
    } else if (userData.siteStandardProfileRequest?.url) {
      linkedinUrl = userData.siteStandardProfileRequest.url;
    }
    
    // Format data for storage
    const attendeeData = {
      userId,
      conferenceId,
      isVisible: isVisible !== false, // Default to visible if not specified
      name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      profilePicture: userData.profilePicture || userData.pictureUrl || userData.picture || '',
      role: userData.headline || userData.title || 'Conference Attendee',
      linkedinUrl: linkedinUrl,
      joinedAt: new Date().toISOString()
    };
    
    console.log('LinkedIn URL captured:', linkedinUrl);
    
    // Store in Supabase
    const result = await supabaseQueries.registerAttendee(attendeeData);
    
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
