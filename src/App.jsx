import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Search, Plus, User, Upload, X, CheckCircle, AlertCircle, Download, Share2, LogOut, LogIn } from 'lucide-react';

// Supabase configuration
const SUPABASE_URL = 'https://vqxsuqsjndlkvjpflhfy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxeHN1cXNqbmRsa3ZqcGZsaGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMDE0MTQsImV4cCI6MjA2Njc3NzQxNH0.9rESgHXc7L1PHXXTWpNaAMdSsVP5RchKENHjFVIGsz8';

// Generate QR code data URL (simplified - in real app you'd use a proper QR library)
const generateQRCode = (alias) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 200;
  canvas.height = 200;
  
  // Simple placeholder QR code visual
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = '#fff';
  ctx.fillRect(10, 10, 180, 180);
  ctx.fillStyle = '#000';
  
  // Draw some QR-like patterns
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 20; j++) {
      if (Math.random() > 0.5) {
        ctx.fillRect(10 + i * 9, 10 + j * 9, 8, 8);
      }
    }
  }
  
  // Add alias text at bottom
  ctx.fillStyle = '#fff';
  ctx.fillRect(50, 160, 100, 30);
  ctx.fillStyle = '#000';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(alias, 100, 180);
  
  return canvas.toDataURL();
};

// Simple Supabase client with auth
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.currentUser = null;
    this.authToken = null;
  }

  async signUp(email, password, alias, firstName, carDescription, story) {
    const response = await fetch(`${this.url}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': this.key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          alias,
          first_name: firstName,
          car_description: carDescription,
          story
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.msg || data.error_description || 'Registration failed');
    }

    // If registration successful, create user profile
    if (data.user) {
      this.currentUser = data.user;
      this.authToken = data.session?.access_token;
      
      // Create user profile
      await this.createUserProfile(data.user.id, alias, firstName, carDescription, story);
    }

    return data;
  }

  async signIn(email, password) {
    const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': this.key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error_description || 'Login failed');
    }

    this.currentUser = data.user;
    this.authToken = data.access_token;
    
    return data;
  }

  async signOut() {
    if (this.authToken) {
      await fetch(`${this.url}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': this.key,
          'Authorization': `Bearer ${this.authToken}`
        }
      });
    }
    
    this.currentUser = null;
    this.authToken = null;
  }

  async createUserProfile(userId, alias, firstName, carDescription, story) {
    const profileData = {
      id: userId,
      alias,
      first_name: firstName,
      car_description: carDescription,
      story: story || 'No story yet - but every car has one!',
      qr_code: generateQRCode(alias)
    };

    return this.query('user_profiles', 'POST', profileData);
  }

  async query(table, method = 'GET', data = null) {
    const url = `${this.url}/rest/v1/${table}`;
    const headers = {
      'apikey': this.key,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const options = {
      method,
      headers
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Database error');
    }

    return method === 'DELETE' ? null : await response.json();
  }

  async select(table, columns = '*') {
    return this.query(`${table}?select=${columns}`);
  }

  async insert(table, data) {
    return this.query(table, 'POST', data);
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CarConnectApp = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [currentView, setCurrentView] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showQRCode, setShowQRCode] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  
  const [newProfile, setNewProfile] = useState({
    email: '',
    password: '',
    alias: '',
    firstName: '',
    carDescription: '',
    story: ''
  });

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Load profiles from database
  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await supabase.select('user_profiles');
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
      showNotification('Failed to load profiles', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load profiles on component mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const fileInputRef = useRef(null);

  const handleSearch = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = profiles.filter(profile =>
      profile.alias.toLowerCase().includes(query.toLowerCase()) ||
      profile.car_description.toLowerCase().includes(query.toLowerCase()) ||
      profile.first_name.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };

  const handleRegister = async () => {
    if (!newProfile.email.trim() || !newProfile.password.trim() || !newProfile.alias.trim() || !newProfile.firstName.trim() || !newProfile.carDescription.trim()) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    if (newProfile.password.length < 6) {
      showNotification('Password must be at least 6 characters long', 'error');
      return;
    }

    // Validate alias format
    if (!/^[A-Z0-9]{1,10}$/.test(newProfile.alias)) {
      showNotification('Alias must be 1-10 characters, letters and numbers only', 'error');
      return;
    }
    
    setSaving(true);
    
    try {
      const result = await supabase.signUp(
        newProfile.email,
        newProfile.password,
        newProfile.alias,
        newProfile.firstName,
        newProfile.carDescription,
        newProfile.story
      );
      
      setCurrentUser(result.user);
      
      // Reload profiles to get the new one
      await loadProfiles();
      
      // Reset form
      setNewProfile({ email: '', password: '', alias: '', firstName: '', carDescription: '', story: '' });
      setShowAuth(false);
      setCurrentView('search');
      
      showNotification(`Welcome ${newProfile.firstName}! Your alias is: ${newProfile.alias}`, 'success');
      
      // Show the QR code for the new user
      const newUserProfile = {
        alias: newProfile.alias,
        first_name: newProfile.firstName,
        car_description: newProfile.carDescription,
        story: newProfile.story || 'No story yet - but every car has one!',
        qr_code: generateQRCode(newProfile.alias)
      };
      setShowQRCode(newUserProfile);
      
    } catch (error) {
      console.error('Error registering:', error);
      if (error.message.includes('already been registered')) {
        showNotification('This email is already registered. Try logging in instead.', 'error');
      } else if (error.message.includes('alias')) {
        showNotification('This alias is already taken. Please choose another one.', 'error');
      } else {
        showNotification(error.message || 'Registration failed.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = async () => {
    if (!loginForm.email.trim() || !loginForm.password.trim()) {
      showNotification('Please enter both email and password', 'error');
      return;
    }
    
    setSaving(true);
    
    try {
      const result = await supabase.signIn(loginForm.email, loginForm.password);
      setCurrentUser(result.user);
      setLoginForm({ email: '', password: '' });
      setShowAuth(false);
      showNotification('Welcome back!', 'success');
      
    } catch (error) {
      console.error('Error logging in:', error);
      showNotification(error.message || 'Login failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.signOut();
      setCurrentUser(null);
      showNotification('Logged out successfully', 'success');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Simulate QR code scanning
      showNotification('Scanning QR code...', 'success');
      setTimeout(() => {
        // Simulate finding a random profile
        if (profiles.length > 0) {
          const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
          setSearchQuery(randomProfile.alias);
          handleSearch(randomProfile.alias);
        }
      }, 1500);
    }
  };

  const downloadQRCode = (profile) => {
    const link = document.createElement('a');
    link.download = `CarConnect-${profile.alias}.png`;
    link.href = profile.qr_code;
    link.click();
  };

  const ProfileCard = ({ profile, onClick }) => (
    <div 
      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-green-500"
      onClick={() => onClick(profile)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="bg-green-100 px-3 py-1 rounded-full">
            <span className="font-bold text-green-800 text-lg">{profile.alias}</span>
          </div>
          <QrCode className="w-5 h-5 text-gray-400" />
        </div>
        <span className="text-sm text-gray-500">{new Date(profile.created_at).toLocaleDateString()}</span>
      </div>
      <div className="flex items-center mb-2">
        <User className="w-4 h-4 text-gray-500 mr-2" />
        <span className="font-medium text-gray-700">{profile.first_name}</span>
      </div>
      <div className="mb-2">
        <span className="text-sm text-gray-600 bg-blue-50 px-2 py-1 rounded">{profile.car_description}</span>
      </div>
      <p className="text-gray-600 text-sm line-clamp-2">{profile.story}</p>
    </div>
  );

  const ProfileModal = ({ profile, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Car Profile</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="text-center mb-4">
          <div className="bg-green-100 px-4 py-2 rounded-lg inline-block mb-3">
            <span className="font-bold text-green-800 text-2xl">{profile.alias}</span>
          </div>
          <div className="text-center mb-2">
            <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{profile.car_description}</span>
          </div>
          <div className="flex items-center justify-center mb-2">
            <User className="w-5 h-5 text-gray-500 mr-2" />
            <span className="font-medium text-lg">{profile.first_name}</span>
          </div>
          <p className="text-sm text-gray-500">Created on {new Date(profile.created_at).toLocaleDateString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium mb-2">Car Story:</h3>
          <p className="text-gray-700">{profile.story}</p>
        </div>
      </div>
    </div>
  );

  const QRCodeModal = ({ profile, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Your CarConnect QR Code</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="text-center mb-4">
          <div className="bg-green-100 px-4 py-2 rounded-lg inline-block mb-4">
            <span className="font-bold text-green-800 text-xl">{profile.alias}</span>
          </div>
          <div className="border-2 border-gray-200 rounded-lg p-4 mb-4">
            <img 
              src={profile.qr_code} 
              alt={`QR Code for ${profile.alias}`}
              className="w-48 h-48 mx-auto"
            />
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Place this QR code on your dashboard or car window so others can discover your car story!
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => downloadQRCode(profile)}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `CarConnect - ${profile.alias}`,
                    text: `Check out my car story on CarConnect! Alias: ${profile.alias}`,
                    url: window.location.href
                  });
                } else {
                  showNotification('Sharing not supported on this device', 'error');
                }
              }}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const AuthModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {authMode === 'login' ? 'Login' : 'Create Account'}
          </h2>
          <button onClick={() => setShowAuth(false)} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex mb-4">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-2 px-4 rounded-l-lg ${authMode === 'login' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
          >
            Login
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-2 px-4 rounded-r-lg ${authMode === 'register' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
          >
            Register
          </button>
        </div>

        {authMode === 'login' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Your password"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={saving}
              className="w-full py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={newProfile.email}
                onChange={(e) => setNewProfile({...newProfile, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                value={newProfile.password}
                onChange={(e) => setNewProfile({...newProfile, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alias (Username) *</label>
              <input
                type="text"
                value={newProfile.alias}
                onChange={(e) => setNewProfile({...newProfile, alias: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., MYCAR, TESLA3, HONDA22"
              />
              <p className="text-xs text-gray-500 mt-1">Letters and numbers only, max 10 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
              <input
                type="text"
                value={newProfile.firstName}
                onChange={(e) => setNewProfile({...newProfile, firstName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Your first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Car Description *</label>
              <input
                type="text"
                value={newProfile.carDescription}
                onChange={(e) => setNewProfile({...newProfile, carDescription: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., Blue 2020 Honda Civic, Red Tesla Model 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Car Story</label>
              <textarea
                value={newProfile.story}
                onChange={(e) => setNewProfile({...newProfile, story: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Share the story behind your car!"
              />
            </div>
            <button
              onClick={handleRegister}
              disabled={saving}
              className="w-full py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">CarConnect</h1>
              <p className="text-gray-600">Share your car story through QR codes</p>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser ? (
                <>
                  <span className="text-sm text-gray-600">Welcome back!</span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login / Register
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profiles...</p>
          </div>
        ) : (
          <>
            {/* Navigation */}
            <div className="flex justify-center mb-8">
              <div className="bg-white rounded-lg shadow-md p-1 flex">