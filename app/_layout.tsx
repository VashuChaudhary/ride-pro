import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RideProvider } from '../context/RideContext';

export default function RootLayout() {
  return (
    <RideProvider>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Select Role', headerShown: false }} />
        <Stack.Screen name="passenger" options={{ title: 'Passenger App', headerShown: false }} />
        <Stack.Screen name="driver" options={{ title: 'Driver App', headerShown: false }} />
      </Stack>
    </RideProvider>
  );
}
