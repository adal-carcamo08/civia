import {
  router,
  useFocusEffect,
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
import { AppBottomNav } from '../../../components/app-bottom-nav';
import { useAuth } from '../../../contexts/auth-context';
import { apiRequest } from '../../../services/api';

type Organization = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  type: 'PUBLIC' | 'PRIVATE';
  membershipRole: 'MEMBER' | 'STAFF' | 'ADMIN';
  joinedAt: string;
};

export default function OrganizationsScreen() {
  const { token } = useAuth();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadOrganizations = useCallback(async () => {
    if (!token) {
      setOrganizations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      const data = await apiRequest<Organization[]>(
        '/organizations',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrganizations(data);
    } catch {
      setLoadError(
        'No se pudieron cargar tus organizaciones. Inténtalo nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadOrganizations();
    }, [loadOrganizations])
  );


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.brand}>CIVIA</Text>

          <Text style={styles.title}>Mis organizaciones</Text>

          <Text style={styles.subtitle}>
            Aquí encontrarás las organizaciones a las que perteneces.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator
              size="large"
              color="#17365D"
            />

            <Text style={styles.loadingText}>
              Cargando organizaciones...
            </Text>
          </View>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              No pudimos cargar tus organizaciones
            </Text>

            <Text style={styles.emptyText}>
              {loadError}
            </Text>

            <Pressable
              onPress={() => {
                void loadOrganizations();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.buttonPressed : undefined,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                Intentar nuevamente
              </Text>
            </Pressable>
          </View>
        ) : organizations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>+</Text>
            </View>

            <Text style={styles.emptyTitle}>
              Aún no tienes organizaciones
            </Text>

            <Text style={styles.emptyText}>
              Explora organizaciones públicas o utiliza una invitación para comenzar.
            </Text>

            <Pressable
              onPress={() =>
                router.push('/organizations/explore')
              }
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
              onPress={() =>
                router.push('/organizations/invitation')
              }
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
        ) : (
          <View style={styles.organizationsSection}>
            <Text style={styles.countText}>
              {organizations.length === 1
                ? '1 organización'
                : `${organizations.length} organizaciones`}
            </Text>

            <View style={styles.organizationList}>
              {organizations.map((organization) => (
                <Pressable
                  key={organization.id}
                  onPress={() =>
                    router.push({
                      pathname:
                        '/organizations/[organizationId]',
                      params: {
                        organizationId: organization.id,
                      },
                    })
                  }
                  style={({ pressed }) => [
                    styles.organizationCard,
                    pressed ? styles.cardPressed : undefined,
                  ]}
                >
                  <View style={styles.organizationIcon}>
                    <Text style={styles.organizationIconText}>
                      {organization.name
                        .trim()
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.organizationContent}>
                    <View style={styles.organizationHeader}>
                      <Text
                        style={styles.organizationName}
                        numberOfLines={2}
                      >
                        {organization.name}
                      </Text>

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

                    {organization.description ? (
                      <Text
                        style={styles.organizationDescription}
                        numberOfLines={3}
                      >
                        {organization.description}
                      </Text>
                    ) : null}

                    <Text style={styles.membershipText}>
                      Miembro
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() =>
                router.push('/organizations/explore')
              }
              style={({ pressed }) => [
                styles.primaryButton,
                styles.actionsButton,
                pressed ? styles.buttonPressed : undefined,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                Explorar organizaciones
              </Text>
            </Pressable>

            <Pressable
              onPress={() =>
                router.push('/organizations/invitation')
              }
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
        )}
        </ScrollView>

        <AppBottomNav active="organizations" />
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
    paddingVertical: 32,
  },
  brand: {
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
  loadingState: {
    flex: 1,
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#667085',
  },
  emptyState: {
    flex: 1,
    minHeight: 420,
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
  organizationsSection: {
    marginTop: 28,
  },
  countText: {
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#667085',
  },
  organizationList: {
    gap: 14,
  },
  organizationCard: {
    flexDirection: 'row',
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  cardPressed: {
    opacity: 0.82,
  },
  organizationIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderRadius: 24,
    backgroundColor: '#E8EFF7',
  },
  organizationIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#17365D',
  },
  organizationContent: {
    flex: 1,
  },
  organizationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  organizationName: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  organizationDescription: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
  },
  membershipText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#2F75B5',
  },
  typeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  publicBadge: {
    backgroundColor: '#E7F6EC',
  },
  privateBadge: {
    backgroundColor: '#F2F4F7',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#344054',
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
  actionsButton: {
    marginTop: 24,
  },
  buttonPressed: {
    opacity: 0.88,
  },
});