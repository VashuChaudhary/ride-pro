import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function RoleSelection() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>RidePro</Text>
          <Text style={styles.subtitle}>Your smart city transit</Text>
        </View>

        <Text style={styles.sectionHeader}>Quick Actions</Text>
        <TouchableOpacity 
          style={styles.widgetCard}
          onPress={() => router.push('/passenger?autoBook=true&pickupName=Home&dropoffName=College')}
          activeOpacity={0.9}
        >
          <View style={styles.widgetHeader}>
            <Text style={styles.widgetTitle}>1-Tap Commute</Text>
            <View style={styles.widgetBadge}><Text style={styles.widgetBadgeText}>Widget Mock</Text></View>
          </View>
          <View style={styles.widgetRoute}>
            <View style={styles.locationPill}><Text style={styles.widgetLocation}>🏠 Home</Text></View>
            <Text style={styles.widgetArrow}>→</Text>
            <View style={styles.locationPill}><Text style={styles.widgetLocation}>🎓 College</Text></View>
          </View>
        </TouchableOpacity>

        <Text style={[styles.sectionHeader, {marginTop: 35}]}>Select Module</Text>
        
        <View style={styles.grid}>
          <TouchableOpacity 
            style={[styles.gridCard, styles.passengerCard]}
            onPress={() => router.push('/passenger')}
            activeOpacity={0.9}
          >
            <Text style={styles.gridEmoji}>👤</Text>
            <Text style={styles.gridTitle}>Passenger</Text>
            <Text style={styles.gridDesc}>Book a ride</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridCard, styles.driverCard]}
            onPress={() => router.push('/driver')}
            activeOpacity={0.9}
          >
            <Text style={styles.gridEmoji}>🚗</Text>
            <Text style={[styles.gridTitle, { color: '#fff' }]}>Driver</Text>
            <Text style={[styles.gridDesc, { color: '#bbb' }]}>Earn money</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridCard, styles.historyCard]}
            onPress={() => router.push('/history')}
            activeOpacity={0.9}
          >
            <Text style={styles.gridEmoji}>🕒</Text>
            <Text style={styles.gridTitle}>History</Text>
            <Text style={styles.gridDesc}>Past rides</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.gridCard, styles.scheduleCard]}
            onPress={() => router.push('/schedules')}
            activeOpacity={0.9}
          >
            <Text style={styles.gridEmoji}>📅</Text>
            <Text style={styles.gridTitle}>Schedules</Text>
            <Text style={styles.gridDesc}>Daily routes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
    marginLeft: 5,
  },
  widgetCard: {
    backgroundColor: '#1E88E5',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#1E88E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  widgetTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  widgetBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  widgetBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  widgetRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationPill: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    flex: 1,
    alignItems: 'center',
  },
  widgetLocation: {
    color: '#1E88E5',
    fontWeight: '900',
    fontSize: 14,
  },
  widgetArrow: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    marginHorizontal: 15,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  passengerCard: {
    backgroundColor: '#fff',
  },
  driverCard: {
    backgroundColor: '#111',
  },
  historyCard: {
    backgroundColor: '#e8f5e9',
  },
  scheduleCard: {
    backgroundColor: '#fff3e0',
  },
  gridEmoji: {
    fontSize: 32,
    marginBottom: 16,
  },
  gridTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 4,
  },
  gridDesc: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});
