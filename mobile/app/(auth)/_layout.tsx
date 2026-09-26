import {
  Redirect,
  Stack,
} from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/auth-context';

export default function AuthLayout() {
  const {
    token,
    user,
    isRestoring,
  } = useAuth();

  if (isRestoring) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color="#17365D"
        />
      </View>
    );
  }

  if (token && user) {
    return (
      <Redirect
        href={
          user.role === 'GLOBAL_ADMIN'
            ? '/global-admin'
            : '/organizations'
        }
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FB',
  },
});