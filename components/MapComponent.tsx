import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

export interface Location {
  latitude: number;
  longitude: number;
  name: string;
}

interface MapComponentProps {
  style?: any;
  pickup?: Location | null;
  dropoff?: Location | null;
  routeCoordinates?: { latitude: number, longitude: number }[];
}

const DELHI_REGION = {
  latitude: 28.6139,
  longitude: 77.2090,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function MapComponent({ style, pickup, dropoff, routeCoordinates }: MapComponentProps) {
  return (
    <MapView
      style={style}
      initialRegion={DELHI_REGION}
      showsUserLocation={true}
    >
      {pickup && (
        <Marker 
          coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }} 
          title="Pickup"
          description={pickup.name}
          pinColor="green"
        />
      )}
      {dropoff && (
        <Marker 
          coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }} 
          title="Dropoff"
          description={dropoff.name}
          pinColor="red"
        />
      )}
      {routeCoordinates && routeCoordinates.length > 0 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#000"
          strokeWidth={4}
        />
      )}
    </MapView>
  );
}
