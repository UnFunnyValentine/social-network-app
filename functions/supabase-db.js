const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseQueries = {
  // Conference functions
  createConference: async (conferenceData) => {
    const { data, error } = await supabase
      .from('conferences')
      .insert([{
        id: conferenceData.id,
        name: conferenceData.name,
        location: conferenceData.location || ''
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  getConference: async (conferenceId) => {
    const { data, error } = await supabase
      .from('conferences')
      .select('*')
      .eq('id', conferenceId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data || null;
  },
  
  // Attendee functions
  registerAttendee: async (attendeeData) => {
    // Check if conference exists, create if it doesn't
    const conference = await supabaseQueries.getConference(attendeeData.conferenceId);
    if (!conference) {
      try {
        await supabaseQueries.createConference({
          id: attendeeData.conferenceId,
          name: 'Conference ' + attendeeData.conferenceId,
        });
      } catch (error) {
        console.warn('Error creating conference:', error);
        // Continue anyway - in case of race condition where conference was just created
      }
    }
    
    // Prepare attendee data for Supabase (snake_case)
    const dbAttendee = {
      user_id: attendeeData.userId,
      conference_id: attendeeData.conferenceId,
      name: attendeeData.name,
      profile_picture: attendeeData.profilePicture,
      role: attendeeData.role,
      linkedin_url: attendeeData.linkedinUrl,
      is_visible: attendeeData.isVisible !== false,
      last_active: new Date().toISOString(),
      joined_at: attendeeData.joinedAt || new Date().toISOString()
    };
    
    // Upsert attendee (update if exists, insert if doesn't)
    const { data, error } = await supabase
      .from('attendees')
      .upsert(dbAttendee, { 
        onConflict: 'user_id,conference_id',
        returning: 'representation'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Convert back to camelCase for consistency with the rest of the app
    return {
      data: {
        userId: data.user_id,
        conferenceId: data.conference_id,
        name: data.name,
        profilePicture: data.profile_picture,
        role: data.role, 
        linkedinUrl: data.linkedin_url,
        isVisible: data.is_visible,
        lastActive: data.last_active,
        joinedAt: data.joined_at
      }
    };
  },
  
  updateAttendeeVisibility: async (userId, conferenceId, isVisible) => {
    const { data, error } = await supabase
      .from('attendees')
      .update({ 
        is_visible: isVisible, 
        last_active: new Date().toISOString() 
      })
      .match({ user_id: userId, conference_id: conferenceId })
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    
    return {
      data: {
        userId: data.user_id,
        conferenceId: data.conference_id,
        isVisible: data.is_visible
      }
    };
  },
  
  getConferenceAttendees: async (conferenceId) => {
    const { data, error } = await supabase
      .from('attendees')
      .select('*')
      .eq('conference_id', conferenceId);
    
    if (error) throw error;
    
    // Convert from snake_case to camelCase
    return data.map(item => ({
      userId: item.user_id,
      conferenceId: item.conference_id,
      name: item.name,
      profilePicture: item.profile_picture,
      role: item.role,
      linkedinUrl: item.linkedin_url,
      isVisible: item.is_visible,
      lastActive: item.last_active,
      joinedAt: item.joined_at
    }));
  },
  
  updateLastActive: async (userId, conferenceId) => {
    const { data, error } = await supabase
      .from('attendees')
      .update({ last_active: new Date().toISOString() })
      .match({ user_id: userId, conference_id: conferenceId })
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    
    return {
      data: {
        userId: data.user_id,
        conferenceId: data.conference_id,
        lastActive: data.last_active
      }
    };
  }
};

module.exports = supabaseQueries; 