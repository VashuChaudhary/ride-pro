import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { auth, db } from '../FirebaseConfig';
import { updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function ProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        setEmail(user.email || '');
        setName(user.displayName || '');
        
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.name) setName(data.name);
          }
        } catch (e) {
          console.error(e);
        }
      }
      setIsFetching(false);
    };
    fetchUserData();
  }, []);

  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if ((email !== user.email || newPassword !== '') && currentPassword === '') {
      Alert.alert('Error', 'Please enter your current password to verify your identity before changing your email or password.');
      return;
    }

    setIsLoading(true);
    try {
      if (currentPassword !== '') {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      let updated = false;

      if (name !== user.displayName) {
        await updateProfile(user, { displayName: name });
        await updateDoc(doc(db, 'users', user.uid), { name: name });
        updated = true;
      }

      if (email !== user.email) {
        await updateEmail(user, email);
        await updateDoc(doc(db, 'users', user.uid), { email: email });
        updated = true;
      }

      if (newPassword !== '') {
        await updatePassword(user, newPassword);
        updated = true;
      }

      if (updated) {
        Alert.alert('Success', 'Profile updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
      } else {
        Alert.alert('Info', 'No changes were made.');
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Update Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Error logging out', error);
    }
  };

  if (isFetching) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Edit Profile</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="user@example.com"
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Security</Text>
          <Text style={styles.helperText}>Enter your current password if you wish to change your email or password.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Required for email/password changes"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Leave blank to keep unchanged"
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleUpdate} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save Changes</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  backButton: { backgroundColor: '#fff', padding: 12, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  backText: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  title: { fontSize: 24, fontWeight: '900', color: '#111' },
  avatarContainer: { alignSelf: 'center', backgroundColor: '#e3f2fd', width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 30, elevation: 5, shadowColor: '#1E88E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  avatarEmoji: { fontSize: 50 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#fff', padding: 16, borderRadius: 15, borderWidth: 1, borderColor: '#eee', fontSize: 16, color: '#111', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  divider: { height: 1, backgroundColor: '#ddd', marginVertical: 25 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 5 },
  helperText: { fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 18 },
  primaryButton: { backgroundColor: '#000', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  logoutButton: { backgroundColor: '#fff', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20, borderWidth: 2, borderColor: '#ffebee' },
  logoutText: { color: '#d32f2f', fontSize: 16, fontWeight: 'bold' },
});
