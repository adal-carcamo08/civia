import {
  Redirect,
  Stack,
  useSegments,
} from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/auth-context';

export default function AppLayout() {
  const {
    token,
    user,
    isRestoring,
  } = useAuth();

  const segments = useSegments();

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

  if (!token || !user) {
    return <Redirect href="/login" />;
  }

  const isGlobalAdminRoute =
    segments.some(
      (segment) =>
        segment === 'global-admin',
    );

  const isOrganizationAdminRoute =
    segments.some(
      (segment) =>
        segment === 'admin',
    );

  if (
    user.role === 'GLOBAL_ADMIN' &&
    !isGlobalAdminRoute &&
    !isOrganizationAdminRoute
  ) {
    return (
      <Redirect href="/global-admin" />
    );
  }

  if (
    user.role !== 'GLOBAL_ADMIN' &&
    isGlobalAdminRoute
  ) {
    return (
      <Redirect href="/organizations" />
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