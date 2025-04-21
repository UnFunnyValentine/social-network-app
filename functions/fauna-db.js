const faunadb = require('faunadb');
const q = faunadb.query;

// Initialize FaunaDB client with your secret and specify the latest API version
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET,
  apiVersion: '9' // Use the latest API version instead of v4
});

// Helper functions for database operations
const faunaQueries = {
  // Conference functions
  createConference: async (conferenceData) => {
    return await client.query(
      q.Create(
        q.Collection('conferences'),
        { data: conferenceData }
      )
    );
  },
  
  getConference: async (conferenceId) => {
    try {
      return await client.query(
        q.Get(
          q.Ref(q.Collection('conferences'), conferenceId)
        )
      );
    } catch (error) {
      if (error.name === 'NotFound') return null;
      throw error;
    }
  },
  
  // Attendee functions
  registerAttendee: async (attendeeData) => {
    // Try to find if attendee already exists
    try {
      const existingRef = await client.query(
        q.Get(
          q.Match(
            q.Index('attendee_by_userId_and_conferenceId'),
            [attendeeData.userId, attendeeData.conferenceId]
          )
        )
      );
      
      // Update existing record
      return await client.query(
        q.Update(
          existingRef.ref,
          { data: {
            ...attendeeData,
            lastActive: new Date().toISOString()
          }}
        )
      );
    } catch (error) {
      // Create new record if not found
      if (error.name === 'NotFound') {
        return await client.query(
          q.Create(
            q.Collection('attendees'),
            { data: {
              ...attendeeData,
              lastActive: new Date().toISOString()
            }}
          )
        );
      }
      throw error;
    }
  },
  
  updateAttendeeVisibility: async (userId, conferenceId, isVisible) => {
    try {
      const existingRef = await client.query(
        q.Get(
          q.Match(
            q.Index('attendee_by_userId_and_conferenceId'),
            [userId, conferenceId]
          )
        )
      );
      
      return await client.query(
        q.Update(
          existingRef.ref,
          { 
            data: { 
              isVisible: isVisible,
              lastActive: new Date().toISOString()
            } 
          }
        )
      );
    } catch (error) {
      if (error.name === 'NotFound') return null;
      throw error;
    }
  },
  
  getConferenceAttendees: async (conferenceId) => {
    try {
      const result = await client.query(
        q.Map(
          q.Paginate(
            q.Match(q.Index('attendees_by_conference'), conferenceId),
            { size: 100 }
          ),
          q.Lambda('X', q.Get(q.Var('X')))
        )
      );
      
      return result.data.map(item => ({
        ...item.data,
        id: item.ref.id
      }));
    } catch (error) {
      console.error('Error getting attendees:', error);
      return [];
    }
  },
  
  updateLastActive: async (userId, conferenceId) => {
    try {
      const existingRef = await client.query(
        q.Get(
          q.Match(
            q.Index('attendee_by_userId_and_conferenceId'),
            [userId, conferenceId]
          )
        )
      );
      
      return await client.query(
        q.Update(
          existingRef.ref,
          { data: { lastActive: new Date().toISOString() }}
        )
      );
    } catch (error) {
      console.error('Error updating last active time:', error);
      return null;
    }
  }
};

module.exports = faunaQueries; 
