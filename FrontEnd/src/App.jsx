import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import VideoProcessor from './components/VideoProcessor';
import Header from './components/Header';
import Auth from './components/Auth';
import SubscriptionDashboard from './pages/SubscriptionDashboard';
import UserSettings from './pages/UserSettings';
import SocialDashboard from './pages/SocialDashboard';
import useAuthStore from './stores/authStore';
import { supabase } from './lib/supabase';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { user, setUser, setSession } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Toaster position="top-right" />
        <Header />
        <main className="container mx-auto px-4 py-8">
          {!user ? (
            <Auth />
          ) : (
            <Routes>
              <Route path="/" element={<VideoProcessor />} />
              <Route 
                path="/social" 
                element={
                  <ProtectedRoute>
                    <SocialDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/subscription" 
                element={
                  <ProtectedRoute>
                    <SubscriptionDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <UserSettings />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </Router>
  );
}

export default App;