import React, { useState, useRef, useEffect } from 'react';
import { Camera, Search, Plus, User, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

// Supabase configuration
const SUPABASE_URL = 'https://vqxsuqsjndlkvjpflhfy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxeHN1cXNqbmRsa3ZqcGZsaGZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyMDE0MTQsImV4cCI6MjA2Njc3NzQxNH0.9rESgHXc7L1PHXXTWpNaAMdSsVP5RchKENHjFVIGsz8';

// State abbreviations mapping
const STATE_ABBREVIATIONS = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

// Simple Supabase client
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  async query(table, method = 'GET', data = null) {
    const url = `${this.url}/rest/v1/${table}`;
    const options = {
      method,
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
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

const LicensePlateApp = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [currentView, setCurrentView] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cameraMode, setCameraMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [newProfile, setNewProfile] = useState({
    plateNumber: '',
    firstName: '',
    description: '',
    state: ''
  });

  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Load plates from database
  const loadPlates = async () => {
    try {
      setLoading(true);
      const data = await supabase.select('plates');
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading plates:', error);
      showNotification('Failed to load plates', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load plates on component mount
  useEffect(() => {
    loadPlates();
  }, []);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleSearch = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = profiles.filter(profile =>
      profile.plate_number.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };

  const handleAddProfile = async () => {
    if (!newProfile.plateNumber.trim() || !newProfile.firstName.trim() || !newProfile.state) {
      showNotification('Please fill in the plate number, first name, and state', 'error');
      return;
    }
    
    setSaving(true);
    
    try {
      const stateAbbr = STATE_ABBREVIATIONS[newProfile.state];
      const plateId = `${stateAbbr}_${newProfile.plateNumber.toUpperCase()}`;
      
      const plateData = {
        id: plateId,
        plate_number: newProfile.plateNumber.toUpperCase(),
        first_name: newProfile.firstName,
        state: newProfile.state,
        description: newProfile.description || null
      };
      
      await supabase.insert('plates', plateData);
      
      // Reload plates to get the new one
      await loadPlates();
      
      // Reset form
      setNewProfile({ plateNumber: '', firstName: '', description: '', state: '' });
      showNotification('Tagged Successfully!', 'success');
      
    } catch (error) {
      console.error('Error saving plate:', error);
      if (error.message.includes('duplicate') || error.message.includes('already exists')) {
        showNotification('This plate has already been added.', 'error');
      } else {
        showNotification('Failed to save tag.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const simulateOCR = (imageData) => {
    // Simulate OCR processing - in a real app, you'd use actual OCR
    const existingPlates = profiles.map(p => p.plate_number);
    const randomPlate = existingPlates.length > 0 
      ? existingPlates[Math.floor(Math.random() * existingPlates.length)]
      : 'DEMO123';
    
    setTimeout(() => {
      setSearchQuery(randomPlate);
      handleSearch(randomPlate);
      setCameraMode(false);
    }, 2000);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        simulateOCR(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      showNotification('Camera access denied or not available', 'error');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg');
      simulateOCR(imageData);
      
      // Stop camera
      const stream = video.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const ProfileCard = ({ profile, onClick }) => (
    <div 
      className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-blue-500"
      onClick={() => onClick(profile)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-100 px-3 py-1 rounded-full">
            <span className="font-bold text-blue-800 text-lg">{profile.plate_number}</span>
          </div>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{profile.state}</span>
        </div>
        <span className="text-sm text-gray-500">{new Date(profile.created_at).toLocaleDateString()}</span>
      </div>
      <div className="flex items-center mb-2">
        <User className="w-4 h-4 text-gray-500 mr-2" />
        <span className="font-medium text-gray-700">{profile.first_name}</span>
      </div>
      <p className="text-gray-600 text-sm line-clamp-2">{profile.description}</p>
    </div>
  );

  const ProfileModal = ({ profile, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">License Plate Profile</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="text-center mb-4">
          <div className="bg-blue-100 px-4 py-2 rounded-lg inline-block mb-3">
            <span className="font-bold text-blue-800 text-2xl">{profile.plate_number}</span>
          </div>
          <div className="text-center mb-2">
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{profile.state}</span>
          </div>
          <div className="flex items-center justify-center mb-2">
            <User className="w-5 h-5 text-gray-500 mr-2" />
            <span className="font-medium text-lg">{profile.first_name}</span>
          </div>
          <p className="text-sm text-gray-500">Added on {new Date(profile.created_at).toLocaleDateString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium mb-2">About this plate:</h3>
          <p className="text-gray-700">{profile.description}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">PlateSpotter</h1>
          <p className="text-gray-600">Discover the stories behind license plates</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading plates...</p>
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
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-blue-500'
                  }`}
                >
                  <Search className="w-4 h-4 inline mr-2" />
                  Search
                </button>
                <button
                  onClick={() => setCurrentView('add')}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    currentView === 'add' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:text-blue-500'
                  }`}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Plate
                </button>
              </div>
            </div>

            {/* Search View */}
            {currentView === 'search' && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4">Find a License Plate</h2>
                  
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Enter license plate number..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        handleSearch(e.target.value);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleSearch(searchQuery)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCameraMode(!cameraMode);
                        if (!cameraMode) startCamera();
                      }}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {cameraMode ? 'Stop Camera' : 'Use Camera'}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
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

                {/* Camera Mode */}
                {cameraMode && (
                  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="text-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full max-w-md mx-auto rounded-lg mb-4"
                      />
                      <button
                        onClick={capturePhoto}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Capture & Analyze
                      </button>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                )}

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
                    <p>No license plates found matching "{searchQuery}"</p>
                  </div>
                )}

                {/* All Profiles */}
                {!searchQuery && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      All Registered Plates ({profiles.length})
                    </h3>
                    {profiles.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No plates registered yet. Be the first to add one!</p>
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

            {/* Add Plate View */}
            {currentView === 'add' && (
              <div className="max-w-md mx-auto">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Add Your License Plate</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        License Plate Number *
                      </label>
                      <input
                        type="text"
                        value={newProfile.plateNumber}
                        onChange={(e) => setNewProfile({...newProfile, plateNumber: e.target.value.toUpperCase()})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., MYPLATE"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={newProfile.firstName}
                        onChange={(e) => setNewProfile({...newProfile, firstName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your first name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State *
                      </label>
                      <select
                        value={newProfile.state}
                        onChange={(e) => setNewProfile({...newProfile, state: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select your state</option>
                        {states.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={newProfile.description}
                        onChange={(e) => setNewProfile({...newProfile, description: e.target.value})}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Tell us about your license plate! What's the story behind it?"
                      />
                    </div>
                    
                    <button
                      onClick={handleAddProfile}
                      disabled={saving}
                      className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        'Add My Plate'
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
          </>
        )}
      </div>
    </div>
  );
};

export default LicensePlateApp;