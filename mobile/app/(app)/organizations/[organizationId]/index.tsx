import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../../contexts/auth-context';
import { apiRequest } from '../../../../services/api';

type OrganizationDetail = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  type: 'PUBLIC' | 'PRIVATE';
  isMember: boolean;
  membershipRole: 'MEMBER' | 'STAFF' | 'ADMIN' | null;
  membershipStatus: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | null;
  joinedAt: string | null;
};

export default function OrganizationHomeScreen() {
  const { organizationId } = useLocalSearchParams<{
    organizationId: string;
  }>();

  const { token, user } = useAuth();

  const [organization, setOrganization] =
    useState<OrganizationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadOrganization = useCallback(async () => {
    if (!token || !organizationId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      const data = await apiRequest<OrganizationDetail>(
        `/organizations/${organizationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrganization(data);
    } catch {
      setOrganization(null);
      setLoadError(
        'No se pudo cargar la información de la organización.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, token]);

  useFocusEffect(
    useCallback(() => {
      void loadOrganization();
    }, [loadOrganization])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color="#17365D"
            />

            <Text style={styles.loadingText}>
              Cargando organización...
            </Text>
          </View>
        ) : loadError || !organization ? (
          <View style={styles.centerState}>
            <Text style={styles.errorTitle}>
              No pudimos cargar la organización
            </Text>

            <Text style={styles.errorText}>
              {loadError || 'La organización no está disponible.'}
            </Text>

            <Pressable
              onPress={() => {
                void loadOrganization();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.retryButton,
                pressed ? styles.buttonPressed : undefined,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                Intentar nuevamente
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace('/organizations')}
              style={({ pressed }) => [
                styles.backButton,
                pressed ? styles.buttonPressed : undefined,
              ]}
            >
              <Text style={styles.backButtonText}>
                Volver
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View>
              <View style={styles.topRow}>
                <Text style={styles.brand}>CIVIA</Text>

                <View
                  style={[
                    styles.typeBadge,
                    organization.type === 'PRIVATE'
                      ? styles.privateBadge
                      : styles.publicBadge,
                  ]}
                >
                  <Text style={styles.typeBadgeText}>
                    {organization.type === 'PRIVATE'
                      ? 'Privada'
                      : 'Pública'}
                  </Text>
                </View>
              </View>

              <Text style={styles.title}>
                {organization.name}
              </Text>

              {organization.description ? (
                <Text style={styles.subtitle}>
                  {organization.description}
                </Text>
              ) : null}
            </View>

            <View style={styles.membershipCard}>
              <Text style={styles.membershipLabel}>
                Tu acceso
              </Text>

              <Text style={styles.membershipValue}>
                {organization.membershipRole === 'ADMIN'
                  ? 'Administrador'
                  : organization.membershipRole === 'STAFF'
                    ? 'Personal'
                    : 'Miembro'}
              </Text>

              <Text style={styles.membershipStatus}>
                {organization.membershipStatus === 'ACTIVE'
                  ? 'Membresía activa'
                  : organization.membershipStatus === 'PENDING'
                    ? 'Membresía pendiente'
                    : 'Membresía suspendida'}
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname:
                      '/organizations/[organizationId]/reports/new',
                    params: { organizationId },
                  })
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.buttonPressed : undefined,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  Nuevo reporte
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname:
                      '/organizations/[organizationId]/reports',
                    params: { organizationId },
                  })
                }
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed ? styles.buttonPressed : undefined,
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  Ver reportes de la organización
                </Text>
              </Pressable>

              {(
                user?.role === 'GLOBAL_ADMIN' ||
                organization.membershipRole === 'ADMIN' ||
                organization.membershipRole === 'STAFF'
              ) ? (
                <Pressable
                  onPress={() =>
                    router.push(
                      `/organizations/${organizationId}/admin` as never
                    )
                  }
                  style={({ pressed }) => [
                    styles.adminButton,
                    pressed ? styles.buttonPressed : undefined,
                  ]}
                >
                  <Text style={styles.adminButtonText}>
                    Gestionar organización
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>
                Reportes de esta organización
              </Text>

              <Text style={styles.infoText}>
                Puedes registrar un nuevo reporte o consultar los reportes disponibles dentro de esta organización.
              </Text>
            </View>

            <Pressable
              onPress={() => router.replace('/organizations')}
              style={({ pressed }) => [
                styles.backButton,
                pressed ? styles.buttonPressed : undefined,
              ]}
            >
              <Text style={styles.backButtonText}>
                Volver a mis organizaciones
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FB',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  centerState: {
    flex: 1,
    minHeight: 560,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#667085',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1F2937',
  },
  errorText: {
    maxWidth: 320,
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#667085',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  brand: {
    fontSize: 22,
    fontWeight: '700',
    color: '#17365D',
    letterSpacing: 0.5,
  },
  typeBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  publicBadge: {
    backgroundColor: '#E7F6EC',
  },
  privateBadge: {
    backgroundColor: '#F2F4F7',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#344054',
  },
  title: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: '#667085',
  },
  membershipCard: {
    marginTop: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  membershipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
  },
  membershipValue: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  membershipStatus: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#2F75B5',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
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
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
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
  adminButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#2F8F9D',
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoCard: {
    marginTop: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#667085',
  },
  retryButton: {
    width: '100%',
    marginTop: 28,
  },
  backButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2F75B5',
  },
  buttonPressed: {
    opacity: 0.88,
  },
});