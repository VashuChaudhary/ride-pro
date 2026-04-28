import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRide } from '../context/RideContext';

export default function SchedulesApp() {
  const router = useRouter();
  const { schedules, toggleSchedule, deleteSchedule } = useRide();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scheduled Rides</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {schedules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 50, marginBottom: 10 }}>📅</Text>
            <Text style={styles.emptyTitle}>No Schedules Yet</Text>
            <Text style={styles.emptyDesc}>Go to the passenger app to create daily scheduled rides.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/passenger')}>
              <Text style={styles.primaryButtonText}>Book a Ride</Text>
            </TouchableOpacity>
          </View>
        ) : (
          schedules.map(schedule => (
            <View key={schedule.id} style={styles.scheduleCard}>
              <View style={styles.cardHeader}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{schedule.isActive ? 'Active' : 'Paused'}</Text>
                </View>
                <Switch 
                  value={schedule.isActive} 
                  onValueChange={() => toggleSchedule(schedule.id)} 
                  trackColor={{ false: "#e0e0e0", true: "#2e7d32" }}
                />
              </View>

              <View style={styles.routeContainer}>
                <View style={styles.locationRow}>
                  <View style={[styles.dot, { backgroundColor: '#2e7d32' }]} />
                  <Text style={styles.locationText} numberOfLines={1}>{schedule.pickup.name}</Text>
                </View>
                <View style={styles.locationLine} />
                <View style={styles.locationRow}>
                  <View style={[styles.dot, { backgroundColor: '#d32f2f' }]} />
                  <Text style={styles.locationText} numberOfLines={1}>{schedule.dropoff.name}</Text>
                </View>
              </View>

              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>🕒 {schedule.time}</Text>
                <Text style={styles.daysText}>
                  {schedule.days.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => deleteSchedule(schedule.id)}
              >
                <Text style={styles.deleteButtonText}>Delete Schedule</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { backgroundColor: '#f0f0f0', padding: 10, borderRadius: 20 },
  backText: { fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  emptyDesc: { color: '#666', textAlign: 'center', marginBottom: 30, paddingHorizontal: 20 },
  primaryButton: { backgroundColor: '#000', padding: 15, borderRadius: 15, alignItems: 'center', width: '100%' },
  primaryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  scheduleCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  badge: { backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText: { color: '#2e7d32', fontWeight: 'bold', fontSize: 12 },
  routeContainer: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginBottom: 15 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  locationText: { fontSize: 14, fontWeight: '600', flex: 1 },
  locationLine: { width: 2, height: 15, backgroundColor: '#ddd', marginLeft: 3, marginVertical: 2 },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  timeText: { fontSize: 16, fontWeight: 'bold' },
  daysText: { color: '#666', fontSize: 14, fontWeight: '500' },
  deleteButton: { alignItems: 'center', padding: 12, backgroundColor: '#ffebee', borderRadius: 10 },
  deleteButtonText: { color: '#d32f2f', fontWeight: 'bold' }
});
