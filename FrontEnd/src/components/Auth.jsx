import React from 'react';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';

function Auth() {
  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6">Welcome to Video Clip Generator</h2>
        <p className="text-gray-600 text-center mb-6">
          Sign in to start creating video clips. Get 3 free clips every month!
        </p>
        <SupabaseAuth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google', 'github']}
          redirectTo={window.location.origin}
        />
      </div>
    </div>
  );
}

export default Auth;