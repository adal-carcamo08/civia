import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AuthProvider,
  useAuth,
} from '../contexts/auth-context';

function AppNavigation() {
  const { isRestoring } = useAuth();
  const [minimumSplashFinished, setMinimumSplashFinished] =
    useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setMinimumSplashFinished(true);
    }, 1200);

    return () => clearTimeout(timeout);
  }, []);

  if (isRestoring || !minimumSplashFinished) {
    return (
      <View style={styles.splash}>
        <StatusBar style="dark" />

        <Text style={styles.logo}>CIVIA</Text>

        <Text style={styles.subtitle}>
          Gestión inteligente de reportes
        </Text>

        <ActivityIndicator
          size="small"
          color="#17365D"
          style={styles.indicator}
        />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigation />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FB',
  },
  logo: {
    fontSize: 48,
    fontWeight: '700',
    color: '#17365D',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 18,
    color: '#667085',
  },
  indicator: {
    marginTop: 28,
  },
});