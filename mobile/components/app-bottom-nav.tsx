import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type NavItem = 'organizations' | 'reports' | 'profile';

type AppBottomNavProps = {
  active: NavItem;
};

export function AppBottomNav({
  active,
}: AppBottomNavProps) {
  const navigate = (
    item: NavItem,
    route: '/organizations' | '/reports' | '/profile'
  ) => {
    if (active === item) {
      return;
    }

    router.replace(route);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() =>
          navigate('organizations', '/organizations')
        }
        style={styles.item}
      >
        <Ionicons
          name={
            active === 'organizations'
              ? 'business'
              : 'business-outline'
          }
          size={23}
          color={
            active === 'organizations'
              ? '#17365D'
              : '#98A2B3'
          }
        />

        <Text
          style={[
            styles.label,
            active === 'organizations'
              ? styles.activeLabel
              : undefined,
          ]}
        >
          Organizaciones
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          navigate('reports', '/reports')
        }
        style={styles.item}
      >
        <Ionicons
          name={
            active === 'reports'
              ? 'document-text'
              : 'document-text-outline'
          }
          size={23}
          color={
            active === 'reports'
              ? '#17365D'
              : '#98A2B3'
          }
        />

        <Text
          style={[
            styles.label,
            active === 'reports'
              ? styles.activeLabel
              : undefined,
          ]}
        >
          Reportes
        </Text>
      </Pressable>

      <Pressable
        onPress={() =>
          navigate('profile', '/profile')
        }
        style={styles.item}
      >
        <Ionicons
          name={
            active === 'profile'
              ? 'person'
              : 'person-outline'
          }
          size={23}
          color={
            active === 'profile'
              ? '#17365D'
              : '#98A2B3'
          }
        />

        <Text
          style={[
            styles.label,
            active === 'profile'
              ? styles.activeLabel
              : undefined,
          ]}
        >
          Perfil
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E4E7EC',
    backgroundColor: '#FFFFFF',
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#98A2B3',
  },
  activeLabel: {
    color: '#17365D',
  },
});