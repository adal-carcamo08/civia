import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBottomNav } from '../../components/app-bottom-nav';
import { useAuth } from '../../contexts/auth-context';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const initial = user?.fullName
    ?.trim()
    .charAt(0)
    .toUpperCase() || 'U';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.brand}>CIVIA</Text>

          <Text style={styles.title}>Perfil</Text>

          <Text style={styles.subtitle}>
            Consulta la información de tu cuenta y administra tu sesión.
          </Text>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initial}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.fullName}>
                {user?.fullName ?? 'Usuario CIVIA'}
              </Text>

              <Text style={styles.email}>
                {user?.email ?? 'Información no disponible'}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Información de la cuenta
            </Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#17365D"
                  />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    Nombre completo
                  </Text>

                  <Text style={styles.infoValue}>
                    {user?.fullName ?? 'No disponible'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#17365D"
                  />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    Correo electrónico
                  </Text>

                  <Text style={styles.infoValue}>
                    {user?.email ?? 'No disponible'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#17365D"
                  />
                </View>

                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    Estado de la cuenta
                  </Text>

                  <Text style={styles.infoValue}>
                    {user?.active
                      ? 'Activa'
                      : 'No disponible'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => {
              void handleSignOut();
            }}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed
                ? styles.signOutButtonPressed
                : undefined,
            ]}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color="#D92D20"
            />

            <Text style={styles.signOutText}>
              Cerrar sesión
            </Text>
          </Pressable>
        </ScrollView>

        <AppBottomNav active="profile" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FB',
  },
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
  },
  brand: {
    marginBottom: 24,
    fontSize: 22,
    fontWeight: '700',
    color: '#17365D',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: '#667085',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: '#E8EFF7',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#17365D',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  fullName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#344054',
  },
  infoCard: {
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  infoIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F2F4F7',
  },
  infoContent: {
    flex: 1,
    marginLeft: 14,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667085',
  },
  infoValue: {
    marginTop: 3,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  divider: {
    height: 1,
    marginLeft: 72,
    backgroundColor: '#EAECF0',
  },
  signOutButton: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#FDA29B',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  signOutButtonPressed: {
    opacity: 0.8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D92D20',
  },
});