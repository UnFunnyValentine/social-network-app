const axios = require('axios');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { code, fromApp, conferenceId, conferenceName, conferenceLocation } = data;
    
    console.log('Received code:', code);
    console.log('fromApp:', fromApp);
    console.log('Conference details:', { conferenceId, conferenceName, conferenceLocation });
    
    // LinkedIn OAuth Configuration
    const clientId = process.env.LINKEDIN_CLIENT_ID || '86bd4udvjkab6n';
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || 'WPL_AP1.OgDnI5N7j6k3LOI2.3u7pLw==';
    const redirectUri = process.env.REDIRECT_URI || 'https://cholebhature.netlify.app/docs/user/callback.html';
    
    console.log('Using client ID:', clientId);
    console.log('Using redirect URI:', redirectUri);
    
    let accessToken;
    let tokenData;
    
    try {
      // Create the authorization header using HTTP Basic Authentication
      // Format: Base64(client_id:client_secret)
      const authBuffer = Buffer.from(`${clientId}:${clientSecret}`);
      const authBase64 = authBuffer.toString('base64');
      
      // APPROACH 1: Exchange the code for a token using Basic Authentication in the header
      console.log('Trying OAuth approach 1: Basic Auth in header');
      const tokenResponse = await axios({
        method: 'post',
        url: 'https://www.linkedin.com/oauth/v2/accessToken',
        data: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authBase64}`
        }
      });
      
      console.log('Token response received with approach 1');
      tokenData = tokenResponse.data;
      accessToken = tokenData.access_token;
    } catch (authError) {
      console.log('Approach 1 failed:', authError.message);
      console.log('Error response:', authError.response?.data);
      
      // APPROACH 2: Try with client credentials in the body
      console.log('Trying OAuth approach 2: Credentials in request body');
      try {
        const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', 
          `grant_type=authorization_code&code=${encodeURIComponent(code)}&client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}`, 
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        console.log('Token response received with approach 2');
        tokenData = tokenResponse.data;
        accessToken = tokenData.access_token;
      } catch (secondError) {
        console.log('Approach 2 failed:', secondError.message);
        console.log('Error response:', secondError.response?.data);
        
        // APPROACH 3: Try with URL parameters
        console.log('Trying OAuth approach 3: Credentials in URL parameters');
        const tokenResponse = await axios.post(
          `https://www.linkedin.com/oauth/v2/accessToken?grant_type=authorization_code&code=${encodeURIComponent(code)}&client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}`,
          null,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        console.log('Token response received with approach 3');
        tokenData = tokenResponse.data;
        accessToken = tokenData.access_token;
      }
    }
    
    // IMPORTANT: We need to use the endpoints that match the scopes we have
    // With openid and profile scopes, we should use the userinfo endpoint
    let userData = {};
    let linkedinUrl = ''; // Will store the user's LinkedIn profile URL
    
    try {
      // First try the OpenID Connect userinfo endpoint (works with openid, profile, email scopes)
      const userinfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log('Userinfo response received');
      
      // Extract data from OpenID userinfo response
      userData = {
        id: userinfoResponse.data.sub,
        firstName: userinfoResponse.data.given_name || '',
        lastName: userinfoResponse.data.family_name || '',
        email: userinfoResponse.data.email || 'email@example.com',
        name: userinfoResponse.data.name || '',
        profilePicture: userinfoResponse.data.picture || null,
        locale: userinfoResponse.data.locale || 'en_US',
        headline: userinfoResponse.data.headline || 'LinkedIn User'
      };
      
      // Try to determine LinkedIn profile URL using multiple approaches
      await determineLinkedInProfileUrl(accessToken, userData);
      
    } catch (userinfoError) {
      console.log('Userinfo endpoint error:', userinfoError.message);
      console.log('Userinfo error details:', userinfoError.response?.data);
      
      // Use basic profile data if we can't get userinfo
      try {
        // Try the lite profile endpoint (works with the profile scope)
        const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        console.log('Basic profile response received');
        
        // Extract basic profile data
        userData = {
          id: profileResponse.data.id || `user_${Date.now()}`,
          firstName: profileResponse.data.localizedFirstName || '',
          lastName: profileResponse.data.localizedLastName || '',
          name: `${profileResponse.data.localizedFirstName || ''} ${profileResponse.data.localizedLastName || ''}`.trim(),
          email: 'email@example.com', // Default email since we couldn't get it
          headline: 'LinkedIn User'
        };
        
        // Try to get profile picture separately
        try {
          const profilePicResponse = await axios.get('https://api.linkedin.com/v2/me?projection=(id,profilePicture(displayImage~:playableStreams))', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          const pictureElements = profilePicResponse.data.profilePicture?.['displayImage~']?.elements;
          if (pictureElements && pictureElements.length > 0) {
            // Sort by width to get the largest image
            const sortedElements = [...pictureElements].sort((a, b) => 
              (b.data?.['com.linkedin.digitalmedia.mediaartifact.StillImage']?.storageSize?.width || 0) - 
              (a.data?.['com.linkedin.digitalmedia.mediaartifact.StillImage']?.storageSize?.width || 0)
            );
            
            // Get the identifier of the largest image
            userData.profilePicture = sortedElements[0]?.identifiers?.[0]?.identifier || null;
          } else {
            userData.profilePicture = null;
          }
        } catch (picError) {
          console.log('Error getting profile picture:', picError.message);
          
          // Try the alternate picture endpoint
          try {
            const altPicResponse = await axios.get('https://api.linkedin.com/v2/me?projection=(profilePicture(displayImage~digitalmediaAsset:playableStreams))', {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            
            userData.profilePicture = extractProfilePictureUrl(altPicResponse.data);
          } catch (altPicError) {
            console.log('Error getting alternate profile picture:', altPicError.message);
          }
        }
        
        // Try to get email separately
        try {
          const emailResponse = await axios.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          userData.email = emailResponse.data.elements?.[0]?.['handle~']?.emailAddress || 'email@example.com';
        } catch (emailError) {
          console.log('Email retrieval error:', emailError.message);
        }
        
        // Try to determine LinkedIn profile URL
        await determineLinkedInProfileUrl(accessToken, userData);
        
      } catch (profileError) {
        console.log('Profile endpoint error:', profileError.message);
        console.log('Profile error details:', profileError.response?.data);
        
        // Instead of using fallback data, throw an error to be handled properly
        throw new Error('Failed to retrieve LinkedIn profile data. Please try again.');
      }
    }
    
    // Add conference details to the response
    userData.conferenceId = conferenceId;
    userData.conferenceName = conferenceName;
    userData.conferenceLocation = conferenceLocation;
    
    // For debugging: Note if this was an app authentication
    if (fromApp) {
      userData.authenticatedVia = 'linkedinApp';
    }

    // Return the user data
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(userData)
    };
  } catch (error) {
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Error response:', error.response.data);
      console.log('Error status:', error.response.status);
    }
    
    // Return an error response with a clear error message
    return {
      statusCode: 200, // Return 200 even on error to handle it client-side
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        status: 'error',
        message: 'Authentication failed. Please try again using the standard sign-in option.',
        error: error.message,
        errorCode: error.response?.status || 500
      })
    };
  }
};

/**
 * Attempts to extract a profile picture URL from the LinkedIn API response
 */
function extractProfilePictureUrl(data) {
  // Try several known paths to find the profile picture
  try {
    // Path 1: displayImage~elements
    if (data.profilePicture?.['displayImage~']?.elements?.length > 0) {
      const elements = data.profilePicture['displayImage~'].elements;
      // Sort by size to get largest
      const sorted = [...elements].sort((a, b) => 
        (b.data?.['com.linkedin.digitalmedia.mediaartifact.StillImage']?.storageSize?.width || 0) -
        (a.data?.['com.linkedin.digitalmedia.mediaartifact.StillImage']?.storageSize?.width || 0)
      );
      
      return sorted[0]?.identifiers?.[0]?.identifier;
    }
    
    // Path 2: digitalmediaAsset:playableStreams
    if (data.profilePicture?.['digitalmediaAsset:playableStreams']?.elements?.length > 0) {
      const elements = data.profilePicture['digitalmediaAsset:playableStreams'].elements;
      return elements[0]?.identifiers?.[0]?.identifier;
    }
  } catch (e) {
    console.log('Error extracting profile picture:', e.message);
  }
  
  return null;
}

/**
 * Determines the best LinkedIn profile URL for a user and adds it to userData
 * Attempts multiple approaches using LinkedIn API endpoints
 */
async function determineLinkedInProfileUrl(accessToken, userData) {
  console.log('Attempting to determine LinkedIn profile URL for user:', userData.id);
  
  // Approach 1: Try to get vanity name from /v2/me endpoint
  try {
    console.log('Approach 1: Trying to get vanity name from /v2/me endpoint');
    const meResponse = await axios.get('https://api.linkedin.com/v2/me?projection=(id,vanityName,publicProfileUrl)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('ME endpoint response received');
    
    // Check for vanity name that doesn't look like an internal ID
    if (meResponse.data.vanityName && !meResponse.data.vanityName.match(/^[A-Z0-9]{8,12}$/i)) {
      userData.linkedinUrl = `https://www.linkedin.com/in/${meResponse.data.vanityName}`;
      userData.vanityName = meResponse.data.vanityName;
      console.log('Found valid vanity name');
      return;
    }
    
    // Check for public profile URL
    if (meResponse.data.publicProfileUrl && meResponse.data.publicProfileUrl.includes('/in/')) {
      userData.linkedinUrl = meResponse.data.publicProfileUrl;
      console.log('Found public profile URL');
      return;
    }
  } catch (err) {
    console.log('Error in Approach 1:', err.message);
  }
  
  // Approach 2: Try to get profile URL from identity API
  try {
    console.log('Approach 2: Trying to get profile URL from identity API');
    const identityResponse = await axios.get(`https://api.linkedin.com/v2/people/(id:${userData.id})`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('Identity API response:', identityResponse.data);
    
    // Check for public profile URL in this response
    if (identityResponse.data.publicProfileUrl) {
      userData.linkedinUrl = identityResponse.data.publicProfileUrl;
      console.log('Found public profile URL from identity API:', userData.linkedinUrl);
      return;
    }
    
    // Check for siteStandardProfileRequest
    if (identityResponse.data.siteStandardProfileRequest && identityResponse.data.siteStandardProfileRequest.url) {
      userData.linkedinUrl = identityResponse.data.siteStandardProfileRequest.url;
      console.log('Found siteStandardProfileRequest URL:', userData.linkedinUrl);
      return;
    }
  } catch (err) {
    console.log('Error in Approach 2:', err.message);
  }
  
  // Approach 3: Try a different projection with the fields we need
  try {
    console.log('Approach 3: Trying different projection with the fields we need');
    const projectionResponse = await axios.get('https://api.linkedin.com/v2/me?projection=(id,profilePicture,vanityName,publicProfileUrl)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('Projection response:', projectionResponse.data);
    
    // Check again for vanity name
    if (projectionResponse.data.vanityName && !projectionResponse.data.vanityName.match(/^[A-Z0-9]{8,12}$/i)) {
      userData.linkedinUrl = `https://www.linkedin.com/in/${projectionResponse.data.vanityName}`;
      userData.vanityName = projectionResponse.data.vanityName;
      console.log('Found valid vanity name from projection:', userData.linkedinUrl);
      return;
    }
    
    // Check again for public profile URL
    if (projectionResponse.data.publicProfileUrl && projectionResponse.data.publicProfileUrl.includes('/in/')) {
      userData.linkedinUrl = projectionResponse.data.publicProfileUrl;
      console.log('Found public profile URL from projection:', userData.linkedinUrl);
      return;
    }
  } catch (err) {
    console.log('Error in Approach 3:', err.message);
  }
  
  // Fallback: If we couldn't get a proper URL, use search
  console.log('All approaches failed, using search fallback');
  
  // Use name for search if available, otherwise ID
  if (userData.name && userData.name.trim() !== '') {
    userData.linkedinUrl = `search:${userData.name}`;
    console.log('Using search with name:', userData.linkedinUrl);
  } else {
    userData.linkedinUrl = `search:${userData.id}`;
    console.log('Using search with ID:', userData.linkedinUrl);
  }
}
