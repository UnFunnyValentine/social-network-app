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
    console.log('Using client ID:', process.env.LINKEDIN_CLIENT_ID);
    console.log('Using redirect URI:', process.env.REDIRECT_URI);
    
    // Exchange the code for a token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code: code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: process.env.REDIRECT_URI
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log('Token response received');
    
    // Get the user profile using the correct endpoint for r_basicprofile scope
    const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${tokenResponse.data.access_token}`
      }
    });

    console.log('Profile data received');
    
    // Get the user's email if the email scope is granted
    let emailData = null;
    try {
      // Try to get email using the emailAddress endpoint
      const emailResponse = await axios.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: {
          'Authorization': `Bearer ${tokenResponse.data.access_token}`
        }
      });
      emailData = emailResponse.data.elements?.[0]?.['handle~']?.emailAddress || null;
    } catch (emailError) {
      console.log('Email retrieval error:', emailError.message);
      
      // Try alternative method to get email if available in ID token
      try {
        if (tokenResponse.data.id_token) {
          // Decode the JWT token to get email from claims
          const base64Url = tokenResponse.data.id_token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const claims = JSON.parse(jsonPayload);
          emailData = claims.email || null;
          console.log('Email retrieved from ID token');
        }
      } catch (tokenError) {
        console.log('Failed to extract email from token:', tokenError.message);
      }
      
      // Continue without email if not available
    }

    // Create a more robust user profile object
    const userData = {
      id: profileResponse.data.id,
      firstName: profileResponse.data.localizedFirstName || profileResponse.data.firstName,
      lastName: profileResponse.data.localizedLastName || profileResponse.data.lastName,
      email: emailData || 'Email not available',
      profilePicture: profileResponse.data.profilePicture?.displayImage || null,
      headline: profileResponse.data.headline || null,
      vanityName: profileResponse.data.vanityName || null,
      // Include the raw profile data for debugging
      _rawProfile: profileResponse.data
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
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        status: 'error',
        message: error.message
      })
    };
  }
};
