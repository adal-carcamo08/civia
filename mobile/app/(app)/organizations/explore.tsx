import {
  router,
  useFocusEffect,
} from 'expo-router';
import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/auth-context';
import { apiRequest } from '../../../services/api';

type PublicOrganization = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  type: 'PUBLIC';
  isMember: boolean;
  membershipRole: 'MEMBER' | 'STAFF' | 'ADMIN' | null;
  membershipStatus: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | null;
};

export default function ExploreOrganizationsScreen() {
  const { token } = useAuth();

  const [search, setSearch] = useState('');
  const [organizations, setOrganizations] =
    useState<PublicOrganization[]>([]);
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
      const data = await apiRequest<PublicOrganization[]>(
        '/organizations/public',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrganizations(data);
    } catch {
      setOrganizations([]);
      setLoadError(
        'No se pudieron cargar las organizaciones públicas.'
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

  const filteredOrganizations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return organizations;
    }

    return organizations.filter((organization) => {
      const name = organization.name.toLowerCase();
      const description =
        organization.description?.toLowerCase() ?? '';

      return (
        name.includes(normalizedSearch) ||
        description.includes(normalizedSearch)
      );
    });
  }, [organizations, search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>CIVIA</Text>

        <Text style={styles.title}>
          Explorar organizaciones
        </Text>

        <Text style={styles.subtitle}>
          Busca organizaciones públicas disponibles en CIVIA.
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar organización"
          placeholderTextColor="#98A2B3"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color="#17365D"
            />

            <Text style={styles.loadingText}>
              Cargando organizaciones...
            </Text>
          </View>
        ) : loadError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>
              No pudimos cargar las organizaciones
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
        ) : filteredOrganizations.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>
              No encontramos organizaciones
            </Text>

            <Text style={styles.emptyText}>
              Prueba con otro nombre o término de búsqueda.
            </Text>
          </View>
        ) : (
          <View style={styles.resultsSection}>
            <Text style={styles.resultCount}>
              {filteredOrganizations.length === 1
                ? '1 organización pública'
                : `${filteredOrganizations.length} organizaciones públicas`}
            </Text>

            <View style={styles.organizationList}>
              {filteredOrganizations.map((organization) => (
                <View
                  key={organization.id}
                  style={styles.organizationCard}
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

                      <View style={styles.publicBadge}>
                        <Text style={styles.publicBadgeText}>
                          Pública
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

                    {organization.isMember ? (
                      <Pressable
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
                          styles.memberButton,
                          pressed
                            ? styles.buttonPressed
                            : undefined,
                        ]}
                      >
                        <Text style={styles.memberButtonText}>
                          Ver organización
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={styles.availableBox}>
                        <Text style={styles.availableText}>
                          Disponible para unirte
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.buttonPressed : undefined,
          ]}
        >
          <Text style={styles.secondaryButtonText}>
            Volver
          </Text>
        </Pressable>
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
  brand: {
    marginBottom: 24,
    fontSize: 22,
    fontWeight: '700',
    color: '#17365D',
    letterSpacing: 0.5,
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
  searchInput: {
    height: 54,
    marginTop: 28,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#1F2937',
  },
  centerState: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#667085',
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
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#667085',
  },
  resultsSection: {
    marginTop: 26,
  },
  resultCount: {
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
  publicBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#E7F6EC',
  },
  publicBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#344054',
  },
  memberButton: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: '#17365D',
  },
  memberButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  availableBox: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F2F4F7',
  },
  availableText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: '#667085',
  },
  primaryButton: {
    width: '100%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
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
    marginTop: 28,
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