import React, { createContext, useState, useContext } from 'react';

export type RideState = 'idle' | 'searching' | 'accepted' | 'arrived' | 'ongoing' | 'completed';

export interface LocationData {
  latitude: number;
  longitude: number;
  name: string;
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
}

const RideContext = createContext<RideContextType>({} as RideContextType);

export const RideProvider = ({ children }: { children: React.ReactNode }) => {
  const [rideState, setRideState] = useState<RideState>('idle');
  const [pickup, setPickup] = useState<LocationData | null>(null);
  const [dropoff, setDropoff] = useState<LocationData | null>(null);
  
  // Hardcoded OTP for the demo
  const rideOtp = "4829";
  
  return (
    <RideContext.Provider value={{
      rideState, setRideState,
      pickup, setPickup,
      dropoff, setDropoff,
      driverName: 'John Doe (4.9 ⭐)',
      passengerName: 'Alex (You)',
      rideOtp
    }}>
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => useContext(RideContext);
