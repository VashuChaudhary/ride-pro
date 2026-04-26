import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import MapComponent from '../components/MapComponent';
import { useRouter } from 'expo-router';
import { useRide } from '../context/RideContext';
import { getRoadRoute } from '../utils/locationUtils';

export default function DriverApp() {
  const router = useRouter();
  const { rideState, setRideState, pickup, dropoff, passengerName, rideOtp } = useRide();
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [inputOtp, setInputOtp] = useState('');

  useEffect(() => {
    if (pickup && dropoff) {
      updateRoute();
    }
  }, [pickup, dropoff]);

  const updateRoute = async () => {
    const coords = await getRoadRoute(
      { lat: pickup!.latitude, lon: pickup!.longitude },
      { lat: dropoff!.latitude, lon: dropoff!.longitude }
    );
    setRouteCoords(coords);
  };

  const handleVerifyOtp = () => {
    if (inputOtp === rideOtp) {
      setRideState('ongoing');
      setInputOtp('');
    } else {
      Alert.alert('Invalid OTP', 'The OTP you entered is incorrect. Please ask the passenger for the correct code.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
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
          <View style={styles.centerContent}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Online</Text>
            </View>
            <Text style={styles.sheetTitle}>Looking for rides in Delhi...</Text>
            <Text style={styles.subtitle}>Stay near CP or Huda City for more requests</Text>
          </View>
        )}

        {rideState === 'searching' && (
          <View>
            <View style={styles.requestBadge}>
              <Text style={styles.requestBadgeText}>New Request</Text>
            </View>
            <Text style={styles.sheetTitle}>{passengerName}</Text>
            
            <View style={styles.locationContainer}>
              <View style={[styles.dot, { backgroundColor: '#2e7d32' }]} />
              <Text style={styles.locationValue} numberOfLines={1}>{pickup?.name}</Text>
            </View>
            <View style={styles.locationContainer}>
              <View style={[styles.dot, { backgroundColor: '#d32f2f' }]} />
              <Text style={styles.locationValue} numberOfLines={1}>{dropoff?.name}</Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={() => setRideState('accepted')}>
              <Text style={styles.primaryButtonText}>Accept Ride</Text>
            </TouchableOpacity>
          </View>
        )}

        {rideState === 'accepted' && (
          <View style={styles.centerContent}>
            <Text style={styles.sheetTitle}>Pick up {passengerName}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>To: {pickup?.name}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setRideState('arrived')}>
              <Text style={styles.primaryButtonText}>Arrived at Pickup</Text>
            </TouchableOpacity>
          </View>
        )}

        {rideState === 'arrived' && (
          <View>
            <Text style={styles.sheetTitle}>Enter Start OTP</Text>
            <Text style={styles.subtitle}>Ask {passengerName} for the 4-digit code</Text>
            
            <TextInput
              style={styles.otpInput}
              placeholder="0 0 0 0"
              keyboardType="number-pad"
              maxLength={4}
              value={inputOtp}
              onChangeText={setInputOtp}
            />

            <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp}>
              <Text style={styles.primaryButtonText}>Start Ride</Text>
            </TouchableOpacity>
          </View>
        )}

        {rideState === 'ongoing' && (
          <View style={styles.centerContent}>
            <Text style={styles.statusBadgeOngoing}>Ride in Progress</Text>
            <Text style={styles.sheetTitle}>Heading to destination</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Dropoff: {dropoff?.name}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setRideState('completed')}>
              <Text style={styles.primaryButtonText}>Complete Ride</Text>
            </TouchableOpacity>
          </View>
        )}

        {rideState === 'completed' && (
          <View style={styles.centerContent}>
            <Text style={styles.sheetTitle}>Ride Completed!</Text>
            <Text style={styles.subtitle}>Earnings: ₹150 added to wallet</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setRideState('idle')}>
              <Text style={styles.primaryButtonText}>Go Online</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  header: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  backButton: { backgroundColor: '#fff', padding: 12, borderRadius: 30, elevation: 10 },
  backText: { fontWeight: 'bold' },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    elevation: 20,
    paddingBottom: 40,
  },
  centerContent: { alignItems: 'center' },
  statusBadge: { backgroundColor: '#e8f5e9', padding: 6, borderRadius: 16, marginBottom: 10 },
  statusBadgeOngoing: { backgroundColor: '#e3f2fd', padding: 6, borderRadius: 16, marginBottom: 10 },
  statusText: { color: '#2e7d32', fontWeight: 'bold' },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { color: '#666', marginBottom: 20 },
  requestBadge: { backgroundColor: '#ffebee', padding: 6, borderRadius: 16, alignSelf: 'flex-start', marginBottom: 10 },
  requestBadgeText: { color: '#d32f2f', fontWeight: 'bold' },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  locationValue: { flex: 1, fontSize: 14, color: '#333' },
  primaryButton: { backgroundColor: '#000', padding: 16, borderRadius: 15, alignItems: 'center', width: '100%', marginTop: 10 },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  otpInput: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 15,
    fontSize: 24,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 10,
    marginBottom: 10
  }
});
