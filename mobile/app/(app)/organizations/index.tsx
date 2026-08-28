import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OrganizationsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.brand}>CIVIA</Text>
          <Text style={styles.title}>Mis organizaciones</Text>
          <Text style={styles.subtitle}>
            Aquí encontrarás las organizaciones a las que perteneces.
          </Text>
        </View>

        <View style={styles.emptyState}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>+</Text>
          </View>

          <Text style={styles.emptyTitle}>Aún no tienes organizaciones</Text>

          <Text style={styles.emptyText}>
            Explora organizaciones públicas o utiliza una invitación para
            comenzar.
          </Text>

          <Pressable
            onPress={() => router.push('/organizations/explore')}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : undefined,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              Explorar organizaciones
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/organizations/invitation')}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : undefined,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              Tengo una invitación
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 32,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  iconCircle: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderRadius: 36,
    backgroundColor: '#E8EFF7',
  },
  iconText: {
    marginTop: -3,
    fontSize: 42,
    fontWeight: '300',
    color: '#17365D',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1F2937',
  },
  emptyText: {
    maxWidth: 320,
    marginTop: 10,
    marginBottom: 28,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#667085',
  },
  primaryButton: {
    width: '100%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#17365D',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: '100%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#17365D',
  },
  buttonPressed: {
    opacity: 0.88,
  },
});