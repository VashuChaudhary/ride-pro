import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useRide, CompletedRide } from '../context/RideContext';

export default function HistoryScreen() {
  const router = useRouter();
  const { rideHistory, setPickup, setDropoff, setRideState } = useRide();

  const handleReorder = (ride: CompletedRide) => {
    setPickup(ride.pickup);
    setDropoff(ride.dropoff);
    setRideState('idle'); // Ensure they start from the confirmation screen
    router.push('/passenger');
  };

  const renderRide = ({ item }: { item: CompletedRide }) => {
    const isPassenger = item.role === 'passenger';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.roleBadge, isPassenger ? styles.passengerBadge : styles.driverBadge]}>
            <Text style={styles.roleText}>{isPassenger ? '👤 Passenger' : '🚗 Driver'}</Text>
          </View>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: '#2e7d32' }]} />
            <Text style={styles.locationText} numberOfLines={1}>{item.pickup.name}</Text>
          </View>
          <View style={styles.line} />
          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: '#d32f2f' }]} />
            <Text style={styles.locationText} numberOfLines={1}>{item.dropoff.name}</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.fareText}>{isPassenger ? 'Paid' : 'Earned'}: ₹{item.fare}</Text>
          {item.splitUsers && item.splitUsers.length > 0 && (
            <Text style={styles.splitText}>
              Split with: {['You', ...item.splitUsers].join(', ')}
            </Text>
          )}
        </View>

        {isPassenger && (
          <TouchableOpacity style={styles.reorderButton} onPress={() => handleReorder(item)}>
            <Text style={styles.reorderButtonText}>Reorder Ride</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ride History</Text>
        <View style={{ width: 40 }} />
      </View>

      {rideHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>No rides found yet</Text>
        </View>
      ) : (
        <FlatList
          data={rideHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderRide}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    marginTop: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  backText: {
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  passengerBadge: {
    backgroundColor: '#e3f2fd',
  },
  driverBadge: {
    backgroundColor: '#ffebee',
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    color: '#888',
    fontSize: 12,
  },
  routeContainer: {
    marginBottom: 15,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 15,
  },
  line: {
    width: 2,
    height: 15,
    backgroundColor: '#eee',
    marginLeft: 3,
    marginVertical: 2,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  fareText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
  },
  splitText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  reorderButton: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  reorderButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
  },
});
