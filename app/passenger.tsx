import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ScrollView, Modal, TextInput, ActivityIndicator, Image } from 'react-native';
import * as Location from 'expo-location';
import MapComponent from '../components/MapComponent';
import { useRouter } from 'expo-router';
import { useRide, LocationData } from '../context/RideContext';
import { searchAddress, getAddressFromCoords, getRoadRoute } from '../utils/locationUtils';

export default function PassengerApp() {
  const router = useRouter();
  const { rideState, setRideState, pickup, setPickup, dropoff, setDropoff, driverName, rideOtp } = useRide();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'pickup' | 'dropoff'>('pickup');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pickup && dropoff) {
      updateRoute();
    }
  }, [pickup, dropoff]);

  const updateRoute = async () => {
    try {
      const coords = await getRoadRoute(
        { lat: pickup!.latitude, lon: pickup!.longitude },
        { lat: dropoff!.latitude, lon: dropoff!.longitude }
      );
      setRouteCoords(coords);
    } catch (e) {
      console.error("Route update failed", e);
    }
  };

  const handleLiveLocation = async () => {
    setIsLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        setIsLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const address = await getAddressFromCoords(location.coords.latitude, location.coords.longitude);
      
      setPickup({
        name: address,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Could not fetch live location.');
    } finally {
      setIsLoading(false);
    }
  };

  const openSelector = (type: 'pickup' | 'dropoff') => {
    setSelectingFor(type);
    setSearchQuery('');
    setSearchResults([]);
    setModalVisible(true);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.length > 2) {
      searchTimeout.current = setTimeout(async () => {
        setIsLoading(true);
        const results = await searchAddress(text);
        setSearchResults(results);
        setIsLoading(false);
      }, 500);
    } else {
      setSearchResults([]);
    }
  };

  const selectLocation = (loc: LocationData) => {
    if (selectingFor === 'pickup') setPickup(loc);
    else setDropoff(loc);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <MapComponent 
        style={styles.map} 
        pickup={pickup} 
        dropoff={dropoff} 
        routeCoordinates={routeCoords}
      />
      
      <SafeAreaView style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.bottomSheet}>
        {rideState === 'idle' && (
          <View>
            <Text style={styles.sheetTitle}>Ready to ride?</Text>
            
            <TouchableOpacity style={styles.locationInput} onPress={() => openSelector('pickup')}>
              <View style={styles.inputRow}>
                <View style={[styles.dot, { backgroundColor: '#2e7d32' }]} />
                <Text style={pickup ? styles.locationText : styles.placeholderText} numberOfLines={1}>
                  {pickup ? pickup.name : 'Choose Pickup'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.locationInput} onPress={() => openSelector('dropoff')}>
              <View style={styles.inputRow}>
                <View style={[styles.dot, { backgroundColor: '#d32f2f' }]} />
                <Text style={dropoff ? styles.locationText : styles.placeholderText} numberOfLines={1}>
                  {dropoff ? dropoff.name : 'Where to?'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.primaryButton, (!pickup || !dropoff) && styles.disabledButton]} 
              onPress={() => setRideState('searching')}
              disabled={!pickup || !dropoff}
            >
              <Text style={styles.primaryButtonText}>Find Rides</Text>
            </TouchableOpacity>
          </View>
        )}

        {rideState === 'searching' && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.searchingTitle}>Searching for rides...</Text>
            <Text style={styles.subtitle}>Connecting you to nearby drivers in Delhi</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setRideState('idle')}>
              <Text style={styles.secondaryButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        )}

        {rideState === 'accepted' && (
          <View>
            <View style={styles.acceptedHeader}>
              <View>
                <Text style={styles.sheetTitle}>Driver is coming!</Text>
                <Text style={styles.subtitle}>White Prius • DL 1CA 1234</Text>
              </View>
              <View style={styles.otpContainer}>
                 <Text style={styles.otpLabel}>OTP</Text>
                 <Text style={styles.otpValue}>{rideOtp}</Text>
              </View>
            </View>

            <View style={styles.driverCard}>
              <View style={styles.driverInfoRow}>
                <View style={styles.avatarPlaceholder}><Text>👤</Text></View>
                <View style={{flex: 1, marginLeft: 15}}>
                  <Text style={styles.driverNameText}>{driverName}</Text>
                  <Text style={styles.carNumberText}>Rating: 4.9 ⭐</Text>
                </View>
                <TouchableOpacity style={styles.callButton}><Text>📞</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {rideState === 'arrived' && (
          <View style={styles.centerContent}>
            <Text style={styles.statusBadge}>Arrived</Text>
            <Text style={styles.sheetTitle}>Driver has arrived!</Text>
            <Text style={styles.subtitle}>Share the OTP with driver to start ride</Text>
            
            <View style={styles.largeOtpBox}>
               <Text style={styles.largeOtpText}>{rideOtp}</Text>
            </View>

            <View style={styles.driverCard}>
               <Text style={styles.driverNameText}>{driverName} is waiting at pickup</Text>
            </View>
          </View>
        )}

        {rideState === 'ongoing' && (
          <View style={styles.centerContent}>
            <Text style={styles.statusBadgeOngoing}>Ride in Progress</Text>
            <Text style={styles.sheetTitle}>Heading to Destination</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Destination: {dropoff?.name}</Text>
            <View style={styles.driverCard}>
              <Text style={styles.driverNameText}>Driving with {driverName}</Text>
            </View>
          </View>
        )}

        {rideState === 'completed' && (
          <View style={styles.centerContent}>
            <Text style={styles.completionEmoji}>🏁</Text>
            <Text style={styles.sheetTitle}>Ride Completed!</Text>
            <Text style={styles.subtitle}>Hope you enjoyed your trip in Delhi!</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => {
              setRideState('idle');
              setPickup(null);
              setDropoff(null);
              setRouteCoords([]);
            }}>
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TextInput
                style={styles.searchBar}
                placeholder={`Search for ${selectingFor === 'pickup' ? 'pickup' : 'destination'}...`}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeTextBtn}>
                <Text style={{ fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="always">
              {selectingFor === 'pickup' && !searchQuery && (
                <TouchableOpacity style={styles.liveLocationOption} onPress={handleLiveLocation}>
                  <Text style={styles.liveLocationText}>📍 Use Current Location</Text>
                  {isLoading && <ActivityIndicator size="small" color="#007AFF" style={{marginLeft: 10}} />}
                </TouchableOpacity>
              )}

              {isLoading ? (
                <ActivityIndicator style={{marginTop: 20}} />
              ) : (
                searchResults.map((result, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.resultItem} 
                    onPress={() => selectLocation(result)}
                  >
                    <Text style={styles.resultName}>{result.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { flex: 1 },
  header: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  backButton: { backgroundColor: '#fff', padding: 12, borderRadius: 30, elevation: 10 },
  backText: { fontWeight: 'bold', fontSize: 16 },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 40,
    elevation: 20,
  },
  sheetTitle: { fontSize: 24, fontWeight: '800', marginBottom: 5, color: '#1a1a1a' },
  subtitle: { color: '#666', fontSize: 14, marginBottom: 15 },
  locationInput: { backgroundColor: '#f5f5f5', padding: 18, borderRadius: 15, marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 15 },
  locationText: { color: '#000', fontSize: 16, fontWeight: '500' },
  placeholderText: { color: '#888', fontSize: 16 },
  primaryButton: { backgroundColor: '#000', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10, width: '100%' },
  disabledButton: { backgroundColor: '#ccc' },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  centerContent: { alignItems: 'center', padding: 10 },
  searchingTitle: { fontSize: 18, fontWeight: '600', marginTop: 15, marginBottom: 5 },
  secondaryButton: { marginTop: 15, alignSelf: 'center' },
  secondaryButtonText: { color: 'red', fontWeight: 'bold' },
  acceptedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  otpContainer: { alignItems: 'center', backgroundColor: '#f0f0f0', padding: 8, borderRadius: 12, width: 80 },
  otpLabel: { fontSize: 10, color: '#666', fontWeight: 'bold' },
  otpValue: { fontSize: 18, fontWeight: '900', color: '#000', letterSpacing: 1 },
  largeOtpBox: { backgroundColor: '#000', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20, marginVertical: 20 },
  largeOtpText: { color: '#fff', fontSize: 32, fontWeight: 'bold', letterSpacing: 5 },
  driverCard: { backgroundColor: '#f9f9f9', padding: 20, borderRadius: 20, marginTop: 10, borderWidth: 1, borderColor: '#eee', width: '100%', alignItems: 'center' },
  driverInfoRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  driverNameText: { fontSize: 18, fontWeight: '700' },
  carNumberText: { color: '#666', fontSize: 14 },
  callButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center' },
  statusBadge: { backgroundColor: '#e8f5e9', color: '#2e7d32', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, fontWeight: 'bold', marginBottom: 10, overflow: 'hidden' },
  statusBadgeOngoing: { backgroundColor: '#e3f2fd', color: '#1976d2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, fontWeight: 'bold', marginBottom: 10, overflow: 'hidden' },
  completionEmoji: { fontSize: 50, marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: '#fff' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', marginTop: 10 },
  searchBar: { flex: 1, backgroundColor: '#f0f0f0', padding: 15, borderRadius: 10, fontSize: 16, marginRight: 10 },
  closeTextBtn: { padding: 5 },
  liveLocationOption: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  liveLocationText: { color: '#007AFF', fontWeight: 'bold', fontSize: 16 },
  resultItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  resultName: { fontSize: 16, color: '#333' },
});
