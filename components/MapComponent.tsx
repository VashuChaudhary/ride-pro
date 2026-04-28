import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  driverLocation?: Location | null;
}

const DELHI_REGION = {
  latitude: 28.6139,
  longitude: 77.2090,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function MapComponent({ style, pickup, dropoff, routeCoordinates, driverLocation }: MapComponentProps) {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      mapRef.current?.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 80, right: 50, bottom: 400, left: 50 },
        animated: true,
      });
    } else if (pickup && dropoff) {
      mapRef.current?.fitToCoordinates(
        [
          { latitude: pickup.latitude, longitude: pickup.longitude },
          { latitude: dropoff.latitude, longitude: dropoff.longitude }
        ],
        { edgePadding: { top: 80, right: 50, bottom: 400, left: 50 }, animated: true }
      );
    } else if (pickup) {
      mapRef.current?.animateToRegion({
        latitude: pickup.latitude,
        longitude: pickup.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    } else if (dropoff) {
      mapRef.current?.animateToRegion({
        latitude: dropoff.latitude,
        longitude: dropoff.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, [pickup, dropoff, routeCoordinates]);

  return (
    <MapView
      ref={mapRef}
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
      {driverLocation && (
        <Marker 
          coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }} 
          title="Driver"
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={999}
        >
          <View>
            <Text style={{fontSize: 28}}>🚗</Text>
          </View>
        </Marker>
      )}
    </MapView>
  );
}
