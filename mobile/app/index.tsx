import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';

export default function IndexScreen() {
  const { user, isRestoring } = useAuth();

  useEffect(() => {
    if (isRestoring) {
      return;
    }

    if (user) {
      router.replace('/organizations');
      return;
    }

    router.replace('/login');
  }, [isRestoring, user]);

  return null;
}