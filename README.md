# Conference Networking App

A web application that allows conference attendees to connect with each other using LinkedIn authentication.

## Features
- LinkedIn authentication
- Conference-specific networking
- User profile display

## Setup
1. Connect this repository to Netlify
2. Set up environment variables in Netlify:
   - LINKEDIN_CLIENT_ID
   - LINKEDIN_CLIENT_SECRET
   - REDIRECT_URI (https://your-netlify-domain.netlify.app/docs/user/callback.html)
3. Update LinkedIn Developer Console with your Netlify domain

## Local Development
```npm install```
```npm start```