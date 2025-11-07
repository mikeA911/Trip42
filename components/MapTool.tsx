import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, Modal, Dimensions, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { sharedStyles as styles } from '../styles';
import { ChatbotModal } from './ChatbotModal';
import { getPrompt, getThemeCharacter, getCharacterForPromptType } from '../services/promptService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MapToolProps {
  onBack?: () => void;
}

const MapTool: React.FC<MapToolProps> = ({ onBack }) => {
  const [location, setLocation] = useState<any>(null);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [places, setPlaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingAddress, setIsGettingAddress] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [showFordChatbot, setShowFordChatbot] = useState(false);
  const [aiTheme, setAiTheme] = useState('h2g2');
  const [themeCharacter, setThemeCharacter] = useState<{ character?: string; avatar?: string }>({});

  useEffect(() => {
    getCurrentLocation();
    loadUserTheme();
  }, []);

  const loadUserTheme = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setAiTheme(parsedSettings.aiTheme || 'h2g2');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  // Load theme character for map exploration when theme changes
  useEffect(() => {
    const loadMapCharacter = async () => {
      try {
        const characterData = await getCharacterForPromptType(aiTheme, 'chatbotMap');
        setThemeCharacter(characterData);
        console.log('🎯 Loaded map character:', characterData.character);
      } catch (error) {
        console.log('⚠️ Could not load map character, using fallback');
        // Fallback to theme-specific defaults
        const fallbackCharacters: { [theme: string]: { character?: string; avatar?: string } } = {
          'h2g2': { character: 'Ford', avatar: 'fordPretext.png' },
          'QT-GR': { character: 'Vincent', avatar: 'vincent.png' },
          'TP': { character: 'Vimes', avatar: 'vimes.png' }
        };
        setThemeCharacter(fallbackCharacters[aiTheme] || fallbackCharacters['h2g2']);
      }
    };
    loadMapCharacter();
  }, [aiTheme]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required to show nearby places');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});

      setLocation(currentLocation.coords);

      // Get address using reverse geocoding
      await getAddressFromCoordinates(currentLocation.coords.latitude, currentLocation.coords.longitude);
    } catch (error: any) {
      Alert.alert('Error', `Failed to get current location: ${error.message}`);
    }
  };

  const getAddressFromCoordinates = async (latitude: number, longitude: number) => {
    setIsGettingAddress(true);
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API;

      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?` +
        `latlng=${latitude},${longitude}&` +
        `key=${apiKey}`;

      const response = await fetch(geocodingUrl);

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        // Get the most relevant address (usually the first result)
        const address = data.results[0].formatted_address;
        setAddress(address);
      } else {
        setAddress('Address not available');
      }
    } catch (error: any) {
      setAddress('Address lookup failed');
    } finally {
      setIsGettingAddress(false);
    }
  };

  const searchNearbyPlaces = async (query: string) => {
    if (!location) {
      Alert.alert('Location Required', 'Please enable location services to search nearby places');
      return;
    }

    setIsLoading(true);
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API;

      const { latitude, longitude } = location;

      // Use Google Places API for nearby search
      const searchQuery = query.trim() || 'establishment';
      const radius = 5000; // 5km radius for rural areas

      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${latitude},${longitude}&` +
        `radius=${radius}&` +
        `keyword=${encodeURIComponent(searchQuery)}&` +
        `key=${apiKey}`;

      const response = await fetch(placesUrl);

      const data = await response.json();

      if (data.status !== 'OK') {
        // Handle specific error cases
        if (data.status === 'ZERO_RESULTS') {
          Alert.alert(
            'No Results Found',
            `No ${searchQuery} found within 5km of your location. Try:\n• Different search terms (restaurant, pharmacy, store)\n• Moving to a more populated area\n• Checking your internet connection`,
            [{ text: 'OK' }]
          );
          return;
        }

        Alert.alert('Search Error', `Google Places API error: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`);
        return;
      }

      if (!data.results || data.results.length === 0) {
        setPlaces([]);
        Alert.alert('No Results', `No places found for "${searchQuery}" near your location`);
        return;
      }

      // Process the results
      const processedPlaces = data.results.slice(0, 10).map((place: any, index: number) => {
        // Calculate approximate distance (simplified)
        const placeLat = place.geometry.location.lat;
        const placeLng = place.geometry.location.lng;
        const distance = calculateDistance(latitude, longitude, placeLat, placeLng);

        return {
          id: place.place_id || `place-${index}`,
          name: place.name,
          type: getPlaceType(place.types),
          distance: `${distance.toFixed(1)} km`,
          rating: place.rating || 'N/A',
          address: place.vicinity || 'Address not available',
          photoRef: place.photos?.[0]?.photo_reference,
          priceLevel: place.price_level,
          isOpen: place.opening_hours?.open_now,
          geometry: {
            location: {
              lat: placeLat,
              lng: placeLng
            }
          }
        };
      });

      setPlaces(processedPlaces);

      if (processedPlaces.length === 0) {
        Alert.alert('No Results', `No places found for "${searchQuery}" near your location`);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to search nearby places: ${error.message}. Please check your internet connection.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Map Google place types to our categories
  const getPlaceType = (types: string[]) => {
    if (!types || types.length === 0) return 'establishment';

    // Priority order for categorization
    const typeMapping: { [key: string]: string } = {
      'pharmacy': 'health',
      'hospital': 'health',
      'doctor': 'health',
      'dentist': 'health',
      'restaurant': 'food',
      'cafe': 'food',
      'bar': 'food',
      'food': 'food',
      'supermarket': 'shopping',
      'store': 'shopping',
      'shopping_mall': 'shopping',
      'bank': 'finance',
      'atm': 'finance',
      'hotel': 'lodging',
      'lodging': 'lodging'
    };

    for (const type of types) {
      if (typeMapping[type]) {
        return typeMapping[type];
      }
    }

    return types[0]; // Return first type if no mapping found
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'shopping': return '🛍️';
      case 'health': return '🏥';
      case 'food': return '🍽️';
      default: return '📍';
    }
  };

  const generateMapHTML = (userLat: number, userLng: number, placesToShow: any[] = [], zoom = 13, centerLat?: number, centerLng?: number, selectedPlace?: any) => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API;

    const actualCenterLat = centerLat || userLat;
    const actualCenterLng = centerLng || userLng;
    const actualZoom = centerLat ? 15 : zoom;

    // Create markers for user location and places
    const markers = [
      { lat: userLat, lng: userLng, title: 'Your Location', icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' }
    ];

    // Add place markers - if selectedPlace is provided, only show that place
    if (selectedPlace && selectedPlace.geometry?.location) {
      markers.push({
        lat: selectedPlace.geometry.location.lat,
        lng: selectedPlace.geometry.location.lng,
        title: selectedPlace.name,
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-pushpin.png'
      });
    } else {
      // Add all place markers
      placesToShow.forEach((place) => {
        if (place.geometry?.location) {
          markers.push({
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            title: place.name,
            icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
          });
        }
      });
    }

    const markersJS = markers.map(marker =>
      `new google.maps.Marker({
        position: { lat: ${marker.lat}, lng: ${marker.lng} },
        map: map,
        title: '${marker.title}',
        icon: '${marker.icon}'
      })`
    ).join(',');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Map</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}"></script>
          <style>
            html, body { height: 100%; margin: 0; padding: 0; }
            #map { height: 100%; width: 100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            function initMap() {
              const centerLocation = { lat: ${actualCenterLat}, lng: ${actualCenterLng} };
              const map = new google.maps.Map(document.getElementById('map'), {
                zoom: ${actualZoom},
                center: centerLocation,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false
              });

              // Add markers
              const markers = [${markersJS}];
            }
            initMap();
          </script>
        </body>
      </html>
    `;
  };

  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🗺️ Local Map Explorer</Text>

        {/* Current Location */}
        {location && (
          <View style={styles.locationCard}>
            <Text style={styles.locationTitle}>📍 Your Location</Text>
            <Text style={styles.locationText}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
            {address ? (
              <Text style={styles.locationAddress}>
                📌 {isGettingAddress ? 'Getting address...' : address}
              </Text>
            ) : (
              <Text style={styles.locationAddress}>
                📌 Getting address...
              </Text>
            )}

            {/* Map Display */}
            <View style={styles.mapContainer}>
              {Platform.OS === 'web' ? (
                <iframe
                  src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3876.0012!2d${location.longitude}!3d${location.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDU1JzA3LjIiTiAxMDTCsDg5JzQ4LjQiRQ!5e0!3m2!1sen!2s!4v1633020000000!5m2!1sen!2s`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 10,
                  }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <WebView
                  source={{ html: generateMapHTML(location.latitude, location.longitude, places.slice(0, 5), 13, undefined, undefined, undefined) }}
                  style={styles.inlineMap}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              )}
            </View>

            <View style={styles.locationActions}>
              <TouchableOpacity
                style={styles.fullMapButton}
                onPress={() => setShowMapModal(true)}
              >
                <Text style={styles.fullMapButtonText}>View Map</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fullMapButton}
                onPress={() => setShowFordChatbot(true)}
              >
                <Text style={styles.fullMapButtonText}>Ask {themeCharacter.character || 'Ford'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search nearby places (restaurant, pharmacy, etc.)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => searchNearbyPlaces(searchQuery)}
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => searchNearbyPlaces(searchQuery)}
            disabled={isLoading}
          >
            <Text style={styles.searchButtonText}>
              {isLoading ? '🔍' : 'Search'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Places List */}
        {places.length > 0 && (
          <View style={styles.placesSection}>
            <Text style={styles.sectionTitle}>📍 Nearby Places</Text>
            {places.map((place) => (
              <TouchableOpacity key={place.id} style={styles.placeCard}>
                <View style={styles.placeIcon}>
                  <Text style={styles.placeIconText}>
                    {getPlaceIcon(place.type)}
                  </Text>
                </View>
                <View style={styles.placeContent}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <View style={styles.placeDetailsRow}>
                    <Text style={styles.placeRating}>
                      ⭐ {place.rating !== 'N/A' ? place.rating : 'No rating'}
                    </Text>
                    <Text style={styles.placeDistance}>
                      📏 {place.distance}
                    </Text>
                    {place.priceLevel && (
                      <Text style={styles.placePrice}>
                        💰 {'$'.repeat(place.priceLevel)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.placeAddress}>{place.address}</Text>
                  {place.isOpen !== undefined && (
                    <Text style={[
                      styles.placeStatus,
                      place.isOpen ? styles.placeOpen : styles.placeClosed
                    ]}>
                      {place.isOpen ? '🟢 Open' : '🔴 Closed'}
                    </Text>
                  )}
                  <View style={styles.placeActions}>
                    <TouchableOpacity
                      style={styles.viewMapButton}
                      onPress={() => {
                        setSelectedPlace(place);
                        // Small delay to ensure state is updated before modal opens
                        setTimeout(() => setShowMapModal(true), 100);
                      }}
                    >
                      <Text style={styles.viewMapButtonText}>View on Map</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.directionsButton}
                      onPress={() => {
                        if (place.geometry && place.geometry.location) {
                          const url = `https://www.google.com/maps/dir/?api=1&origin=${location.latitude},${location.longitude}&destination=${place.geometry.location.lat},${place.geometry.location.lng}&travelmode=driving`;
                          Linking.openURL(url);
                        } else {
                          Alert.alert('Error', 'Location data not available for this place');
                        }
                      }}
                    >
                      <Text style={styles.directionsButtonText}>Directions</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Search Buttons */}
        <View style={styles.quickSearchSection}>
          <Text style={styles.sectionTitle}>🔍 Quick Search</Text>
          <View style={styles.quickButtons}>
            {['restaurant', 'pharmacy', 'hospital', 'bank', 'hotel'].map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.quickButton}
                onPress={() => {
                  setSearchQuery(category);
                  searchNearbyPlaces(category);
                }}
              >
                <Text style={styles.quickButtonText}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity
              style={styles.mapModalCloseButton}
              onPress={() => setShowMapModal(false)}
            >
              <Text style={styles.mapModalCloseButtonText}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>Your Location</Text>
            <View style={styles.mapModalPlaceholder} />
          </View>
          {location && (
            Platform.OS === 'web' ? (
              <iframe
                src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3876.0012!2d${selectedPlace?.geometry?.location?.lng || location.longitude}!3d${selectedPlace?.geometry?.location?.lat || location.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDU1JzA3LjIiTiAxMDTCsDg5JzQ4LjQiRQ!5e0!3m2!1sen!2s`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <WebView
                source={{ html: generateMapHTML(location.latitude, location.longitude, places, 13, selectedPlace?.geometry?.location?.lat, selectedPlace?.geometry?.location?.lng, selectedPlace) }}
                style={styles.mapWebView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            )
          )}
        </View>
      </Modal>

      {/* Theme-based Chatbot Modal */}
      <ChatbotModal
        visible={showFordChatbot}
        onClose={() => setShowFordChatbot(false)}
        systemPrompt={`You are ${themeCharacter.character || 'Ford Pretext'}, Field Researcher for the Hitchhiker's Guide to the Galaxy,
and the Local Map Explorer for HitchTrip.

YOUR PURPOSE:
Help travelers discover their neighborhood through conversation. Not by showing
them Google Maps results, but by helping them THINK about where they are, what
matters, and what's worth exploring on foot.

CHARACTER (Brief):
- 15 years hitchhiking the galaxy; genuinely experienced
- Curious about local culture and how places work
- Street-smart; knows what matters vs. what's famous
- Warm, sardonic, observant
- Actually interested in helping travelers explore authentically
- British understatement; intelligent without pretension

WHAT YOU RECEIVE:
- User's current GPS location (latitude, longitude): ${location?.latitude || 'unknown'}, ${location?.longitude || 'unknown'}
- Current neighborhood/district name (or just coordinates if no name available): ${address || 'unknown'}
- Current city and country: ${address?.split(',')[address.split(',').length - 1]?.trim() || 'unknown'}
- Time of day: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}

WHAT YOU DON'T DO:
- You do NOT interpret Google Maps results
- You do NOT recommend specific restaurants or places from search results
- The quick search buttons (Restaurants, Pharmacy, Hospital, Bank, Hotel)
  are for users to find places themselves—that's their job
- You don't compete with Google Maps; you complement it

WHAT YOU DO:
1. Understand where they are geographically and culturally
2. Ask what they're curious about
3. Help them THINK about neighborhood exploration
4. Suggest exploration STRATEGIES, not specific places
5. Explain how neighborhoods actually work
6. Connect their current location to their travel pattern
7. Encourage authentic discovery through conversation
8. Reference their previous notes when relevant
9. Make them see their current location as a real place, not just coordinates

RESPONSE APPROACH:

When user opens the map at their location:
- Acknowledge where they are
- Show you understand the neighborhood/area
- Ask what they're interested in discovering
- Suggest exploration strategies (timing, direction, what to look for)
- Encourage them to use the search buttons for practical needs
- Help them think about WHY certain areas might be interesting

EXAMPLE SCENARIOS:

**Scenario 1: User Opens Map in Unknown Area**
${themeCharacter.character || 'FORD'}: "Right then. You're at [location name], which is [neighborhood type].
Not sure what that area is like? Go walk around. Look for where locals gather—
food stalls, coffee shops, morning markets. Those are your real guides.
What are you curious about?"

**Scenario 2: User Asks "What's Around Here?"**
${themeCharacter.character || 'FORD'}: "Hard to say without knowing what interests you. If you need practical
things—food, pharmacy, hospital—use the search buttons above. But if you want
to actually explore the neighborhood, head in that direction (point to map).
Walk 15 minutes. See what you find. What kind of discovery are you after?"

**Scenario 3: User Needs a Restaurant**
${themeCharacter.character || 'FORD'}: "Tap the Restaurants button. That's the fastest way. Or—if you want
the REAL experience—walk into a residential area and eat where locals eat.
Follow the smell of cooking. No English menu? Perfect. Point at what looks good."

**Scenario 4: User is in a Market Area**
${themeCharacter.character || 'FORD'}: "You're in a market zone. These are gold—real daily life happens here.
Walk around. Talk to vendors. Buy something you can't identify. That's the
adventure. What time is it? Morning markets are different from evening markets."

**Scenario 5: User's Location is Vague**
${themeCharacter.character || 'FORD'}: "You're at coordinates [JXQM+RWF], Cambodia. That's a plus code,
not a neighborhood name—Google Maps sometimes gives these instead of addresses.
It means you're in a specific spot. Walk around, find street signs, ask a local
'What's this area called?' That's part of the adventure."

TONE:
- Conversational, natural
- Warm curiosity
- Encourages authentic discovery
- Respects local culture
- Mix practical advice with philosophical observation
- British understatement: "rather," "quite," "you see"
- Not pushy; just genuinely interested in their exploration

WHAT NOT TO DO:
- Don't list specific restaurants or places
- Don't try to beat Google Maps at its job
- Don't be condescending about tourism
- Don't assume what they want
- Don't force recommendations
- Don't break character

WHAT ALWAYS DO:
- Ask what they're actually curious about
- Acknowledge their current location (even if vague)
- Suggest exploration STRATEGIES, not destinations
- Point them to search buttons for practical needs
- Encourage walking and discovery
- Connect to their travel history when relevant
- Stay curious and engaged

WHAT SPECIFIC LOCATION KNOWLEDGE (Reference):

Southeast Asia neighborhoods generally have:
- **Morning Markets** — Peak 6-9am, locals shopping, best energy
- **Residential Areas** — Where actual life happens, away from main roads
- **Street Food Clusters** — Often near markets or transport hubs
- **Temples/Pagodas** — Neighborhood temples vs. famous ones (different vibes)
- **Coffee Shops** — Where locals sit for hours working or watching life
- **Pharmacies & Convenience Stores** — Heart of local community
- **Night Markets/Bazaars** — Different energy than day markets, opens 5-9pm
- **Alleys/Sois** — Often more interesting than main streets

CONVERSATION STARTERS:

When they first open map:
"Right then. Where are you? What's your neighborhood like—can you see it around you?
And what are you in the mood for—practical things or exploration?"

When they ask for help:
"What kind of discovery are you after? Food? Culture? Just wandering?
Or do you need something specific—hospital, pharmacy, that sort of thing?"

When they seem lost:
"No worries. Use the search buttons for practical needs. For exploration,
just walk in one direction for 20 minutes, then explore from there.
You'll find what you need."

When they reference previous travels:
"Ah yes, I see from your notes you were in [place] last week. This area's
different—how's it comparing for you so far?"

CRITICAL PRINCIPLE:
Your job is to make them THINK about exploration, not to DO the exploration for them.
${themeCharacter.character || 'Ford Pretext'} is a thinking partner, not a guidebook.`}
        chatbotName={themeCharacter.character || "Ford Pretext"}
        chatbotAvatar={themeCharacter.avatar ? { uri: themeCharacter.avatar } : require('../public/icons/fordPretext.png')}
        theme={aiTheme}
      />
    </ScrollView>
  );
};

export default MapTool;