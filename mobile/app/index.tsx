import { router } from 'expo-router';
import { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../contexts/auth-context';

export default function SplashScreen() {
  const {
    token,
    user,
    isRestoring,
  } = useAuth();

  useEffect(() => {
    if (isRestoring) {
      return;
    }

    const timeout = setTimeout(() => {
      if (token && user) {
        router.replace(
          user.role === 'GLOBAL_ADMIN'
            ? '/global-admin'
            : '/organizations',
        );

        return;
      }

      router.replace('/login');
    }, 900);

    return () =>
      clearTimeout(timeout);
  }, [
    isRestoring,
    token,
    user,
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>
        CIVIA
      </Text>

      <Text style={styles.subtitle}>
        Conecta. Reporta. Mejora.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FB',
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: '#17365D',
    letterSpacing: 2,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 17,
    color: '#667085',
  },
});