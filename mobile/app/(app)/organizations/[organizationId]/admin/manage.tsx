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
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../../../contexts/auth-context';
import {
  ApiError,
  apiRequest,
} from '../../../../../services/api';

type Department = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

type Category = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  department: {
    id: string;
    name: string;
  } | null;
};

type Membership = {
  id: string;
  role: 'MEMBER' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  joinedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    active: boolean;
  };
};

type Invitation = {
  id: string;
  email: string;
  status:
    | 'PENDING'
    | 'ACCEPTED'
    | 'REVOKED'
    | 'EXPIRED';
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type ManagementData = {
  organization: {
    id: string;
    name: string;
    description: string | null;
    type: 'PUBLIC' | 'PRIVATE';
  };
  departments: Department[];
  categories: Category[];
  memberships: Membership[];
  invitations: Invitation[];
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'No se pudo completar la operación.';
}

export default function OrganizationManagementScreen() {
  const { organizationId } =
    useLocalSearchParams<{
      organizationId: string;
    }>();

  const { token, user } = useAuth();

  const [data, setData] =
    useState<ManagementData | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [departmentName, setDepartmentName] =
    useState('');

  const [categoryName, setCategoryName] =
    useState('');

  const [
    selectedCategoryDepartmentId,
    setSelectedCategoryDepartmentId,
  ] = useState('');

  const [invitationEmail, setInvitationEmail] =
    useState('');

  const [
    lastInvitationToken,
    setLastInvitationToken,
  ] = useState('');

  const loadData = useCallback(async () => {
    if (!token || !organizationId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response =
        await apiRequest<ManagementData>(
          `/organizations/${organizationId}/admin/management`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

      setData(response);
    } catch (loadError) {
      setData(null);
      setError(
        getErrorMessage(loadError),
      );
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, token]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const request = async (
    path: string,
    method: 'POST' | 'PATCH',
    body?: Record<string, unknown>,
  ) => {
    if (!token) {
      return false;
    }

    setIsSaving(true);

    try {
      await apiRequest(
        path,
        {
          method,
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
          ...(body
            ? {
                body:
                  JSON.stringify(body),
              }
            : {}),
        },
      );

      await loadData();
      return true;
    } catch (requestError) {
      Alert.alert(
        'No se pudo completar',
        getErrorMessage(requestError),
      );

      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const createDepartment = async () => {
    const name =
      departmentName.trim();

    if (name.length < 2) {
      Alert.alert(
        'Nombre requerido',
        'Ingresa un nombre válido para el departamento.',
      );
      return;
    }

    const success = await request(
      `/organizations/${organizationId}/admin/departments`,
      'POST',
      {
        name,
      },
    );

    if (success) {
      setDepartmentName('');
    }
  };

  const createCategory = async () => {
    const name =
      categoryName.trim();

    if (name.length < 2) {
      Alert.alert(
        'Nombre requerido',
        'Ingresa un nombre válido para la categoría.',
      );
      return;
    }

    const success = await request(
      `/organizations/${organizationId}/admin/categories`,
      'POST',
      {
        name,
        ...(selectedCategoryDepartmentId
          ? {
              departmentId:
                selectedCategoryDepartmentId,
            }
          : {}),
      },
    );

    if (success) {
      setCategoryName('');
      setSelectedCategoryDepartmentId('');
    }
  };

  const createInvitation = async () => {
    const email =
      invitationEmail
        .trim()
        .toLowerCase();

    if (
      !/^\S+@\S+\.\S+$/.test(email)
    ) {
      Alert.alert(
        'Correo inválido',
        'Ingresa un correo electrónico válido.',
      );
      return;
    }

    if (!token) {
      return;
    }

    setIsSaving(true);

    try {
      const response =
        await apiRequest<{
          id: string;
          email: string;
          status: string;
          expiresAt: string;
          token: string;
        }>(
          `/organizations/${organizationId}/admin/invitations`,
          {
            method: 'POST',
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              email,
            }),
          },
        );

      setLastInvitationToken(
        response.token,
      );

      setInvitationEmail('');

      await loadData();

      Alert.alert(
        'Invitación creada',
        'El código se muestra en pantalla. Compártelo únicamente con la persona invitada.',
      );
    } catch (requestError) {
      Alert.alert(
        'No se pudo crear',
        getErrorMessage(requestError),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#17365D"
          />

          <Text style={styles.loadingText}>
            Cargando administración...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data || error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>
            No pudimos abrir la administración
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            onPress={() => {
              void loadData();
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              Intentar nuevamente
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>
              Volver
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const activeDepartments =
    data.departments.filter(
      (department) =>
        department.active,
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>
          CIVIA ADMIN
        </Text>

        <Text style={styles.title}>
          Configuración
        </Text>

        <Text style={styles.subtitle}>
          {data.organization.name}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Departamentos
          </Text>

          <Text style={styles.sectionHelp}>
            Define las áreas internas que atenderán los reportes.
          </Text>

          <View style={styles.createRow}>
            <TextInput
              value={departmentName}
              onChangeText={
                setDepartmentName
              }
              placeholder="Nuevo departamento"
              placeholderTextColor="#98A2B3"
              editable={!isSaving}
              style={styles.input}
            />

            <Pressable
              disabled={isSaving}
              onPress={() => {
                void createDepartment();
              }}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>
                Agregar
              </Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            {data.departments.map(
              (department) => (
                <View
                  key={department.id}
                  style={styles.itemCard}
                >
                  <View style={styles.itemMain}>
                    <Text style={styles.itemTitle}>
                      {department.name}
                    </Text>

                    <Text style={styles.itemMeta}>
                      {department.active
                        ? 'Activo'
                        : 'Inactivo'}
                    </Text>
                  </View>

                  <Pressable
                    disabled={isSaving}
                    onPress={() => {
                      void request(
                        `/organizations/${organizationId}/admin/departments/${department.id}`,
                        'PATCH',
                        {
                          active:
                            !department.active,
                        },
                      );
                    }}
                    style={[
                      styles.smallButton,
                      department.active
                        ? styles.deactivateButton
                        : styles.activateButton,
                    ]}
                  >
                    <Text
                      style={
                        styles.smallButtonText
                      }
                    >
                      {department.active
                        ? 'Desactivar'
                        : 'Activar'}
                    </Text>
                  </Pressable>
                </View>
              ),
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Categorías
          </Text>

          <Text style={styles.sectionHelp}>
            Clasifica los tipos de reportes y relaciónalos con un departamento.
          </Text>

          <TextInput
            value={categoryName}
            onChangeText={
              setCategoryName
            }
            placeholder="Nueva categoría"
            placeholderTextColor="#98A2B3"
            editable={!isSaving}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>
            Departamento
          </Text>

          <View style={styles.optionsWrap}>
            <Pressable
              onPress={() =>
                setSelectedCategoryDepartmentId(
                  '',
                )
              }
              style={[
                styles.option,
                !selectedCategoryDepartmentId
                  ? styles.optionSelected
                  : undefined,
              ]}
            >
              <Text style={styles.optionText}>
                Sin departamento
              </Text>
            </Pressable>

            {activeDepartments.map(
              (department) => (
                <Pressable
                  key={department.id}
                  onPress={() =>
                    setSelectedCategoryDepartmentId(
                      department.id,
                    )
                  }
                  style={[
                    styles.option,
                    selectedCategoryDepartmentId ===
                    department.id
                      ? styles.optionSelected
                      : undefined,
                  ]}
                >
                  <Text
                    style={
                      styles.optionText
                    }
                  >
                    {department.name}
                  </Text>
                </Pressable>
              ),
            )}
          </View>

          <Pressable
            disabled={isSaving}
            onPress={() => {
              void createCategory();
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              Crear categoría
            </Text>
          </Pressable>

          <View style={styles.list}>
            {data.categories.map(
              (category) => (
                <View
                  key={category.id}
                  style={styles.itemCard}
                >
                  <View style={styles.itemMain}>
                    <Text style={styles.itemTitle}>
                      {category.name}
                    </Text>

                    <Text style={styles.itemMeta}>
                      {category.department
                        ?.name ??
                        'Sin departamento'}
                      {' · '}
                      {category.active
                        ? 'Activa'
                        : 'Inactiva'}
                    </Text>
                  </View>

                  <Pressable
                    disabled={isSaving}
                    onPress={() => {
                      void request(
                        `/organizations/${organizationId}/admin/categories/${category.id}`,
                        'PATCH',
                        {
                          active:
                            !category.active,
                        },
                      );
                    }}
                    style={[
                      styles.smallButton,
                      category.active
                        ? styles.deactivateButton
                        : styles.activateButton,
                    ]}
                  >
                    <Text
                      style={
                        styles.smallButtonText
                      }
                    >
                      {category.active
                        ? 'Desactivar'
                        : 'Activar'}
                    </Text>
                  </Pressable>
                </View>
              ),
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Personal y miembros
          </Text>

          <Text style={styles.sectionHelp}>
            Los administradores gestionan la organización, el personal atiende reportes y los miembros los registran.
          </Text>

          <View style={styles.list}>
            {data.memberships.map(
              (membership) => {
                const isCurrentUser =
                  membership.user.id ===
                  user?.id;

                return (
                  <View
                    key={membership.id}
                    style={styles.memberCard}
                  >
                    <Text style={styles.itemTitle}>
                      {
                        membership.user
                          .fullName
                      }
                    </Text>

                    <Text style={styles.itemMeta}>
                      {
                        membership.user
                          .email
                      }
                    </Text>

                    {isCurrentUser ? (
                      <Text
                        style={
                          styles.currentUser
                        }
                      >
                        Tu membresía
                      </Text>
                    ) : (
                      <>
                        <Text
                          style={
                            styles.fieldLabel
                          }
                        >
                          Rol
                        </Text>

                        <View
                          style={
                            styles.optionsWrap
                          }
                        >
                          {(
                            [
                              'MEMBER',
                              'STAFF',
                              'ADMIN',
                            ] as const
                          ).map((role) => (
                            <Pressable
                              key={role}
                              disabled={
                                isSaving
                              }
                              onPress={() => {
                                void request(
                                  `/organizations/${organizationId}/admin/members/${membership.id}`,
                                  'PATCH',
                                  {
                                    role,
                                  },
                                );
                              }}
                              style={[
                                styles.option,
                                membership.role ===
                                role
                                  ? styles.optionSelected
                                  : undefined,
                              ]}
                            >
                              <Text
                                style={
                                  styles.optionText
                                }
                              >
                                {role ===
                                'MEMBER'
                                  ? 'Miembro'
                                  : role ===
                                      'STAFF'
                                    ? 'Personal'
                                    : 'Administrador'}
                              </Text>
                            </Pressable>
                          ))}
                        </View>

                        <Pressable
                          disabled={isSaving}
                          onPress={() => {
                            void request(
                              `/organizations/${organizationId}/admin/members/${membership.id}`,
                              'PATCH',
                              {
                                status:
                                  membership.status ===
                                  'ACTIVE'
                                    ? 'SUSPENDED'
                                    : 'ACTIVE',
                              },
                            );
                          }}
                          style={[
                            styles.memberStatusButton,
                            membership.status ===
                            'ACTIVE'
                              ? styles.suspendButton
                              : styles.activateMemberButton,
                          ]}
                        >
                          <Text
                            style={
                              styles.memberStatusText
                            }
                          >
                            {membership.status ===
                            'ACTIVE'
                              ? 'Suspender acceso'
                              : 'Activar acceso'}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                );
              },
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Invitaciones
          </Text>

          {data.organization.type ===
          'PRIVATE' ? (
            <>
              <Text style={styles.sectionHelp}>
                Genera un código temporal para permitir el ingreso a esta organización privada.
              </Text>

              <TextInput
                value={invitationEmail}
                onChangeText={
                  setInvitationEmail
                }
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#98A2B3"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isSaving}
                style={styles.input}
              />

              <Pressable
                disabled={isSaving}
                onPress={() => {
                  void createInvitation();
                }}
                style={styles.primaryButton}
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Crear invitación
                </Text>
              </Pressable>

              {lastInvitationToken ? (
                <View
                  style={
                    styles.tokenCard
                  }
                >
                  <Text
                    style={
                      styles.tokenLabel
                    }
                  >
                    Código generado
                  </Text>

                  <Text
                    selectable
                    style={
                      styles.tokenValue
                    }
                  >
                    {
                      lastInvitationToken
                    }
                  </Text>

                  <Text
                    style={
                      styles.tokenHelp
                    }
                  >
                    Este código se muestra una sola vez. Compártelo únicamente con la persona invitada.
                  </Text>
                </View>
              ) : null}

              <View style={styles.list}>
                {data.invitations.map(
                  (invitation) => (
                    <View
                      key={
                        invitation.id
                      }
                      style={
                        styles.itemCard
                      }
                    >
                      <View
                        style={
                          styles.itemMain
                        }
                      >
                        <Text
                          style={
                            styles.itemTitle
                          }
                        >
                          {
                            invitation.email
                          }
                        </Text>

                        <Text
                          style={
                            styles.itemMeta
                          }
                        >
                          {
                            invitation.status
                          }
                        </Text>
                      </View>

                      {invitation.status ===
                      'PENDING' ? (
                        <Pressable
                          disabled={
                            isSaving
                          }
                          onPress={() => {
                            Alert.alert(
                              'Revocar invitación',
                              '¿Deseas invalidar este código?',
                              [
                                {
                                  text:
                                    'Cancelar',
                                  style:
                                    'cancel',
                                },
                                {
                                  text:
                                    'Revocar',
                                  style:
                                    'destructive',
                                  onPress:
                                    () => {
                                      void request(
                                        `/organizations/${organizationId}/admin/invitations/${invitation.id}/revoke`,
                                        'POST',
                                      );
                                    },
                                },
                              ],
                            );
                          }}
                          style={
                            styles.revokeButton
                          }
                        >
                          <Text
                            style={
                              styles.revokeText
                            }
                          >
                            Revocar
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ),
                )}
              </View>
            </>
          ) : (
            <Text style={styles.sectionHelp}>
              Esta organización es pública, por lo que los usuarios pueden unirse directamente y no necesita códigos de invitación.
            </Text>
          )}
        </View>

        <Pressable
          onPress={() =>
            router.replace(
              `/organizations/${organizationId}/admin` as never,
            )
          }
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>
            Volver al panel de gestión
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
    paddingHorizontal: 22,
    paddingVertical: 28,
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#2F8F9D',
  },
  title: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: '800',
    color: '#17365D',
  },
  subtitle: {
    marginTop: 5,
    fontSize: 16,
    color: '#667085',
  },
  loadingText: {
    marginTop: 14,
    color: '#667085',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  errorText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#667085',
  },
  section: {
    marginTop: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  sectionHelp: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 19,
    color: '#667085',
  },
  createRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  addButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: '#17365D',
  },
  addButtonText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  list: {
    marginTop: 14,
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderRadius: 12,
  },
  itemMain: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#344054',
  },
  itemMeta: {
    marginTop: 3,
    fontSize: 12,
    color: '#667085',
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
  },
  activateButton: {
    backgroundColor: '#EAF7EE',
  },
  deactivateButton: {
    backgroundColor: '#FFF4E5',
  },
  smallButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#344054',
  },
  fieldLabel: {
    marginTop: 14,
    marginBottom: 7,
    fontSize: 12,
    fontWeight: '800',
    color: '#475467',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  option: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    borderColor: '#2F8F9D',
    backgroundColor: '#EAF7F8',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#344054',
  },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: '#17365D',
  },
  primaryButtonText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  memberCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#EAECF0',
    borderRadius: 12,
  },
  currentUser: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#2F8F9D',
  },
  memberStatusButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 10,
  },
  suspendButton: {
    backgroundColor: '#FFF4E5',
  },
  activateMemberButton: {
    backgroundColor: '#EAF7EE',
  },
  memberStatusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#344054',
  },
  tokenCard: {
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A6D7DD',
    borderRadius: 12,
    backgroundColor: '#EFFAFA',
  },
  tokenLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#216B75',
  },
  tokenValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#17365D',
  },
  tokenHelp: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: '#667085',
  },
  revokeButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#FEF3F2',
  },
  revokeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B42318',
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