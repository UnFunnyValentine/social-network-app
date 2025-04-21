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
    
    // Log the incoming userData for debugging
    console.log('Received userData:', JSON.stringify(userData));
    
    // Extract LinkedIn profile URL using a more robust algorithm
    let linkedinUrl = extractBestLinkedInUrl(userData, userId);
    console.log('LinkedIn URL to be stored:', linkedinUrl);
    
    // Format data for storage
    const attendeeData = {
      userId,
      conferenceId,
      isVisible: isVisible !== false, // Default to visible if not specified
      name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      profilePicture: userData.profilePicture || userData.pictureUrl || userData.picture || '',
      role: userData.headline || userData.title || 'Conference Attendee',
      linkedinUrl: linkedinUrl, // This will be stored in the linkedin_url column
      joinedAt: new Date().toISOString()
    };
    
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

// Helper function to extract the best LinkedIn URL from user data
function extractBestLinkedInUrl(userData, userId) {
  // Priority order for LinkedIn URL extraction
  
  // 1. Direct linkedinUrl field
  if (userData.linkedinUrl) {
    console.log('Using linkedinUrl field:', userData.linkedinUrl);
    return ensureValidLinkedInUrl(userData.linkedinUrl);
  }
  
  // 2. Check for public profile URL in various formats
  if (userData.publicProfileUrl) {
    console.log('Using public profile URL:', userData.publicProfileUrl);
    return ensureValidLinkedInUrl(userData.publicProfileUrl);
  }
  
  // 3. Check for profile URL
  if (userData.profileUrl) {
    // Handle complex profileUrl objects (LinkedIn API v2)
    if (typeof userData.profileUrl === 'object' && userData.profileUrl['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier) {
      const profileUrl = userData.profileUrl['displayImage~'].elements[0].identifiers[0].identifier;
      console.log('Using LinkedIn API v2 format URL:', profileUrl);
      return ensureValidLinkedInUrl(profileUrl);
    }
    
    // Handle simple profileUrl strings
    if (typeof userData.profileUrl === 'string') {
      console.log('Using profile URL:', userData.profileUrl);
      return ensureValidLinkedInUrl(userData.profileUrl);
    }
  }
  
  // 4. Check for vanity name that doesn't look like an internal ID
  if (userData.vanityName && !userData.vanityName.match(/^[A-Z0-9]{8,12}$/i)) {
    const vanityUrl = `https://www.linkedin.com/in/${userData.vanityName}`;
    console.log('Using vanity name for URL:', vanityUrl);
    return vanityUrl;
  }
  
  // 5. Check for site profile request URL (from LinkedIn API v1)
  if (userData.siteStandardProfileRequest?.url) {
    console.log('Using siteStandardProfileRequest URL:', userData.siteStandardProfileRequest.url);
    return ensureValidLinkedInUrl(userData.siteStandardProfileRequest.url);
  }
  
  // 6. Try to construct from ID if it's not numeric (might be a vanity name)
  if (userId && !userId.match(/^[0-9]+$/)) {
    const idUrl = `https://www.linkedin.com/in/${userId}`;
    console.log('Constructing URL from non-numeric userId:', idUrl);
    return idUrl;
  }
  
  // 7. Fall back to search format using ID
  return `search:${userId}`;
}

// Helper function to ensure a LinkedIn URL is valid
function ensureValidLinkedInUrl(url) {
  if (!url) return `search:unknown`;
  
  // Return as-is if it's already a search format
  if (url.startsWith('search:')) return url;
  
  // If it's a valid URL with linkedin.com, return as-is
  if (url.includes('linkedin.com')) return url;
  
  // If it looks like just a username/ID, make it a proper LinkedIn URL
  if (!url.includes('://') && !url.startsWith('/')) {
    return `https://www.linkedin.com/in/${url}`;
  }
  
  // If it's any other URL format, return as-is
  if (url.startsWith('http')) return url;
  
  // Default to search if nothing else works
  return `search:${url}`;
} 
