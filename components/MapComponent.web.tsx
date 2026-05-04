import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const generateHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { padding: 0; margin: 0; height: 100vh; width: 100vw; }
            #map { width: 100%; height: 100%; position: absolute; top: 0; bottom: 0; left: 0; right: 0; }
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
              if (!data) return;
              clearMap();
              
              var bounds = L.latLngBounds();
              var hasBounds = false;

              if (data.pickup && data.pickup.latitude) {
                var m = L.marker([data.pickup.latitude, data.pickup.longitude]).addTo(map).bindPopup("Pickup: " + data.pickup.name);
                markers.push(m);
                bounds.extend([data.pickup.latitude, data.pickup.longitude]);
                hasBounds = true;
              }
              
              if (data.dropoff && data.dropoff.latitude) {
                var m = L.marker([data.dropoff.latitude, data.dropoff.longitude]).addTo(map).bindPopup("Dropoff: " + data.dropoff.name);
                markers.push(m);
                bounds.extend([data.dropoff.latitude, data.dropoff.longitude]);
                hasBounds = true;
              }

              if (data.driverLocation && data.driverLocation.latitude) {
                var driverIcon = L.divIcon({ html: '<div style="font-size:24px;">🚗</div>', className: 'driver-icon', iconSize: [30,30] });
                var m = L.marker([data.driverLocation.latitude, data.driverLocation.longitude], { icon: driverIcon }).addTo(map);
                markers.push(m);
                bounds.extend([data.driverLocation.latitude, data.driverLocation.longitude]);
                hasBounds = true;
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

            window.addEventListener('message', function(event) {
              try {
                var data = event.data;
                if (data.type === 'UPDATE_MAP') {
                  updateMap(data.payload);
                }
              } catch (e) {}
            });
          </script>
        </body>
      </html>
    `;
  };

  useEffect(() => {
    const mapData = { pickup, dropoff, routeCoordinates, driverLocation };
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'UPDATE_MAP', payload: mapData }, '*');
    }
  }, [pickup, dropoff, routeCoordinates, driverLocation]);

  return (
    <View style={style || styles.container}>
      <iframe
        ref={iframeRef}
        srcDoc={generateHTML()}
        style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent' }}
        title="Map"
        onLoad={() => {
            if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage({ 
                    type: 'UPDATE_MAP', 
                    payload: { pickup, dropoff, routeCoordinates, driverLocation } 
                }, '*');
            }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  }
});
