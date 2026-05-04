import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapComponent from '../components/MapComponent';
import { useRouter } from 'expo-router';
import { useRide } from '../context/RideContext';
import { getRoadRoute } from '../utils/locationUtils';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function DriverApp() {
  const router = useRouter();
  const { rideState, setRideState, pickup, dropoff, passengerName, rideOtp, isFemaleOnly, driverName, activeDriverGender, setActiveDriverGender, addRideToHistory, driverLocation, setDriverLocation, driverWallet } = useRide();
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [inputOtp, setInputOtp] = useState('');

  useEffect(() => {
    (async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    })();
  }, []);

  useEffect(() => {
    let title = '';
    let msg = '';
    
    const excluded = rideState === 'searching' && isFemaleOnly && activeDriverGender !== 'female';

    switch (rideState) {
      case 'searching':
        if (!excluded) {
          title = 'New Ride Request!';
          msg = `${passengerName} needs a ride to their destination.`;
        }
        break;
      case 'accepted':
        title = 'Ride Accepted';
        msg = `Head towards the pickup location.`;
        break;
      case 'arrived':
        title = 'Arrived at Pickup';
        msg = `Ask ${passengerName} for the 4-digit OTP.`;
        break;
      case 'ongoing':
        title = 'Ride Started';
        msg = `Follow the route to the destination.`;
        break;
      case 'completed':
        title = 'Ride Completed';
        msg = 'Earnings have been added to your wallet.';
        break;
      default:
        return;
    }

    if (title) {
      Notifications.scheduleNotificationAsync({
        content: { title, body: msg, sound: true },
        trigger: null,
      });
    }
  }, [rideState, passengerName, isFemaleOnly, activeDriverGender]);

  useEffect(() => {
    if (pickup && dropoff) {
      updateRoute();
    }
  }, [pickup, dropoff]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (rideState === 'accepted' && pickup) {
      setDriverLocation({
        name: 'Driver',
        latitude: pickup.latitude - 0.015,
        longitude: pickup.longitude - 0.015,
      });

      interval = setInterval(() => {
        setDriverLocation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            latitude: prev.latitude + (pickup.latitude - prev.latitude) * 0.15,
            longitude: prev.longitude + (pickup.longitude - prev.longitude) * 0.15,
          };
        });
      }, 1000);
    } else if (rideState === 'arrived' && pickup) {
      setDriverLocation({ ...pickup, name: 'Driver' });
    } else if (rideState === 'ongoing' && routeCoords.length > 0) {
      let currentIndex = 0;
      interval = setInterval(() => {
        if (currentIndex < routeCoords.length) {
          const coord = routeCoords[currentIndex];
          setDriverLocation({
            name: 'Driver',
            latitude: coord.latitude,
            longitude: coord.longitude,
          });
          currentIndex += Math.max(1, Math.floor(routeCoords.length / 15));
        }
      }, 1000);
    } else if (rideState === 'idle') {
      setDriverLocation(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rideState, pickup, routeCoords]);

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

  const isExcludedFromRide = rideState === 'searching' && isFemaleOnly && activeDriverGender !== 'female';
  const showIdle = rideState === 'idle' || isExcludedFromRide;
  const showRequest = rideState === 'searching' && !isExcludedFromRide;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
    <View style={styles.container}>
      <MapComponent 
        style={styles.map} 
        pickup={pickup} 
        dropoff={dropoff} 
        routeCoordinates={routeCoords}
        driverLocation={driverLocation}
      />
      
      <SafeAreaView style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={styles.walletBadge}>
              <Text style={styles.walletEmoji}>💳</Text>
              <Text style={styles.walletText}>₹{driverWallet}</Text>
            </View>
            <View style={styles.driverProfileBadge}>
               <Text style={{fontSize: 16}}>{activeDriverGender === 'female' ? '👩' : '👨'}</Text>
               <View style={{marginLeft: 8}}>
                  <Text style={{fontWeight: 'bold', fontSize: 14}}>{driverName}</Text>
                  <Text style={{fontSize: 10, color: activeDriverGender === 'female' ? '#ff4081' : '#666', fontWeight: 'bold'}}>
                    {activeDriverGender === 'female' ? 'Female' : 'Male'}
                  </Text>
               </View>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.bottomSheet}>
        {showIdle && (
          <View style={styles.centerContent}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Online</Text>
            </View>
            <Text style={styles.sheetTitle}>Looking for rides in Delhi...</Text>
            <Text style={styles.subtitle}>Stay near CP or Huda City for more requests</Text>
          </View>
        )}

        {showRequest && (
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
            <Text style={styles.subtitle}>Payment received. Earnings added to wallet.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => {
              if (pickup && dropoff) {
                addRideToHistory({
                  id: Date.now().toString() + '-d',
                  role: 'driver',
                  pickup,
                  dropoff,
                  fare: 150,
                  date: new Date().toLocaleDateString()
                });
              }
              setRideState('idle');
            }}>
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
  header: { position: 'absolute', top: 50, left: 20, right: 20, zIndex: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { backgroundColor: '#fff', padding: 12, borderRadius: 30, elevation: 10 },
  backText: { fontWeight: 'bold' },
  driverProfileBadge: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 30, elevation: 10, flexDirection: 'row', alignItems: 'center' },
  walletBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 30, elevation: 10, marginRight: 10 },
  walletEmoji: { fontSize: 18, marginRight: 5 },
  walletText: { fontWeight: '800', fontSize: 16, color: '#2e7d32' },
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
