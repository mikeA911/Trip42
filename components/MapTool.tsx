import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, Modal, Dimensions, Linking } from 'react-native';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import { sharedStyles as styles } from '../styles';

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

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      console.log('=== MAP TOOL: Requesting location permissions ===');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('=== MAP TOOL: Location permission status:', status);

      if (status !== 'granted') {
        console.error('=== MAP TOOL: Location permission denied ===');
        Alert.alert('Permission needed', 'Location permission is required to show nearby places');
        return;
      }

      console.log('=== MAP TOOL: Getting current position ===');
      const currentLocation = await Location.getCurrentPositionAsync({});
      console.log('=== MAP TOOL: Current location obtained:', currentLocation.coords);

      setLocation(currentLocation.coords);

      // Get address using reverse geocoding
      await getAddressFromCoordinates(currentLocation.coords.latitude, currentLocation.coords.longitude);
    } catch (error: any) {
      console.error('=== MAP TOOL ERROR: Failed to get current location ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      Alert.alert('Error', `Failed to get current location: ${error.message}`);
    }
  };

  const getAddressFromCoordinates = async (latitude: number, longitude: number) => {
    setIsGettingAddress(true);
    try {
      console.log('=== MAP TOOL: Starting reverse geocoding ===');
      console.log('Coordinates:', { latitude, longitude });

      const apiKey = process.env.GOOGLE_MAPS_API || 'AIzaSyCClCgAlAsTxauYkK5Tom6p_atUxZi3WeA';
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?` +
        `latlng=${latitude},${longitude}&` +
        `key=${apiKey}`;

      console.log('=== MAP TOOL: Reverse geocoding URL:', geocodingUrl);

      const response = await fetch(geocodingUrl);
      console.log('=== MAP TOOL: Geocoding response status:', response.status);

      const data = await response.json();
      console.log('=== MAP TOOL: Geocoding response data:', data);

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        // Get the most relevant address (usually the first result)
        const address = data.results[0].formatted_address;
        console.log('=== MAP TOOL: Address found:', address);
        setAddress(address);
      } else {
        console.warn('=== MAP TOOL: Geocoding failed with status:', data.status);
        console.warn('=== MAP TOOL: Error message:', data.error_message);
        setAddress('Address not available');
      }
    } catch (error: any) {
      console.error('=== MAP TOOL ERROR: Failed to get address ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      setAddress('Address lookup failed');
    } finally {
      setIsGettingAddress(false);
    }
  };

  const searchNearbyPlaces = async (query: string) => {
    if (!location) {
      console.error('=== MAP TOOL ERROR: No location available for search ===');
      Alert.alert('Location Required', 'Please enable location services to search nearby places');
      return;
    }

    setIsLoading(true);
    try {
      console.log('=== MAP TOOL: Starting places search ===');
      console.log('Search query:', query);
      console.log('Current location:', location);

      const apiKey = process.env.GOOGLE_MAPS_API || 'AIzaSyCClCgAlAsTxauYkK5Tom6p_atUxZi3WeA';
      const { latitude, longitude } = location;

      // Use Google Places API for nearby search
      const searchQuery = query.trim() || 'establishment';
      const radius = 5000; // 5km radius for rural areas

      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
        `location=${latitude},${longitude}&` +
        `radius=${radius}&` +
        `keyword=${encodeURIComponent(searchQuery)}&` +
        `key=${apiKey}`;

      console.log('=== MAP TOOL: Places search URL:', placesUrl);

      const response = await fetch(placesUrl);
      console.log('=== MAP TOOL: Places API response status:', response.status);

      const data = await response.json();
      console.log('=== MAP TOOL: Places API response data:', data);

      if (data.status !== 'OK') {
        console.error('=== MAP TOOL ERROR: Places API error ===');
        console.error('Status:', data.status);
        console.error('Error message:', data.error_message);
        console.error('Error message:', data.error_message);
        console.error('Full response:', data);

        // Handle specific error cases
        if (data.status === 'ZERO_RESULTS') {
          console.warn('=== MAP TOOL: No places found in search area ===');
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
        console.warn('=== MAP TOOL: No places found ===');
        console.warn('Search query:', searchQuery);
        console.warn('Location:', { latitude, longitude });
        setPlaces([]);
        Alert.alert('No Results', `No places found for "${searchQuery}" near your location`);
        return;
      }

      console.log('=== MAP TOOL: Processing', data.results.length, 'places ===');

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

      console.log('=== MAP TOOL: Processed places:', processedPlaces);
      setPlaces(processedPlaces);

      if (processedPlaces.length === 0) {
        Alert.alert('No Results', `No places found for "${searchQuery}" near your location`);
      }
    } catch (error: any) {
      console.error('=== MAP TOOL ERROR: Failed to search nearby places ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
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
    const apiKey = process.env.GOOGLE_MAPS_API || 'AIzaSyCClCgAlAsTxauYkK5Tom6p_atUxZi3WeA';

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
              <WebView
                source={{ html: generateMapHTML(location.latitude, location.longitude, places.slice(0, 5), 13, undefined, undefined, undefined) }}
                style={styles.inlineMap}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            </View>

            <View style={styles.locationActions}>
              <TouchableOpacity
                style={styles.fullMapButton}
                onPress={() => setShowMapModal(true)}
              >
                <Text style={styles.fullMapButtonText}>View Map</Text>
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
                        console.log('=== DIRECTIONS BUTTON: Place object:', place);
                        console.log('=== DIRECTIONS BUTTON: Place geometry:', place.geometry);
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
            <WebView
              source={{ html: generateMapHTML(location.latitude, location.longitude, places, 13, selectedPlace?.geometry?.location?.lat, selectedPlace?.geometry?.location?.lng, selectedPlace) }}
              style={styles.mapWebView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};

export default MapTool;