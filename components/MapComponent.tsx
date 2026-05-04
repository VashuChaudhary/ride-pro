import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export interface Location {
  latitude: number;
  longitude: number;
  name: string;
}

interface MapComponentProps {
  style?: any;
  pickup?: Location | null;
  dropoff?: Location | null;
  routeCoordinates?: { latitude: number; longitude: number }[];
  driverLocation?: Location | null;
}

export default function MapComponent({ style, pickup, dropoff, routeCoordinates, driverLocation }: MapComponentProps) {
  const webviewRef = useRef<WebView>(null);

  const generateHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { padding: 0; margin: 0; }
            #map { width: 100vw; height: 100vh; }
            .driver-icon { display: flex; align-items: center; justify-content: center; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var map = L.map('map', { zoomControl: false }).setView([28.6139, 77.2090], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '© OpenStreetMap'
            }).addTo(map);

            var markers = [];
            var polylines = [];

            function clearMap() {
              markers.forEach(m => map.removeLayer(m));
              polylines.forEach(p => map.removeLayer(p));
              markers = [];
              polylines = [];
            }

            function updateMap(data) {
              clearMap();
              
              var bounds = L.latLngBounds();
              var hasBounds = false;

              if (data.pickup) {
                var m = L.marker([data.pickup.latitude, data.pickup.longitude]).addTo(map).bindPopup("Pickup");
                markers.push(m);
                bounds.extend([data.pickup.latitude, data.pickup.longitude]);
                hasBounds = true;
              }
              
              if (data.dropoff) {
                var m = L.marker([data.dropoff.latitude, data.dropoff.longitude]).addTo(map).bindPopup("Dropoff");
                markers.push(m);
                bounds.extend([data.dropoff.latitude, data.dropoff.longitude]);
                hasBounds = true;
              }

              if (data.driverLocation) {
                var driverIcon = L.divIcon({ html: '<div style="font-size:24px;">🚗</div>', className: 'driver-icon', iconSize: [30,30] });
                var m = L.marker([data.driverLocation.latitude, data.driverLocation.longitude], { icon: driverIcon }).addTo(map);
                markers.push(m);
              }

              if (data.routeCoordinates && data.routeCoordinates.length > 0) {
                var latlngs = data.routeCoordinates.map(c => [c.latitude, c.longitude]);
                var poly = L.polyline(latlngs, {color: '#1E88E5', weight: 4}).addTo(map);
                polylines.push(poly);
                bounds.extend(latlngs);
                hasBounds = true;
              }

              if (hasBounds) {
                map.fitBounds(bounds, { padding: [50, 50] });
              }
            }

            document.addEventListener('message', function(event) {
              var data = JSON.parse(event.data);
              updateMap(data);
            });
            window.addEventListener('message', function(event) {
              var data = JSON.parse(event.data);
              updateMap(data);
            });
          </script>
        </body>
      </html>
    `;
  };

  useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        if (typeof updateMap === 'function') {
          updateMap(${JSON.stringify({ pickup, dropoff, routeCoordinates, driverLocation })});
        }
        true;
      `);
    }
  }, [pickup, dropoff, routeCoordinates, driverLocation]);

  return (
    <View style={style || styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: generateHTML() }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  }
});
