import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MapComponent({ style, pickup, dropoff }: { style?: any, pickup?: any, dropoff?: any }) {
  return (
    <View style={[style, styles.webMap]}>
      <Text style={styles.webMapText}>
        🗺️ Delhi Map View{'\n'}
        {pickup ? `Pickup: ${pickup.name}` : 'No Pickup'}{'\n'}
        {dropoff ? `Dropoff: ${dropoff.name}` : 'No Dropoff'}{'\n'}
        (Open on Expo Go for real GPS and Maps)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webMap: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    padding: 24,
  }
});
