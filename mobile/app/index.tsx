import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';

export default function IndexScreen() {
  const { token, isRestoring } = useAuth();

  useEffect(() => {
    if (isRestoring) {
      return;
    }

    if (token) {
      router.replace('/organizations');
      return;
    }

    router.replace('/login');
  }, [isRestoring, token]);

  return null;
}