import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/login');
    }, 1500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>CIVIA</Text>
      <Text style={styles.subtitle}>Gestión inteligente de reportes</Text>
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
    fontWeight: '700',
    color: '#17365D',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 18,
    color: '#667085',
  },
});
