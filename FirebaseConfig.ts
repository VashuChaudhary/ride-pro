import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";

// @ts-expect-error - getReactNativePersistence is not typed correctly in the default exports, but works in Metro
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA1d-VrrjWl_cy1xWBqKk80T9rfBo9aYFw",
  authDomain: "harshita-ride-pro.firebaseapp.com",
  projectId: "harshita-ride-pro",
  storageBucket: "harshita-ride-pro.firebasestorage.app",
  messagingSenderId: "720508259433",
  appId: "1:720508259433:web:6c789b8e773020eab7a6f8",
  measurementId: "G-W9DQV9VC5Y"
};

export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
