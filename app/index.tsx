import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

export default function RoleSelection() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>RidePro</Text>
        <Text style={styles.subtitle}>Choose your role to continue</Text>

        <TouchableOpacity 
          style={styles.card}
          onPress={() => router.push('/passenger')}
        >
          <Text style={styles.cardEmoji}>👤</Text>
          <Text style={styles.cardTitle}>Passenger</Text>
          <Text style={styles.cardDesc}>Book a ride and travel</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.card, styles.driverCard]}
          onPress={() => router.push('/driver')}
        >
          <Text style={styles.cardEmoji}>🚗</Text>
          <Text style={[styles.cardTitle, { color: '#fff' }]}>Driver</Text>
          <Text style={[styles.cardDesc, { color: '#e0e0e0' }]}>Accept rides and earn</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 48,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  driverCard: {
    backgroundColor: '#000',
  },
  cardEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#666',
  },
});
