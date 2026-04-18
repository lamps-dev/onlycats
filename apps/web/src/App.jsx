
import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from './components/ScrollToTop.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import DiscoveryPage from './pages/DiscoveryPage.jsx';
import CreatorProfile from './pages/CreatorProfile.jsx';
import FeedPage from './pages/FeedPage.jsx';
import DeveloperDashboard from './pages/DeveloperDashboard.jsx';
import ApiDocumentation from './pages/ApiDocumentation.jsx';
import AdminPage from './pages/AdminPage.jsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/discover" element={<DiscoveryPage />} />
          <Route path="/api-docs" element={<ApiDocumentation />} />
          <Route path="/feed" element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          } />
          <Route path="/developer" element={
            <ProtectedRoute>
              <DeveloperDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="/:creatorId" element={<CreatorProfile />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}

export default App;
