import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Search, Plus, User, Upload, X, CheckCircle, AlertCircle, Download, Share2 } from 'lucide-react';

// Generate a unique 6-character alias
const generateAlias = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate QR code data URL (simplified - in real app you'd use a proper QR library)
const generateQRCode = (alias) => {
  // This is a placeholder - in a real app, use a QR code library like qrcode.js
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

const CarConnectApp = () => {
  const [profiles, setProfiles] = useState([
    {
      id: 'DEMO01',
      alias: 'DEMO01',
      first_name: 'Alex',
      car_description: 'Red Honda Civic',
      story: 'This is my first car! Got it for my 18th birthday and have been on so many adventures with it.',
      created_at: new Date().toISOString(),
      qr_code: null
    },
    {
      id: 'TESLA2',
      alias: 'TESLA2',
      first_name: 'Jordan',
      car_description: 'Blue Tesla Model 3',
      story: 'Switched to electric and loving every mile. This car represents my commitment to sustainability!',
      created_at: new Date().toISOString(),
      qr_code: null
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [currentView, setCurrentView] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showQRCode, setShowQRCode] = useState(null);
  
  const [newProfile, setNewProfile] = useState({
    alias: '',
    firstName: '',
    carDescription: '',
    story: ''
  });

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

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

  const handleAddProfile = async () => {
    if (!newProfile.firstName.trim() || !newProfile.carDescription.trim()) {
      showNotification('Please fill in your name and car description', 'error');
      return;
    }
    
    setSaving(true);
    
    try {
      // Generate unique alias if not provided
      let alias = newProfile.alias.trim().toUpperCase();
      if (!alias) {
        do {
          alias = generateAlias();
        } while (profiles.some(p => p.alias === alias));
      } else {
        // Check if custom alias already exists
        if (profiles.some(p => p.alias === alias)) {
          showNotification('This alias is already taken. Try another one!', 'error');
          setSaving(false);
          return;
        }
      }
      
      const profileData = {
        id: alias,
        alias: alias,
        first_name: newProfile.firstName,
        car_description: newProfile.carDescription,
        story: newProfile.story || 'No story yet - but every car has one!',
        created_at: new Date().toISOString(),
        qr_code: generateQRCode(alias)
      };
      
      // Add to profiles (in real app, this would be saved to database)
      setProfiles(prev => [profileData, ...prev]);
      
      // Reset form
      setNewProfile({ alias: '', firstName: '', carDescription: '', story: '' });
      showNotification(`Car profile created! Your alias is: ${alias}`, 'success');
      
      // Show the QR code
      setShowQRCode(profileData);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      showNotification('Failed to create profile.', 'error');
    } finally {
      setSaving(false);
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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">CarConnect</h1>
          <p className="text-gray-600">Share your car story through QR codes</p>
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
                <button
                  onClick={() => setCurrentView('search')}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    currentView === 'search' 
                    ? 'bg-green-500 text-white' 
                    : 'text-gray-600 hover:text-green-500'
                  }`}
                >
                  <Search className="w-4 h-4 inline mr-2" />
                  Discover
                </button>
                <button
                  onClick={() => setCurrentView('add')}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    currentView === 'add' 
                    ? 'bg-green-500 text-white' 
                    : 'text-gray-600 hover:text-green-500'
                  }`}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Create Profile
                </button>
              </div>
            </div>

            {/* Search View */}
            {currentView === 'search' && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4">Discover Car Stories</h2>
                  
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Enter car alias (e.g., TESLA2, DEMO01)..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        handleSearch(e.target.value);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleSearch(searchQuery)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Scan QR Code
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Search Results</h3>
                    {searchResults.map(profile => (
                      <ProfileCard
                        key={profile.id}
                        profile={profile}
                        onClick={setSelectedProfile}
                      />
                    ))}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No car profiles found matching "{searchQuery}"</p>
                  </div>
                )}

                {/* All Profiles */}
                {!searchQuery && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Car Community ({profiles.length})
                    </h3>
                    {profiles.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No car profiles yet. Be the first to share your story!</p>
                      </div>
                    ) : (
                      profiles.map(profile => (
                        <ProfileCard
                          key={profile.id}
                          profile={profile}
                          onClick={setSelectedProfile}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Add Profile View */}
            {currentView === 'add' && (
              <div className="max-w-md mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Create Your Car Profile</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Alias (Optional)
                      </label>
                      <input
                        type="text"
                        value={newProfile.alias}
                        onChange={(e) => setNewProfile({...newProfile, alias: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., MYCAR, TESLA3, HONDA22 (leave blank for auto-generated)"
                      />
                      <p className="text-xs text-gray-500 mt-1">Letters and numbers only, max 10 characters</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        value={newProfile.firstName}
                        onChange={(e) => setNewProfile({...newProfile, firstName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Your first name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Car Description *
                      </label>
                      <input
                        type="text"
                        value={newProfile.carDescription}
                        onChange={(e) => setNewProfile({...newProfile, carDescription: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., Blue 2020 Honda Civic, Red Tesla Model 3"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Car Story
                      </label>
                      <textarea
                        value={newProfile.story}
                        onChange={(e) => setNewProfile({...newProfile, story: e.target.value})}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Share the story behind your car! First car? Dream car? Adventure companion?"
                      />
                    </div>
                    
                    <button
                      onClick={handleAddProfile}
                      disabled={saving}
                      className="w-full py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        'Create My Car Profile'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Modal */}
            {selectedProfile && (
              <ProfileModal
                profile={selectedProfile}
                onClose={() => setSelectedProfile(null)}
              />
            )}

            {/* QR Code Modal */}
            {showQRCode && (
              <QRCodeModal
                profile={showQRCode}
                onClose={() => setShowQRCode(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CarConnectApp;