import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRide } from '../context/RideContext';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../FirebaseConfig';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: '720508259433-nl75fq85odofnnvbmc22ms5c2fobds1t.apps.googleusercontent.com',
  });
}

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');

  const { setActiveDriverGender, setPassengerGender } = useRide();

  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      alert('Please fill all fields');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === 'driver') {
            setActiveDriverGender(userData.gender === 'female' ? 'female' : 'male');
          } else {
            setPassengerGender(userData.gender);
          }
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name,
          email,
          role,
          gender,
          createdAt: new Date().toISOString()
        });

        if (role === 'driver') {
          setActiveDriverGender(gender === 'female' ? 'female' : 'male');
        } else {
          setPassengerGender(gender);
        }
      }

      router.replace('/dashboard');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      let userCredential;

      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        // Force account selection
        provider.setCustomParameters({
          prompt: 'select_account'
        });
        userCredential = await signInWithPopup(auth, provider);
      } else {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        
        const idToken = (userInfo as any).idToken || (userInfo as any).data?.idToken;
        
        if (!idToken) throw new Error("No ID token found from Google");
        
        const googleCredential = GoogleAuthProvider.credential(idToken);
        userCredential = await signInWithCredential(auth, googleCredential);
      }
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: userCredential.user.displayName || 'Google User',
          email: userCredential.user.email,
          role: role,
          gender: gender,
          createdAt: new Date().toISOString()
        });
        if (role === 'driver') {
          setActiveDriverGender(gender === 'female' ? 'female' : 'male');
        } else {
          setPassengerGender(gender);
        }
      } else {
         const userData = userDoc.data();
         if (userData.role === 'driver') {
           setActiveDriverGender(userData.gender === 'female' ? 'female' : 'male');
         } else {
           setPassengerGender(userData.gender);
         }
      }

      router.replace('/dashboard');
    } catch (error: any) {
      console.error(error);
      if (Platform.OS === 'web') {
        alert('Google Sign-In Error (Web): ' + error.message);
      } else {
        alert('Google Sign-In Error: ' + error.message + "\n\nNote: Google Sign-In only works in the APK/Production build.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>🚕</Text>
            </View>
            <Text style={styles.title}>RidePro</Text>
            <Text style={styles.subtitle}>{isLogin ? 'Welcome back, ready to ride?' : 'Create an account to get started'}</Text>
          </View>

          <View style={styles.formContainer}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="John Doe" 
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput 
                style={styles.input} 
                placeholder="hello@ridepro.com" 
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput 
                style={styles.input} 
                placeholder="••••••••" 
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {!isLogin && (
              <>
                <View style={styles.roleContainer}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.roleSelector}>
                    <TouchableOpacity 
                      style={[styles.roleButton, gender === 'male' && styles.roleButtonActive]} 
                      onPress={() => setGender('male')}
                    >
                      <Text style={styles.roleEmoji}>👨</Text>
                      <Text style={[styles.roleText, gender === 'male' && styles.roleTextActive]}>Male</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.roleButton, gender === 'female' && styles.roleButtonActive]} 
                      onPress={() => setGender('female')}
                    >
                      <Text style={styles.roleEmoji}>👩</Text>
                      <Text style={[styles.roleText, gender === 'female' && styles.roleTextActive]}>Female</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.roleContainer}>
                  <Text style={styles.label}>I am a...</Text>
                  <View style={styles.roleSelector}>
                    <TouchableOpacity 
                      style={[styles.roleButton, role === 'passenger' && styles.roleButtonActive]} 
                      onPress={() => setRole('passenger')}
                    >
                      <Text style={styles.roleEmoji}>👤</Text>
                      <Text style={[styles.roleText, role === 'passenger' && styles.roleTextActive]}>Passenger</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.roleButton, role === 'driver' && styles.roleButtonActiveDriver]} 
                      onPress={() => setRole('driver')}
                    >
                      <Text style={styles.roleEmoji}>🚗</Text>
                      <Text style={[styles.roleText, role === 'driver' && styles.roleTextActiveDriver]}>Driver</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={handleAuth} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleAuth}>
              <Text style={styles.googleButtonEmoji}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{isLogin ? "Don't have an account?" : "Already have an account?"}</Text>
              <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setEmail(''); setPassword(''); setName(''); }}>
                <Text style={styles.footerLink}>{isLogin ? 'Sign Up' : 'Log In'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f8ff',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 18,
    borderRadius: 16,
    fontSize: 16,
    color: '#111',
    borderWidth: 1,
    borderColor: '#eee',
  },
  roleContainer: {
    marginBottom: 30,
  },
  roleSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1E88E5',
  },
  roleButtonActiveDriver: {
    backgroundColor: '#e0f2f1',
    borderColor: '#00897b',
  },
  roleEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  roleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  roleTextActive: {
    color: '#1E88E5',
  },
  roleTextActiveDriver: {
    color: '#00897b',
  },
  primaryButton: {
    backgroundColor: '#000',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  dividerText: {
    color: '#999',
    paddingHorizontal: 15,
    fontWeight: 'bold',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  googleButtonEmoji: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 10,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 15,
  },
  footerLink: {
    color: '#1E88E5',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});
