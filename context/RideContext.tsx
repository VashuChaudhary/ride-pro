import React, { createContext, useState, useContext } from 'react';

export type RideState = 'idle' | 'searching' | 'accepted' | 'arrived' | 'ongoing' | 'completed';

export interface LocationData {
  latitude: number;
  longitude: number;
  name: string;
}

export interface SavedPlace {
  id: string;
  label: string;
  location: LocationData;
  icon: string;
}

export interface CompletedRide {
  id: string;
  role: 'passenger' | 'driver';
  pickup: LocationData;
  dropoff: LocationData;
  fare: number;
  splitUsers?: string[];
  date: string;
}

export interface PoolMatch {
  name: string;
  savedAmount: number;
  description: string;
}

export interface RideSchedule {
  id: string;
  pickup: LocationData;
  dropoff: LocationData;
  days: number[]; // 0=Sun, 1=Mon...
  time: string; // HH:mm format
  isActive: boolean;
}

interface RideContextType {
  rideState: RideState;
  setRideState: (state: RideState) => void;
  pickup: LocationData | null;
  setPickup: (loc: LocationData | null) => void;
  dropoff: LocationData | null;
  setDropoff: (loc: LocationData | null) => void;
  driverName: string;
  passengerName: string;
  rideOtp: string;
  setRideOtp: (otp: string) => void;
  isFemaleOnly: boolean;
  setIsFemaleOnly: (isFemale: boolean) => void;
  activeDriverGender: 'male' | 'female';
  setActiveDriverGender: (gender: 'male' | 'female') => void;
  rideHistory: CompletedRide[];
  addRideToHistory: (ride: CompletedRide) => void;
  isPoolEnabled: boolean;
  setIsPoolEnabled: (enabled: boolean) => void;
  poolMatch: PoolMatch | null;
  setPoolMatch: (match: PoolMatch | null) => void;
  driverLocation: LocationData | null;
  setDriverLocation: (loc: LocationData | null) => void;
  passengerWallet: number;
  setPassengerWallet: React.Dispatch<React.SetStateAction<number>>;
  driverWallet: number;
  setDriverWallet: React.Dispatch<React.SetStateAction<number>>;
  schedules: RideSchedule[];
  addSchedule: (schedule: RideSchedule) => void;
  toggleSchedule: (id: string) => void;
  deleteSchedule: (id: string) => void;
  savedPlaces: SavedPlace[];
  recentSearches: LocationData[];
  addRecentSearch: (loc: LocationData) => void;
}

const RideContext = createContext<RideContextType>({} as RideContextType);

export const RideProvider = ({ children }: { children: React.ReactNode }) => {
  const [rideState, setRideState] = useState<RideState>('idle');
  const [pickup, setPickup] = useState<LocationData | null>(null);
  const [dropoff, setDropoff] = useState<LocationData | null>(null);
  const [isFemaleOnly, setIsFemaleOnly] = useState<boolean>(false);
  const [activeDriverGender, setActiveDriverGender] = useState<'male' | 'female'>('male');
  const [rideHistory, setRideHistory] = useState<CompletedRide[]>([]);
  const [isPoolEnabled, setIsPoolEnabled] = useState<boolean>(false);
  const [poolMatch, setPoolMatch] = useState<PoolMatch | null>(null);
  const [driverLocation, setDriverLocation] = useState<LocationData | null>(null);
  const [passengerWallet, setPassengerWallet] = useState<number>(500);
  const [driverWallet, setDriverWallet] = useState<number>(150);
  const [schedules, setSchedules] = useState<RideSchedule[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([
    { id: '1', label: 'Home', location: { name: 'Saket, New Delhi', latitude: 28.5244, longitude: 77.2066 }, icon: '🏠' },
    { id: '2', label: 'College', location: { name: 'IIT Delhi, Hauz Khas', latitude: 28.5450, longitude: 77.1926 }, icon: '🎓' },
    { id: '3', label: 'Office', location: { name: 'Cyber Hub, Gurugram', latitude: 28.4950, longitude: 77.0895 }, icon: '🏢' },
  ]);
  const [recentSearches, setRecentSearches] = useState<LocationData[]>([]);
  const [rideOtp, setRideOtp] = useState<string>("4829");

  const addRideToHistory = (ride: CompletedRide) => {
    setRideHistory(prev => [ride, ...prev]);
  };

  const addSchedule = (schedule: RideSchedule) => {
    setSchedules(prev => [...prev, schedule]);
  };

  const toggleSchedule = (id: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const deleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const addRecentSearch = (loc: LocationData) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(l => l.name !== loc.name);
      return [loc, ...filtered].slice(0, 5); // Keep top 5
    });
  };
  
  return (
    <RideContext.Provider value={{
      rideState, setRideState,
      pickup, setPickup,
      dropoff, setDropoff,
      activeDriverGender, setActiveDriverGender,
      rideHistory, addRideToHistory,
      isFemaleOnly, setIsFemaleOnly,
      isPoolEnabled, setIsPoolEnabled,
      poolMatch, setPoolMatch,
      driverLocation, setDriverLocation,
      passengerWallet, setPassengerWallet,
      driverWallet, setDriverWallet,
      schedules, addSchedule, toggleSchedule, deleteSchedule,
      savedPlaces, recentSearches, addRecentSearch,
      driverName: activeDriverGender === 'female' ? 'Priya Sharma' : 'John Doe',
      passengerName: 'Alex (You)',
      rideOtp, setRideOtp
    }}>
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => useContext(RideContext);
