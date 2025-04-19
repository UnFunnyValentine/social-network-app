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

    console.log('Token response received');
    const accessToken = tokenResponse.data.access_token;
    
    // Get the user profile using the correct endpoint with projection parameters
    const profileResponse = await axios.get('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('Profile data received');
    
    // Get the user's email if the email scope is granted - try multiple ways
    let emailData = null;
    
    // First try the OpenID Connect userinfo endpoint (for email scope)
    try {
      const userinfoResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      emailData = userinfoResponse.data.email;
      console.log('Email successfully retrieved from userinfo endpoint');
    } catch (userinfoError) {
      console.log('Userinfo endpoint error:', userinfoError.message);
      
      // If that fails, try the older emailAddress endpoint
      try {
        const emailResponse = await axios.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        emailData = emailResponse.data.elements?.[0]?.['handle~']?.emailAddress;
        console.log('Email successfully retrieved from emailAddress endpoint');
      } catch (emailError) {
        console.log('Email retrieval error:', emailError.message);
        // Continue without email
      }
    }

    // Extract profile picture URL if available
    let profilePictureUrl = null;
    try {
      profilePictureUrl = profileResponse.data.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier;
    } catch (picError) {
      console.log('Error extracting profile picture:', picError.message);
    }

    // Create a simplified user profile object with only necessary fields
    const userData = {
      id: profileResponse.data.id,
      firstName: profileResponse.data.localizedFirstName || '',
      lastName: profileResponse.data.localizedLastName || '',
      email: emailData || 'email@example.com', // Provide fallback email
      profilePicture: profilePictureUrl,
      // Add additional fields from LinkedIn response
      name: `${profileResponse.data.localizedFirstName || ''} ${profileResponse.data.localizedLastName || ''}`.trim(),
      headline: 'LinkedIn User' // Default headline
    };

    // Return the combined data
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
