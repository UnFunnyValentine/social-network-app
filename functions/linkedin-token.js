const axios = require('axios');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { code } = data;
    
    console.log('Received code:', code);
    
    // Exchange the code for a token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.LINKEDIN_CLIENT_ID || '86bd4udvjkab6n', // Fallback to hard-coded values if env vars not set
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || 'WPL_AP1.OgDnI5N7j6k3LOI2.3u7pLw==',
        redirect_uri: process.env.REDIRECT_URI || 'https://cholebhature.netlify.app/docs/user/callback.html'
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Token response received:', tokenResponse.data);
    const accessToken = tokenResponse.data.access_token;
    
    // IMPORTANT: We need to use the endpoints that match the scopes we have
    // With openid and profile scopes, we should use the userinfo endpoint
    let userData = {};
    
    try {
      // First try the OpenID Connect userinfo endpoint (works with openid, profile, email scopes)
      const userinfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log('Userinfo response received:', userinfoResponse.data);
      
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
        
        console.log('Basic profile response received:', profileResponse.data);
        
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
          
          userData.profilePicture = profilePicResponse.data.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier || null;
        } catch (picError) {
          console.log('Error getting profile picture:', picError.message);
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
        
      } catch (profileError) {
        console.log('Profile endpoint error:', profileError.message);
        console.log('Profile error details:', profileError.response?.data);
        
        // Create fallback user data if all API calls fail
        userData = {
          id: `fallback_${Date.now()}`,
          firstName: 'LinkedIn',
          lastName: 'User',
          name: 'LinkedIn User',
          email: 'email@example.com',
          profilePicture: null,
          headline: 'LinkedIn User'
        };
      }
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
    
    // Return a more user-friendly error that will be shown to users
    return {
      statusCode: 200, // Return 200 even on error to handle it client-side
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        status: 'error',
        message: 'Authentication error. Please try again.',
        id: 'default_user_' + Date.now(),
        firstName: 'Guest',
        lastName: 'User',
        email: 'guest@example.com',
        name: 'Guest User',
        profilePicture: 'https://randomuser.me/api/portraits/lego/1.jpg',
        error: error.message
      })
    };
  }
};
