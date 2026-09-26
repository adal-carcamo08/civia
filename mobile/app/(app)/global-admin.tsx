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
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/auth-context';
import {
  ApiError,
  apiRequest,
} from '../../services/api';

type Organization = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  type: 'PUBLIC' | 'PRIVATE';
  active: boolean;
  createdAt: string;
  memberships: Array<{
    id: string;
    user: {
      id: string;
      fullName: string;
      email: string;
    };
  }>;
  _count: {
    memberships: number;
    reports: number;
    departments: number;
    categories: number;
  };
};

function getErrorMessage(
  error: unknown,
) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'No se pudo completar la operación.';
}

export default function GlobalAdminScreen() {
  const { token, user, signOut } = useAuth();

  const [
    organizations,
    setOrganizations,
  ] = useState<Organization[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [name, setName] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [type, setType] =
    useState<'PUBLIC' | 'PRIVATE'>(
      'PUBLIC',
    );

  const [
    initialAdminEmail,
    setInitialAdminEmail,
  ] = useState('');

  const loadOrganizations =
    useCallback(async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const response =
          await apiRequest<
            Organization[]
          >(
            '/organizations/platform/admin/organizations',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        setOrganizations(response);
      } catch (loadError) {
        setOrganizations([]);
        setError(
          getErrorMessage(
            loadError,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadOrganizations();
    }, [loadOrganizations]),
  );

  const createOrganization =
    async () => {
      if (!token) {
        return;
      }

      if (name.trim().length < 2) {
        Alert.alert(
          'Nombre requerido',
          'Ingresa el nombre de la organización.',
        );
        return;
      }

      const email =
        initialAdminEmail
          .trim()
          .toLowerCase();

      if (
        !/^\S+@\S+\.\S+$/.test(
          email,
        )
      ) {
        Alert.alert(
          'Administrador requerido',
          'Ingresa el correo de un usuario registrado que será administrador inicial.',
        );
        return;
      }

      setIsSaving(true);

      try {
        await apiRequest(
          '/organizations/platform/admin/organizations',
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: name.trim(),
              description:
                description.trim() ||
                undefined,
              type,
              initialAdminEmail:
                email,
            }),
          },
        );

        setName('');
        setDescription('');
        setType('PUBLIC');
        setInitialAdminEmail('');

        await loadOrganizations();

        Alert.alert(
          'Organización creada',
          'La organización, su administrador inicial y la categoría genérica fueron creados correctamente.',
        );
      } catch (requestError) {
        Alert.alert(
          'No se pudo crear',
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setIsSaving(false);
      }
    };

  const updateOrganization =
    async (
      organizationId: string,
      body: Record<
        string,
        unknown
      >,
    ) => {
      if (!token) {
        return;
      }

      setIsSaving(true);

      try {
        await apiRequest(
          `/organizations/platform/admin/organizations/${organizationId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            body:
              JSON.stringify(body),
          },
        );

        await loadOrganizations();
      } catch (requestError) {
        Alert.alert(
          'No se pudo actualizar',
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setIsSaving(false);
      }
    };

  if (
    user?.role !== 'GLOBAL_ADMIN'
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View style={styles.center}>
          <Text
            style={styles.errorTitle}
          >
            Acceso restringido
          </Text>

          <Text
            style={styles.errorText}
          >
            Esta sección está disponible
            únicamente para administradores
            globales de CIVIA.
          </Text>

          <Pressable
            onPress={() =>
              router.back()
            }
            style={
              styles.primaryButton
            }
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Volver
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#17365D"
          />

          <Text
            style={styles.loadingText}
          >
            Cargando plataforma...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <Text style={styles.brand}>
          CIVIA GLOBAL
        </Text>

        <Text style={styles.title}>
          Administración de plataforma
        </Text>

        <Text style={styles.subtitle}>
          Gestiona las organizaciones
          registradas en CIVIA.
        </Text>

        {error ? (
          <View style={styles.errorCard}>
            <Text
              style={styles.errorText}
            >
              {error}
            </Text>

            <Pressable
              onPress={() => {
                void loadOrganizations();
              }}
              style={
                styles.retryButton
              }
            >
              <Text
                style={
                  styles.retryButtonText
                }
              >
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <Text
            style={styles.sectionTitle}
          >
            Nueva organización
          </Text>

          <Text
            style={styles.sectionHelp}
          >
            El administrador inicial debe
            tener una cuenta registrada
            previamente en CIVIA.
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre de la organización"
            placeholderTextColor="#98A2B3"
            editable={!isSaving}
            style={styles.input}
          />

          <TextInput
            value={description}
            onChangeText={
              setDescription
            }
            placeholder="Descripción opcional"
            placeholderTextColor="#98A2B3"
            multiline
            editable={!isSaving}
            style={[
              styles.input,
              styles.textArea,
            ]}
          />

          <Text
            style={styles.fieldLabel}
          >
            Tipo
          </Text>

          <View
            style={styles.typeRow}
          >
            {(
              [
                'PUBLIC',
                'PRIVATE',
              ] as const
            ).map((value) => (
              <Pressable
                key={value}
                disabled={isSaving}
                onPress={() =>
                  setType(value)
                }
                style={[
                  styles.typeOption,
                  type === value
                    ? styles.typeSelected
                    : undefined,
                ]}
              >
                <Text
                  style={
                    styles.typeText
                  }
                >
                  {value === 'PUBLIC'
                    ? 'Pública'
                    : 'Privada'}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={
              initialAdminEmail
            }
            onChangeText={
              setInitialAdminEmail
            }
            placeholder="Correo del administrador inicial"
            placeholderTextColor="#98A2B3"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isSaving}
            style={styles.input}
          />

          <Pressable
            disabled={isSaving}
            onPress={() => {
              void createOrganization();
            }}
            style={[
              styles.primaryButton,
              isSaving
                ? styles.disabled
                : undefined,
            ]}
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Crear organización
            </Text>
          </Pressable>
        </View>

        <View
          style={styles.sectionHeader}
        >
          <Text
            style={styles.sectionTitle}
          >
            Organizaciones
          </Text>

          <View
            style={styles.countBadge}
          >
            <Text
              style={
                styles.countText
              }
            >
              {organizations.length}
            </Text>
          </View>
        </View>

        <View style={styles.list}>
          {organizations.map(
            (organization) => (
              <View
                key={organization.id}
                style={styles.orgCard}
              >
                <View
                  style={
                    styles.orgHeader
                  }
                >
                  <View
                    style={
                      styles.orgMain
                    }
                  >
                    <Text
                      style={
                        styles.orgName
                      }
                    >
                      {
                        organization.name
                      }
                    </Text>

                    <Text
                      style={
                        styles.orgMeta
                      }
                    >
                      {organization.type ===
                      'PUBLIC'
                        ? 'Pública'
                        : 'Privada'}
                      {' · '}
                      {organization.active
                        ? 'Activa'
                        : 'Inactiva'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      organization.active
                        ? styles.activeBadge
                        : styles.inactiveBadge,
                    ]}
                  >
                    <Text
                      style={
                        styles.statusText
                      }
                    >
                      {organization.active
                        ? 'ACTIVA'
                        : 'INACTIVA'}
                    </Text>
                  </View>
                </View>

                {organization.description ? (
                  <Text
                    style={
                      styles.description
                    }
                  >
                    {
                      organization.description
                    }
                  </Text>
                ) : null}

                <View
                  style={
                    styles.metricsRow
                  }
                >
                  <Text
                    style={
                      styles.metric
                    }
                  >
                    {
                      organization
                        ._count
                        .memberships
                    }{' '}
                    miembros
                  </Text>

                  <Text
                    style={
                      styles.metric
                    }
                  >
                    {
                      organization
                        ._count
                        .reports
                    }{' '}
                    reportes
                  </Text>
                </View>

                <Text
                  style={
                    styles.adminLabel
                  }
                >
                  Administradores
                </Text>

                {organization
                  .memberships.length >
                0 ? (
                  organization.memberships.map(
                    (membership) => (
                      <Text
                        key={
                          membership.id
                        }
                        style={
                          styles.adminText
                        }
                      >
                        •{' '}
                        {
                          membership
                            .user
                            .fullName
                        }
                        {' · '}
                        {
                          membership
                            .user.email
                        }
                      </Text>
                    ),
                  )
                ) : (
                  <Text
                    style={
                      styles.warningText
                    }
                  >
                    Sin administrador
                    activo
                  </Text>
                )}

                <View
                  style={
                    styles.actions
                  }
                >
                  <Pressable
                    disabled={isSaving}
                    onPress={() => {
                      void updateOrganization(
                        organization.id,
                        {
                          active:
                            !organization.active,
                        },
                      );
                    }}
                    style={
                      styles.secondaryButton
                    }
                  >
                    <Text
                      style={
                        styles.secondaryButtonText
                      }
                    >
                      {organization.active
                        ? 'Desactivar'
                        : 'Activar'}
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={isSaving}
                    onPress={() => {
                      void updateOrganization(
                        organization.id,
                        {
                          type:
                            organization.type ===
                            'PUBLIC'
                              ? 'PRIVATE'
                              : 'PUBLIC',
                        },
                      );
                    }}
                    style={
                      styles.secondaryButton
                    }
                  >
                    <Text
                      style={
                        styles.secondaryButtonText
                      }
                    >
                      Cambiar a{' '}
                      {organization.type ===
                      'PUBLIC'
                        ? 'privada'
                        : 'pública'}
                    </Text>
                  </Pressable>
                </View>

                {organization.active ? (
                  <Pressable
                    onPress={() =>
                      router.push(
                        `/organizations/${organization.id}/admin/manage` as never,
                      )
                    }
                    style={
                      styles.manageButton
                    }
                  >
                    <Text
                      style={
                        styles.manageButtonText
                      }
                    >
                      Administrar organización
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ),
          )}
        </View>

        <Pressable
          onPress={async () => {
            await signOut();
            router.replace('/login');
          }}
          style={styles.backButton}
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            Cerrar sesión
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#F7F9FB',
    },
    container: {
      paddingHorizontal: 22,
      paddingVertical: 28,
      paddingBottom: 60,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    brand: {
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: '#7F56D9',
    },
    title: {
      marginTop: 8,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '800',
      color: '#17365D',
    },
    subtitle: {
      marginTop: 7,
      fontSize: 15,
      lineHeight: 22,
      color: '#667085',
    },
    loadingText: {
      marginTop: 14,
      color: '#667085',
    },
    errorTitle: {
      fontSize: 23,
      fontWeight: '800',
      textAlign: 'center',
      color: '#1F2937',
    },
    errorText: {
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      color: '#667085',
    },
    errorCard: {
      marginTop: 18,
      padding: 16,
      borderRadius: 12,
      backgroundColor: '#FEF3F2',
    },
    retryButton: {
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },
    retryButtonText: {
      fontWeight: '700',
      color: '#B42318',
    },
    formCard: {
      marginTop: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: '#E4E7EC',
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      gap: 10,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#1F2937',
    },
    sectionHelp: {
      fontSize: 13,
      lineHeight: 19,
      color: '#667085',
    },
    input: {
      minHeight: 49,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: '#D0D5DD',
      borderRadius: 11,
      color: '#1F2937',
      backgroundColor: '#FFFFFF',
    },
    textArea: {
      minHeight: 82,
      paddingTop: 12,
      textAlignVertical: 'top',
    },
    fieldLabel: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '800',
      color: '#475467',
    },
    typeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    typeOption: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#D0D5DD',
      borderRadius: 10,
    },
    typeSelected: {
      borderColor: '#7F56D9',
      backgroundColor: '#F4F0FF',
    },
    typeText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#344054',
    },
    primaryButton: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      borderRadius: 11,
      backgroundColor: '#17365D',
    },
    primaryButtonText: {
      fontWeight: '700',
      color: '#FFFFFF',
    },
    disabled: {
      opacity: 0.55,
    },
    sectionHeader: {
      marginTop: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },
    countBadge: {
      minWidth: 32,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 18,
      backgroundColor: '#F4F0FF',
    },
    countText: {
      textAlign: 'center',
      fontWeight: '800',
      color: '#6941C6',
    },
    list: {
      marginTop: 14,
      gap: 12,
    },
    orgCard: {
      padding: 17,
      borderWidth: 1,
      borderColor: '#E4E7EC',
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
    },
    orgHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    orgMain: {
      flex: 1,
    },
    orgName: {
      fontSize: 17,
      fontWeight: '800',
      color: '#1F2937',
    },
    orgMeta: {
      marginTop: 4,
      fontSize: 12,
      color: '#667085',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 14,
    },
    activeBadge: {
      backgroundColor: '#ECFDF3',
    },
    inactiveBadge: {
      backgroundColor: '#F2F4F7',
    },
    statusText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#344054',
    },
    description: {
      marginTop: 11,
      fontSize: 13,
      lineHeight: 19,
      color: '#475467',
    },
    metricsRow: {
      marginTop: 13,
      flexDirection: 'row',
      gap: 16,
    },
    metric: {
      fontSize: 12,
      fontWeight: '700',
      color: '#2F75B5',
    },
    adminLabel: {
      marginTop: 14,
      fontSize: 12,
      fontWeight: '800',
      color: '#475467',
    },
    adminText: {
      marginTop: 4,
      fontSize: 12,
      color: '#667085',
    },
    warningText: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: '700',
      color: '#B54708',
    },
    actions: {
      marginTop: 14,
      flexDirection: 'row',
      gap: 8,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: '#D0D5DD',
      borderRadius: 10,
    },
    secondaryButtonText: {
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
      color: '#344054',
    },
    manageButton: {
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      borderRadius: 10,
      backgroundColor: '#7F56D9',
    },
    manageButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    backButton: {
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
    },
    backButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#2F75B5',
    },
  });