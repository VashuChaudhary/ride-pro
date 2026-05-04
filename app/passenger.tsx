import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Switch, PanResponder, Animated, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapComponent from '../components/MapComponent';
import { LocationData, useRide } from '../context/RideContext';
import { getAddressFromCoords, getRoadRoute, searchAddress, fetchRealTimeWeather, calculateLiveDemand, findNearestEmergencyServices } from '../utils/locationUtils';
import { calculateDistance, predictRidePrice } from '../utils/mlPricingEngine';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function PassengerApp() {
  const router = useRouter();
  const { rideState, setRideState, pickup, setPickup, dropoff, setDropoff, driverName, rideOtp, setRideOtp, isFemaleOnly, setIsFemaleOnly, activeDriverGender, addRideToHistory, isPoolEnabled, setIsPoolEnabled, poolMatch, setPoolMatch, driverLocation, passengerWallet, setPassengerWallet, setDriverWallet, schedules, addSchedule, toggleSchedule, deleteSchedule, savedPlaces, addSavedPlace, recentSearches, addRecentSearch, passengerGender } = useRide();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'pickup' | 'dropoff'>('pickup');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  
  const [splitUsers, setSplitUsers] = useState<string[]>([]);
  const [newSplitUser, setNewSplitUser] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('17:00');
  const [isPrebooked, setIsPrebooked] = useState(false);
  const [weather, setWeather] = useState<'Clear' | 'Rain' | 'Storm' | 'Fog'>('Clear');
  const [demandLevel, setDemandLevel] = useState<'Low' | 'Normal' | 'High' | 'Surge'>('Normal');
  const [mlPrice, setMlPrice] = useState<{price: number, basePrice: number, explanation: string} | null>(null);
  const [saveLocationModalVisible, setSaveLocationModalVisible] = useState(false);
  const [locationToSave, setLocationToSave] = useState<LocationData | null>(null);
  const [customTag, setCustomTag] = useState('');
  const params = useLocalSearchParams();
  
  const baseFare = mlPrice ? mlPrice.price : 150;
  const discountedBase = baseFare - (poolMatch ? poolMatch.savedAmount : 0);
  const totalFare = isPrebooked ? Math.round(discountedBase * 0.8) : Math.round(discountedBase);
  
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isSheetExpanded, setIsSheetExpanded] = useState(true);
  
  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50) {
          setIsSheetExpanded(false); // slide down
        } else if (gestureState.dy < -50) {
          setIsSheetExpanded(true); // slide up
        }
      },
    })
  ).current;

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
    if (params.autoBook === 'true' && params.pickupName && params.dropoffName) {
      const presetPickup = savedPlaces.find(p => p.label === params.pickupName)?.location;
      const presetDropoff = savedPlaces.find(p => p.label === params.dropoffName)?.location;
      
      if (presetPickup && presetDropoff) {
        setPickup(presetPickup);
        setDropoff(presetDropoff);
        setTimeout(() => setRideState('searching'), 800);
      }
    }
  }, [params.autoBook]);

  useEffect(() => {
    if (pickup) {
      const getLiveData = async () => {
        const liveWeather = await fetchRealTimeWeather(pickup.latitude, pickup.longitude);
        setWeather(liveWeather);
        
        const liveDemand = calculateLiveDemand(pickup.latitude, pickup.longitude);
        setDemandLevel(liveDemand);
      };
      getLiveData();
    }
  }, [pickup]);

  useEffect(() => {
    if (pickup && dropoff) {
      updateRoute();
      
      const dist = calculateDistance(pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude);
      
      const fetchPrice = async () => {
        const prediction = await predictRidePrice({
          distanceKm: dist,
          timeOfDayHour: new Date().getHours(),
          weather,
          demandLevel
        });
        setMlPrice(prediction);
      };
      
      fetchPrice();
    } else {
      setMlPrice(null);
    }
  }, [pickup, dropoff, weather, demandLevel]);

  useEffect(() => {
    let poolTimer: ReturnType<typeof setTimeout>;
    if (rideState === 'ongoing' && isPoolEnabled && !poolMatch) {
      poolTimer = setTimeout(() => {
        setPoolMatch({
          name: 'Rahul',
          savedAmount: 60,
          description: 'joining midway on your route'
        });
      }, 3000);
    }
    return () => clearTimeout(poolTimer);
  }, [rideState, isPoolEnabled, poolMatch]);

  useEffect(() => {
    let title = '';
    let msg = '';
    
    switch (rideState) {
      case 'searching':
        title = 'Looking for Drivers';
        msg = 'Notifying nearby drivers in your area...';
        break;
      case 'accepted':
        title = 'Driver Assigned!';
        msg = `${driverName} is riding towards you.`;
        break;
      case 'arrived':
        title = 'Driver Arrived';
        msg = `${driverName} has reached the pickup location.`;
        break;
      case 'ongoing':
        title = 'Ride Started';
        msg = 'You are heading to your destination.';
        break;
      case 'completed':
        title = 'Ride Completed';
        msg = 'You have reached your destination.';
        break;
      default:
        return; // don't show for idle
    }

    Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: msg,
        sound: true,
      },
      trigger: null,
    });
  }, [rideState, driverName]);

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const saveSchedule = () => {
    if (!pickup || !dropoff || selectedDays.length === 0) {
      Alert.alert('Error', 'Please select pickup, dropoff, and at least one day.');
      return;
    }
    addSchedule({
      id: Date.now().toString(),
      pickup,
      dropoff,
      days: selectedDays,
      time: selectedTime,
      isActive: true
    });
    setScheduleModalVisible(false);
    setPickup(null);
    setDropoff(null);
    Alert.alert('Success', 'Your ride has been scheduled! We will notify you 15 minutes before the scheduled time.');
  };

  const simulateScheduledRide = (schedule: any) => {
    Alert.alert(
      '📅 Upcoming Scheduled Ride', 
      `Your daily scheduled ride from ${schedule.pickup.name} to ${schedule.dropoff.name} is in 15 minutes. Auto-booking now...`,
      [{ text: 'OK', onPress: () => {
        setPickup(schedule.pickup);
        setDropoff(schedule.dropoff);
        const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
        setRideOtp(newOtp);
        setRideState('searching');
      }}]
    );
  };

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

  const handleSOS = async () => {
    Alert.alert(
      "🚨 Confirm SOS",
      "This will immediately alert the nearest police station and hospital with your live location. Do you want to proceed?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "YES, I NEED HELP", 
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            // Use current driver location if riding, otherwise pickup or default
            const loc = driverLocation || pickup || { latitude: 28.6139, longitude: 77.2090 };
            
            const services = await findNearestEmergencyServices(loc.latitude, loc.longitude);
            
            setIsLoading(false);
            
            Alert.alert(
              "🆘 SOS TRIGGERED",
              `HELP IS ON THE WAY!\n\n📍 Your Location: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}\n🚓 Police Alerted: ${services.police}\n🏥 Medical Alerted: ${services.hospital}\n\nEmergency services are responding to your live coordinates. Stay safe.`,
              [{ text: "OK" }]
            );
          }
        }
      ]
    );
  };

  const shareRide = async () => {
    try {
      const trackingLink = Linking.createURL('/track', { 
        queryParams: { id: 'user123' } 
      });
      const message = `Follow my ride live on RidePro! Track my location here: ${trackingLink}`;
      
      await Share.share({
        message: message,
        url: trackingLink,
        title: 'Track my live ride'
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
    addRecentSearch(loc);
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
        driverLocation={driverLocation}
      />
      
      <SafeAreaView style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.walletBadge}>
            <Text style={styles.walletEmoji}>💳</Text>
            <Text style={styles.walletText}>₹{passengerWallet}</Text>
          </View>
        </View>
      </SafeAreaView>

      {(rideState === 'accepted' || rideState === 'arrived' || rideState === 'ongoing') && (
        <View style={styles.safetyToolkit}>
          <TouchableOpacity 
            style={[styles.safetyButton, { backgroundColor: '#d32f2f' }]} 
            onPress={handleSOS}
          >
            <Text style={styles.safetyEmoji}>🚨</Text>
            <Text style={styles.safetyText}>SOS</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.safetyButton, { backgroundColor: '#1976d2' }]} 
            onPress={shareRide}
          >
            <Text style={styles.safetyEmoji}>🔗</Text>
            <Text style={styles.safetyText}>Share</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomSheet}>
        {rideState === 'idle' && (
          <View>
            <View {...sheetPanResponder.panHandlers} style={{ alignItems: 'center', paddingBottom: 15, paddingTop: 5 }}>
              <TouchableOpacity onPress={() => setIsSheetExpanded(!isSheetExpanded)} hitSlop={{top: 20, bottom: 20, left: 50, right: 50}}>
                <View style={{ width: 50, height: 5, backgroundColor: '#ddd', borderRadius: 3 }} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.sheetTitle, { marginTop: -10 }]}>Ready to ride?</Text>
            
            <View style={styles.routeCard}>
              <TouchableOpacity style={styles.routeRow} onPress={() => openSelector('pickup')}>
                <View style={[styles.dot, { backgroundColor: '#2e7d32' }]} />
                <Text style={pickup ? styles.locationText : styles.placeholderText} numberOfLines={1}>{pickup ? pickup.name : 'Choose Pickup'}</Text>
              </TouchableOpacity>
              <View style={styles.routeLine} />
              <TouchableOpacity style={styles.routeRow} onPress={() => openSelector('dropoff')}>
                <View style={[styles.dot, { backgroundColor: '#d32f2f' }]} />
                <Text style={dropoff ? styles.locationText : styles.placeholderText} numberOfLines={1}>{dropoff ? dropoff.name : 'Where to?'}</Text>
              </TouchableOpacity>
            </View>

            {pickup && dropoff && mlPrice && (
              <View style={styles.mlCard}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={{fontWeight: '900', color: '#1E88E5', fontSize: 14}}>🤖 AI Pricing</Text>
                    <Text style={{fontSize: 10, color: '#666', fontStyle: 'italic'}} numberOfLines={2}>{mlPrice.explanation}</Text>
                  </View>
                  <Text style={{fontWeight: '900', fontSize: 24}}>₹{mlPrice.price}</Text>
                </View>
                
                <View style={{flexDirection: 'row', marginTop: 10}}>
                  <TouchableOpacity onPress={() => Alert.alert('Live Weather', 'Weather is auto-detected using live satellite API based on your pickup location.')} style={[styles.mlCompactTag, weather !== 'Clear' && styles.mlCompactTagActive]}>
                    <Text style={[styles.mlCompactTagText, weather !== 'Clear' && styles.mlTagTextActive]}>{weather === 'Clear' ? '☀️ Live: Clear' : (weather === 'Rain' ? '🌧️ Live: Rain' : (weather === 'Storm' ? '⛈️ Live: Storm' : '🌫️ Live: Fog'))}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => Alert.alert('Live Demand', 'Ride demand is algorithmically calculated in real-time based on your pickup location area, time of day, and current traffic density.')} style={[styles.mlCompactTag, demandLevel !== 'Normal' && styles.mlCompactTagActive]}>
                    <Text style={[styles.mlCompactTagText, demandLevel !== 'Normal' && styles.mlTagTextActive]}>{demandLevel === 'Normal' ? '📊 Live: Normal' : (demandLevel === 'Low' ? '📉 Live: Low' : (demandLevel === 'High' ? '📈 Live: High' : '🔥 Live: Surge'))}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {isSheetExpanded && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <TouchableOpacity style={[styles.chip, isFemaleOnly && styles.chipActive]} onPress={() => setIsFemaleOnly(!isFemaleOnly)}>
                <Text style={[styles.chipText, isFemaleOnly && styles.chipTextActive]}>👩 Women Only</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, isPoolEnabled && styles.chipActive]} onPress={() => setIsPoolEnabled(!isPoolEnabled)}>
                <Text style={[styles.chipText, isPoolEnabled && styles.chipTextActive]}>👥 Pool (Save)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, isPrebooked && styles.chipActive]} onPress={() => setIsPrebooked(!isPrebooked)}>
                <Text style={[styles.chipText, isPrebooked && styles.chipTextActive]}>⏳ Pre-book (-20%)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, (!pickup || !dropoff) && {opacity: 0.5}]} onPress={() => setScheduleModalVisible(true)} disabled={!pickup || !dropoff}>
                <Text style={styles.chipText}>📅 Schedule</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.primaryButton, (!pickup || !dropoff) && styles.disabledButton, {marginTop: 10}]} 
              onPress={() => {
                const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
                setRideOtp(newOtp);
                setRideState('searching');
              }}
              disabled={!pickup || !dropoff}
            >
              <Text style={styles.primaryButtonText}>Find Rides</Text>
            </TouchableOpacity>

            {schedules.length > 0 && (
              <View style={styles.schedulesContainer}>
                <Text style={styles.schedulesTitle}>Your Scheduled Rides</Text>
                {schedules.map(s => (
                  <View key={s.id} style={styles.scheduleCard}>
                    <View style={{flex: 1}}>
                      <Text style={{fontWeight: 'bold'}} numberOfLines={1}>{s.pickup.name} → {s.dropoff.name}</Text>
                      <Text style={{color: '#666', fontSize: 12}}>
                        {s.days.map(d => ['Su','Mo','Tu','We','Th','Fr','Sa'][d]).join(', ')} • {s.time}
                      </Text>
                    </View>
                    <Switch value={s.isActive} onValueChange={() => toggleSchedule(s.id)} />
                    <TouchableOpacity onPress={() => simulateScheduledRide(s)} style={{marginLeft: 10, backgroundColor: '#000', padding: 8, borderRadius: 8}}>
                      <Text style={{color: '#fff', fontSize: 10}}>Simulate</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
                )}
              </>
            )}
          </View>
        )}

        {rideState === 'searching' && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.searchingTitle}>{isPrebooked ? 'Scheduling your ride...' : 'Searching for rides...'}</Text>
            <Text style={styles.subtitle}>{isPrebooked ? 'Reserving a driver for 30 mins from now.' : 'Connecting you to nearby drivers in Delhi'}</Text>
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
                <View style={styles.avatarPlaceholder}><Text>{activeDriverGender === 'female' ? '👩' : '👨'}</Text></View>
                <View style={{flex: 1, marginLeft: 15}}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.driverNameText}>{driverName}</Text>
                    {(isFemaleOnly && activeDriverGender === 'female') && (
                      <View style={{backgroundColor: '#fce4ec', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 8, borderWidth: 1, borderColor: '#ff4081'}}>
                        <Text style={{color: '#ff4081', fontSize: 10, fontWeight: 'bold'}}>✓ Verified Female</Text>
                      </View>
                    )}
                  </View>
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
            
            {poolMatch && (
              <View style={styles.poolBanner}>
                <Text style={styles.poolBannerTitle}>👥 Co-Rider Found!</Text>
                <Text style={styles.poolBannerText}>{poolMatch.name} is {poolMatch.description}.</Text>
                <Text style={styles.poolBannerSave}>You save ₹{poolMatch.savedAmount} on this ride!</Text>
              </View>
            )}

            <View style={styles.driverCard}>
              <Text style={styles.driverNameText}>Driving with {driverName}</Text>
            </View>
          </View>
        )}

        {rideState === 'completed' && (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Text style={styles.completionEmoji}>🏁</Text>
            <Text style={styles.sheetTitle}>Ride Completed!</Text>
            
            <View style={styles.fareContainer}>
              <Text style={styles.fareText}>Total Fare: ₹{totalFare}</Text>
              {isPrebooked && (
                <View style={{backgroundColor: '#fff3e0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 5}}>
                  <Text style={{color: '#f57c00', fontSize: 12, fontWeight: 'bold'}}>20% Pre-booking Discount Applied!</Text>
                </View>
              )}
              <Text style={styles.splitText}>
                {splitUsers.length > 0 
                  ? `Per Person: ₹${(totalFare / (splitUsers.length + 1)).toFixed(2)}` 
                  : `You pay: ₹${totalFare}`}
              </Text>
            </View>

            {!isPaid ? (
              <View style={styles.paymentSection}>
                <Text style={styles.paymentSubtitle}>Please pay the driver</Text>
                
                {showQR ? (
                  <View style={styles.qrContainer}>
                    <View style={styles.qrBox}>
                      <Text style={{fontSize: 100, lineHeight: 120}}>🔲</Text>
                      <Text style={styles.qrText}>Scan to Pay ₹{totalFare}</Text>
                    </View>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowQR(false)}>
                      <Text style={styles.secondaryButtonText}>Back to options</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryButton, {marginTop: 15}]} onPress={() => {
                      setDriverWallet(w => w + totalFare);
                      setIsPaid(true);
                      setShowQR(false);
                      Alert.alert('Payment Successful', `₹${totalFare} paid to ${driverName} via UPI.`);
                    }}>
                      <Text style={styles.primaryButtonText}>Simulate Scan Success</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <View style={styles.paymentOptionsRow}>
                      <TouchableOpacity 
                        style={styles.paymentMethodCard}
                        onPress={() => {
                          if (passengerWallet >= totalFare) {
                            setPassengerWallet(w => w - totalFare);
                            setDriverWallet(w => w + totalFare);
                            setIsPaid(true);
                            Alert.alert('Wallet Payment Successful', `₹${totalFare} deducted from your wallet.`);
                          } else {
                            Alert.alert('Insufficient Balance', 'Please use another payment method.');
                          }
                        }}
                      >
                        <Text style={styles.paymentEmoji}>💳</Text>
                        <Text style={styles.paymentMethodText}>Wallet (₹{passengerWallet})</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.paymentMethodCard}
                        onPress={() => setShowQR(true)}
                      >
                        <Text style={styles.paymentEmoji}>📱</Text>
                        <Text style={styles.paymentMethodText}>Show QR</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                      style={[styles.primaryButton, {marginTop: 15, backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ccc'}]}
                      onPress={() => {
                        setIsPaid(true);
                        Alert.alert('Payment Confirmed', `You marked the payment to ${driverName} as complete.`);
                      }}
                    >
                      <Text style={[styles.primaryButtonText, {color: '#333', fontSize: 16}]}>✅ Cash / 3rd Party Payment Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View style={{width: '100%'}}>
                <Text style={styles.successText}>✅ Payment Completed</Text>
                
                <View style={styles.splitInputContainer}>
                  <TextInput
                    style={styles.splitInput}
                    placeholder="Add co-passenger name..."
                    value={newSplitUser}
                    onChangeText={setNewSplitUser}
                  />
                  <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => {
                      if (newSplitUser.trim()) {
                        setSplitUsers([...splitUsers, newSplitUser.trim()]);
                        setNewSplitUser('');
                      }
                    }}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {splitUsers.length > 0 && (
                  <View style={styles.splitUsersList}>
                    <Text style={styles.splitUsersTitle}>Splitting with:</Text>
                    <Text style={styles.splitUsersNames}>{splitUsers.join(', ')}</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.primaryButton} onPress={() => {
                  if (pickup && dropoff) {
                    addRideToHistory({
                      id: Date.now().toString() + '-p',
                      role: 'passenger',
                      pickup,
                      dropoff,
                      fare: totalFare,
                      splitUsers: splitUsers,
                      date: new Date().toLocaleDateString()
                    });
                  }
                  setRideState('idle');
                  setPickup(null);
                  setDropoff(null);
                  setRouteCoords([]);
                  setSplitUsers([]);
                  setPoolMatch(null);
                  setIsPaid(false);
                  setIsPrebooked(false);
                }}>
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
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

              {!searchQuery && (
                <View style={styles.savedSection}>
                  <Text style={styles.sectionTitle}>Saved Places</Text>
                  <View style={styles.savedPlacesRow}>
                    {savedPlaces.map(place => (
                      <TouchableOpacity 
                        key={place.id} 
                        style={styles.savedPlaceCard} 
                        onPress={() => selectLocation(place.location)}
                      >
                        <Text style={styles.savedPlaceIcon}>{place.icon}</Text>
                        <Text style={styles.savedPlaceLabel}>{place.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {recentSearches.length > 0 && (
                    <View style={{marginTop: 20}}>
                      <Text style={styles.sectionTitle}>Recent Searches</Text>
                      {recentSearches.map((loc, index) => (
                        <TouchableOpacity 
                          key={index} 
                          style={styles.recentSearchItem} 
                          onPress={() => selectLocation(loc)}
                        >
                          <Text style={{fontSize: 20, marginRight: 15}}>🕒</Text>
                          <Text style={styles.recentSearchName} numberOfLines={1}>{loc.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {isLoading ? (
                <ActivityIndicator style={{marginTop: 20}} />
              ) : (
                searchResults.map((result, index) => (
                  <View key={index} style={[styles.resultItem, { flexDirection: 'row', alignItems: 'center' }]}>
                    <TouchableOpacity 
                      style={{ flex: 1, paddingRight: 10 }} 
                      onPress={() => selectLocation(result)}
                    >
                      <Text style={styles.resultName}>{result.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{ padding: 8, backgroundColor: '#f0f0f0', borderRadius: 8 }}
                      onPress={() => {
                        setLocationToSave(result);
                        setCustomTag(result.name.split(',')[0].substring(0, 15));
                        setSaveLocationModalVisible(true);
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: 'bold' }}>⭐ Save</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={scheduleModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={{fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center'}}>Schedule Ride</Text>
              <TouchableOpacity onPress={() => setScheduleModalVisible(false)} style={styles.closeTextBtn}>
                <Text style={{ fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={{padding: 20}}>
              <Text style={{fontSize: 16, marginBottom: 10, fontWeight: '600'}}>Select Days</Text>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <TouchableOpacity 
                    key={i} 
                    onPress={() => toggleDay(i)}
                    style={{width: 40, height: 40, borderRadius: 20, backgroundColor: selectedDays.includes(i) ? '#000' : '#f0f0f0', justifyContent: 'center', alignItems: 'center'}}
                  >
                    <Text style={{color: selectedDays.includes(i) ? '#fff' : '#000', fontWeight: 'bold'}}>{day}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{fontSize: 16, marginBottom: 10, fontWeight: '600'}}>Select Time (24h format)</Text>
              <TextInput
                style={{backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#eee'}}
                value={selectedTime}
                onChangeText={setSelectedTime}
                placeholder="e.g. 14:30"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
              <View style={{flexDirection: 'row', marginBottom: 30, flexWrap: 'wrap', justifyContent: 'center'}}>
                {['08:00', '09:00', '14:00', '17:00', '18:00'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setSelectedTime(t)} style={{paddingHorizontal: 15, paddingVertical: 8, backgroundColor: selectedTime === t ? '#000' : '#f0f0f0', borderRadius: 20, marginHorizontal: 5, marginBottom: 10}}>
                    <Text style={{color: selectedTime === t ? '#fff' : '#000', fontWeight: 'bold'}}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={saveSchedule}>
                <Text style={styles.primaryButtonText}>Save Schedule</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={saveLocationModalVisible} animationType="fade" transparent={true}>
        <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={{ backgroundColor: '#fff', padding: 25, borderRadius: 20, width: '85%', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 5 }}>Save Location</Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>Enter a tag (e.g. Home, Gym, College, Office):</Text>
            <TextInput
              style={{ backgroundColor: '#f5f5f5', padding: 15, borderRadius: 12, marginBottom: 25, fontSize: 16, borderWidth: 1, borderColor: '#eee' }}
              value={customTag}
              onChangeText={setCustomTag}
              placeholder="Custom Tag"
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setSaveLocationModalVisible(false)} style={{ padding: 12, marginRight: 15, justifyContent: 'center' }}>
                <Text style={{ color: '#666', fontWeight: 'bold', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                if (customTag.trim() && locationToSave) {
                  const tagLower = customTag.trim().toLowerCase();
                  let icon = '📍';
                  if (tagLower === 'home') icon = '🏠';
                  if (tagLower === 'college') icon = '🎓';
                  if (tagLower === 'office' || tagLower === 'work') icon = '🏢';
                  if (tagLower === 'gym') icon = '🏋️';
                  
                  addSavedPlace({
                    id: Date.now().toString(),
                    label: customTag.trim(),
                    location: locationToSave,
                    icon: icon
                  });
                  setSaveLocationModalVisible(false);
                  Alert.alert('Success!', `'${customTag.trim()}' has been updated in your saved places.`);
                }
              }} style={{ backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 12, justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  switchLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
  primaryButton: { backgroundColor: '#000', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 5, width: '100%' },
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
  fareContainer: { backgroundColor: '#e8f5e9', padding: 15, borderRadius: 15, width: '100%', alignItems: 'center', marginBottom: 15 },
  fareText: { fontSize: 20, fontWeight: 'bold', color: '#2e7d32' },
  splitText: { fontSize: 16, color: '#2e7d32', marginTop: 5, fontWeight: '600' },
  splitInputContainer: { flexDirection: 'row', width: '100%', marginBottom: 10 },
  splitInput: { flex: 1, backgroundColor: '#f0f0f0', padding: 12, borderRadius: 10, marginRight: 10 },
  addButton: { backgroundColor: '#000', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 10 },
  addButtonText: { color: '#fff', fontWeight: 'bold' },
  splitUsersList: { width: '100%', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  splitUsersTitle: { fontSize: 12, color: '#666', fontWeight: 'bold', marginBottom: 5 },
  splitUsersNames: { fontSize: 14, color: '#333', fontWeight: '500' },
  poolBanner: { backgroundColor: '#e8f5e9', padding: 15, borderRadius: 15, width: '100%', alignItems: 'center', marginVertical: 10, borderWidth: 1, borderColor: '#c8e6c9' },
  poolBannerTitle: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginBottom: 5 },
  poolBannerText: { fontSize: 14, color: '#333', textAlign: 'center' },
  poolBannerSave: { fontSize: 14, fontWeight: 'bold', color: '#2e7d32', marginTop: 5 },
  safetyToolkit: { position: 'absolute', top: 50, right: 20, zIndex: 10, alignItems: 'flex-end' },
  safetyButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginBottom: 10, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
  safetyEmoji: { fontSize: 16, marginRight: 5 },
  safetyText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  walletBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 30, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  walletEmoji: { fontSize: 18, marginRight: 5 },
  walletText: { fontWeight: '800', fontSize: 16, color: '#2e7d32' },
  paymentSection: { width: '100%', alignItems: 'center' },
  paymentSubtitle: { fontSize: 16, color: '#666', marginBottom: 15, fontWeight: '500' },
  paymentOptionsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  paymentMethodCard: { flex: 1, backgroundColor: '#f9f9f9', padding: 20, borderRadius: 15, alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: '#eee' },
  paymentEmoji: { fontSize: 32, marginBottom: 10 },
  paymentMethodText: { fontWeight: 'bold', color: '#333' },
  successText: { color: '#2e7d32', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  qrContainer: { alignItems: 'center', width: '100%' },
  qrBox: { backgroundColor: '#f5f5f5', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 15, width: 200, borderWidth: 2, borderColor: '#e0e0e0', borderStyle: 'dashed' },
  qrText: { fontWeight: 'bold', marginTop: 10, color: '#333' },
  schedulesContainer: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  schedulesTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  scheduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  savedSection: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#666', marginBottom: 15 },
  savedPlacesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  savedPlaceCard: { width: '31%', backgroundColor: '#f9f9f9', padding: 10, borderRadius: 15, alignItems: 'center', marginBottom: 10, marginRight: '2%', borderWidth: 1, borderColor: '#eee' },
  savedPlaceIcon: { fontSize: 24, marginBottom: 5 },
  savedPlaceLabel: { fontWeight: 'bold', color: '#333' },
  recentSearchItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  recentSearchName: { fontSize: 16, color: '#333', flex: 1 },

  mlCard: { backgroundColor: '#e3f2fd', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#bbdefb' },
  mlTag: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#ddd', flex: 1, marginHorizontal: 2, alignItems: 'center' },
  mlTagActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
  mlTagText: { fontSize: 12, color: '#666', fontWeight: 'bold' },
  mlTagTextActive: { color: '#fff' },
  routeCard: { backgroundColor: '#f5f5f5', borderRadius: 15, padding: 15, marginBottom: 15 },
  routeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  routeLine: { width: 2, height: 20, backgroundColor: '#ddd', marginLeft: 3, marginVertical: 2 },
  chipScroll: { flexDirection: 'row', marginBottom: 5 },
  chip: { backgroundColor: '#f0f0f0', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginRight: 10, height: 40, justifyContent: 'center' },
  chipActive: { backgroundColor: '#000' },
  chipText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  chipTextActive: { color: '#fff' },
  mlCompactTag: { backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginRight: 10 },
  mlCompactTagActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
  mlCompactTagText: { fontSize: 10, color: '#666', fontWeight: 'bold' }
});
