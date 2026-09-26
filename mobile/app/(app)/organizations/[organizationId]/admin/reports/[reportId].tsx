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
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useAuth } from '../../../../../../contexts/auth-context';
import {
  ApiError,
  apiRequest,
  buildApiUrl,
} from '../../../../../../services/api';

type ReportStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'NOT_APPLICABLE'
  | 'REJECTED'
  | 'CANCELLED';

type AdminContext = {
  organization: {
    id: string;
    name: string;
    type: 'PUBLIC' | 'PRIVATE';
  };
  accessRole:
    | 'STAFF'
    | 'ADMIN'
    | 'GLOBAL_ADMIN';
  departments: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  staff: Array<{
    id: string;
    fullName: string;
    email: string;
    role: 'STAFF' | 'ADMIN';
  }>;
};

type AdminReport = {
  id: string;
  code: string;
  status: ReportStatus;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: {
    id: string;
    fullName: string;
    email: string;
  };
  organization: {
    id: string;
    name: string;
    type: 'PUBLIC' | 'PRIVATE';
  };
  category: {
    id: string;
    name: string;
  };
  department: {
    id: string;
    name: string;
  } | null;
  assignedTo: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  attachments: Array<{
    id: string;
    url: string;
    fileName: string | null;
    mimeType: string | null;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    fromStatus: ReportStatus | null;
    toStatus: ReportStatus;
    note: string | null;
    createdAt: string;
    changedBy: {
      id: string;
      fullName: string;
    } | null;
  }>;
};

const statusLabels: Record<
  ReportStatus,
  string
> = {
  RECEIVED: 'Recibido',
  UNDER_REVIEW: 'En revisión',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En proceso',
  RESOLVED: 'Resuelto',
  NOT_APPLICABLE: 'No procede',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    'es-SV',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'No se pudo completar la operación.';
}

export default function AdminReportDetailScreen() {
  const {
    organizationId,
    reportId,
  } = useLocalSearchParams<{
    organizationId: string;
    reportId: string;
  }>();

  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [context, setContext] =
    useState<AdminContext | null>(null);

  const [report, setReport] =
    useState<AdminReport | null>(null);

  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState('');

  const [selectedStaffId, setSelectedStaffId] =
    useState('');

  const [selectedEvidenceId, setSelectedEvidenceId] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState('');

  const loadData = useCallback(
    async () => {
      if (
        !token ||
        !organizationId ||
        !reportId
      ) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError('');

      try {
        const [contextData, reportData] =
          await Promise.all([
            apiRequest<AdminContext>(
              `/organizations/${organizationId}/admin/context`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            ),
            apiRequest<AdminReport>(
              `/organizations/${organizationId}/admin/reports/${reportId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            ),
          ]);

        setContext(contextData);
        setReport(reportData);

        setSelectedDepartmentId(
          reportData.department?.id ?? '',
        );

        setSelectedStaffId(
          reportData.assignedTo?.id ?? '',
        );
      } catch (error) {
        setReport(null);
        setContext(null);
        setLoadError(
          getErrorMessage(error),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      organizationId,
      reportId,
      token,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const changeStatus = async (
    status:
      | 'UNDER_REVIEW'
      | 'IN_PROGRESS'
      | 'RESOLVED'
      | 'NOT_APPLICABLE'
      | 'REJECTED',
  ) => {
    if (
      !token ||
      !organizationId ||
      !reportId
    ) {
      return;
    }

    setIsSaving(true);

    try {
      await apiRequest(
        `/organizations/${organizationId}/admin/reports/${reportId}/status`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
          }),
        },
      );

      await loadData();
    } catch (error) {
      Alert.alert(
        'No se pudo actualizar',
        getErrorMessage(error),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmStatus = (
    status:
      | 'UNDER_REVIEW'
      | 'IN_PROGRESS'
      | 'RESOLVED'
      | 'NOT_APPLICABLE'
      | 'REJECTED',
    title: string,
    message: string,
  ) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: () => {
            void changeStatus(status);
          },
        },
      ],
    );
  };

  const assignReport = async () => {
    if (
      !token ||
      !organizationId ||
      !reportId
    ) {
      return;
    }

    if (!selectedDepartmentId) {
      Alert.alert(
        'Departamento requerido',
        'Selecciona el departamento que atenderá el reporte.',
      );
      return;
    }

    if (!selectedStaffId) {
      Alert.alert(
        'Responsable requerido',
        'Selecciona un responsable para el reporte.',
      );
      return;
    }

    setIsSaving(true);

    try {
      await apiRequest(
        `/organizations/${organizationId}/admin/reports/${reportId}/assignment`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            departmentId:
              selectedDepartmentId,
            assignedToUserId:
              selectedStaffId,
          }),
        },
      );

      await loadData();
    } catch (error) {
      Alert.alert(
        'No se pudo asignar',
        getErrorMessage(error),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#17365D"
          />

          <Text style={styles.loadingText}>
            Cargando reporte...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (
    loadError ||
    !context ||
    !report
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            No pudimos cargar el reporte
          </Text>

          <Text style={styles.errorText}>
            {loadError}
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

  const isTerminal =
    report.status === 'RESOLVED' ||
    report.status ===
      'NOT_APPLICABLE' ||
    report.status === 'REJECTED' ||
    report.status === 'CANCELLED';

  const canAssign =
    report.status ===
      'UNDER_REVIEW' ||
    report.status === 'ASSIGNED' ||
    report.status ===
      'IN_PROGRESS';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>
          CIVIA GESTIÓN
        </Text>

        <View style={styles.titleRow}>
          <View style={styles.titleContent}>
            <Text style={styles.title}>
              {report.category.name}
            </Text>

            <Text style={styles.code}>
              {report.code}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {statusLabels[report.status]}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Información del reporte
          </Text>

          <Text style={styles.label}>
            Descripción
          </Text>
          <Text style={styles.value}>
            {report.description}
          </Text>

          <Text style={styles.label}>
            Ubicación
          </Text>
          <Text style={styles.value}>
            {report.location}
          </Text>

          <Text style={styles.label}>
            Reportante
          </Text>
          <Text style={styles.value}>
            {report.reporter.fullName}
          </Text>
          <Text style={styles.secondaryValue}>
            {report.reporter.email}
          </Text>

          <Text style={styles.label}>
            Registrado
          </Text>
          <Text style={styles.value}>
            {formatDate(
              report.createdAt,
            )}
          </Text>
        </View>

        {report.attachments.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Evidencias
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={
                styles.evidenceRow
              }
            >
              {report.attachments.map(
                (attachment) => (
                  <Pressable
                    key={attachment.id}
                    onPress={() =>
                      setSelectedEvidenceId(
                        attachment.id,
                      )
                    }
                    style={({ pressed }) => [
                      styles.evidenceButton,
                      pressed
                        ? styles.evidencePressed
                        : undefined,
                    ]}
                  >
                    <Image
                      source={{
                        uri: buildApiUrl(
                          `/organizations/${organizationId}/admin/reports/${reportId}/attachments/${attachment.id}/file`,
                        ),
                        headers: {
                          Authorization:
                            `Bearer ${token}`,
                        },
                      }}
                      style={
                        styles.evidenceImage
                      }
                    />

                    <View
                      style={
                        styles.evidenceHint
                      }
                    >
                      <Text
                        style={
                          styles.evidenceHintText
                        }
                      >
                        Toca para ampliar
                      </Text>
                    </View>
                  </Pressable>
                ),
              )}
            </ScrollView>
          </View>
        ) : null}

        {!isTerminal ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Gestión
            </Text>

            {report.status ===
            'RECEIVED' ? (
              <>
                <Text style={styles.helpText}>
                  Inicia la revisión antes de
                  asignar el caso.
                </Text>

                <Pressable
                  disabled={isSaving}
                  onPress={() =>
                    confirmStatus(
                      'UNDER_REVIEW',
                      'Iniciar revisión',
                      '¿Deseas poner este reporte en revisión?',
                    )
                  }
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
                    Poner en revisión
                  </Text>
                </Pressable>
              </>
            ) : null}

            {canAssign ? (
              <>
                <Text style={styles.fieldTitle}>
                  Departamento
                </Text>

                <View style={styles.optionList}>
                  {context.departments.map(
                    (department) => (
                      <Pressable
                        key={department.id}
                        disabled={isSaving}
                        onPress={() =>
                          setSelectedDepartmentId(
                            department.id,
                          )
                        }
                        style={[
                          styles.option,
                          selectedDepartmentId ===
                          department.id
                            ? styles.optionSelected
                            : undefined,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selectedDepartmentId ===
                            department.id
                              ? styles.optionTextSelected
                              : undefined,
                          ]}
                        >
                          {department.name}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>

                <Text style={styles.fieldTitle}>
                  Responsable de la organización
                </Text>

                <Text style={styles.fieldHelp}>
                  Selecciona un integrante autorizado
                  de esta organización.
                </Text>

                <View style={styles.optionList}>
                  {context.staff.map(
                    (person) => (
                      <Pressable
                        key={person.id}
                        disabled={isSaving}
                        onPress={() =>
                          setSelectedStaffId(
                            person.id,
                          )
                        }
                        style={[
                          styles.option,
                          selectedStaffId ===
                          person.id
                            ? styles.optionSelected
                            : undefined,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selectedStaffId ===
                            person.id
                              ? styles.optionTextSelected
                              : undefined,
                          ]}
                        >
                          {person.fullName}
                        </Text>

                        <Text
                          style={
                            styles.optionSecondary
                          }
                        >
                          {person.role ===
                          'ADMIN'
                            ? 'Administrador de la organización'
                            : 'Personal de la organización'}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>

                <Pressable
                  disabled={isSaving}
                  onPress={() => {
                    void assignReport();
                  }}
                  style={[
                    styles.secondaryButton,
                    isSaving
                      ? styles.disabled
                      : undefined,
                  ]}
                >
                  <Text
                    style={
                      styles.secondaryButtonText
                    }
                  >
                    Guardar asignación
                  </Text>
                </Pressable>
              </>
            ) : null}

            {report.status ===
            'ASSIGNED' ? (
              <Pressable
                disabled={isSaving}
                onPress={() =>
                  confirmStatus(
                    'IN_PROGRESS',
                    'Iniciar atención',
                    '¿Confirmas que el responsable comenzará a atender este reporte?',
                  )
                }
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
                  Iniciar atención
                </Text>
              </Pressable>
            ) : null}

            {report.status ===
            'IN_PROGRESS' ? (
              <Pressable
                disabled={isSaving}
                onPress={() =>
                  confirmStatus(
                    'RESOLVED',
                    'Resolver reporte',
                    '¿Confirmas que este reporte fue resuelto?',
                  )
                }
                style={[
                  styles.resolveButton,
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
                  Marcar como resuelto
                </Text>
              </Pressable>
            ) : null}

            {(
              report.status ===
                'RECEIVED' ||
              report.status ===
                'UNDER_REVIEW'
            ) ? (
              <View
                style={
                  styles.terminalActions
                }
              >
                <Pressable
                  disabled={isSaving}
                  onPress={() =>
                    confirmStatus(
                      'NOT_APPLICABLE',
                      'Marcar como no procede',
                      'Esta acción cerrará el reporte. ¿Deseas continuar?',
                    )
                  }
                  style={
                    styles.warningButton
                  }
                >
                  <Text
                    style={
                      styles.warningButtonText
                    }
                  >
                    No procede
                  </Text>
                </Pressable>

                <Pressable
                  disabled={isSaving}
                  onPress={() =>
                    confirmStatus(
                      'REJECTED',
                      'Rechazar reporte',
                      'Esta acción cerrará el reporte. ¿Deseas continuar?',
                    )
                  }
                  style={
                    styles.dangerButton
                  }
                >
                  <Text
                    style={
                      styles.dangerButtonText
                    }
                  >
                    Rechazar
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.finalCard}>
            <Text style={styles.finalTitle}>
              Caso cerrado
            </Text>

            <Text style={styles.helpText}>
              Este reporte se encuentra en un
              estado final y ya no admite
              cambios operativos.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Historial
          </Text>

          {report.history.map(
            (entry) => (
              <View
                key={entry.id}
                style={styles.historyItem}
              >
                <View
                  style={
                    styles.historyDot
                  }
                />

                <View style={styles.historyContent}>
                  <Text
                    style={
                      styles.historyStatus
                    }
                  >
                    {
                      statusLabels[
                        entry.toStatus
                      ]
                    }
                  </Text>

                  {entry.note ? (
                    <Text
                      style={
                        styles.historyNote
                      }
                    >
                      {entry.note}
                    </Text>
                  ) : null}

                  <Text
                    style={
                      styles.historyMeta
                    }
                  >
                    {formatDate(
                      entry.createdAt,
                    )}
                    {entry.changedBy
                      ? ` · ${entry.changedBy.fullName}`
                      : ''}
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>

        <Pressable
          onPress={() =>
            router.replace(
              `/organizations/${organizationId}/admin` as never
            )
          }
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>
            Volver al panel de gestión
          </Text>
        </Pressable>
      </ScrollView>
      <Modal
        visible={selectedEvidenceId !== null}
        transparent={false}
        animationType="fade"
        onRequestClose={() =>
          setSelectedEvidenceId(null)
        }
      >
        <View
          style={[
            styles.previewSafeArea,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>
              Evidencia
            </Text>

            <Pressable
              onPress={() =>
                setSelectedEvidenceId(null)
              }
              style={({ pressed }) => [
                styles.previewCloseButton,
                pressed
                  ? styles.previewClosePressed
                  : undefined,
              ]}
            >
              <Text
                style={
                  styles.previewCloseText
                }
              >
                Cerrar
              </Text>
            </Pressable>
          </View>

          <View style={styles.previewBody}>
            {selectedEvidenceId ? (
              <Image
                source={{
                  uri: buildApiUrl(
                    `/organizations/${organizationId}/admin/reports/${reportId}/attachments/${selectedEvidenceId}/file`,
                  ),
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }}
                resizeMode="contain"
                style={styles.previewImage}
              />
            ) : null}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 22,
    paddingVertical: 28,
    paddingBottom: 48,
  },
  centerState: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#667085',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  errorText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#667085',
  },
  brand: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#2F8F9D',
  },
  titleRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: '#17365D',
  },
  code: {
    marginTop: 5,
    fontSize: 11,
    color: '#98A2B3',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#EAF1F8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2F75B5',
  },
  card: {
    marginTop: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  label: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '700',
    color: '#667085',
  },
  value: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
  },
  secondaryValue: {
    marginTop: 2,
    fontSize: 13,
    color: '#667085',
  },
  helpText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#667085',
  },
  evidenceRow: {
    gap: 10,
  },
  evidenceButton: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  evidencePressed: {
    opacity: 0.82,
  },
  evidenceImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#EAECF0',
  },
  evidenceHint: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(23, 54, 93, 0.82)',
  },
  evidenceHintText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  fieldTitle: {
    marginTop: 20,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '800',
    color: '#344054',
  },
  fieldHelp: {
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 18,
    color: '#667085',
  },
  optionList: {
    gap: 8,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    borderColor: '#2F8F9D',
    backgroundColor: '#EAF7F8',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#344054',
  },
  optionTextSelected: {
    color: '#216B75',
  },
  optionSecondary: {
    marginTop: 3,
    fontSize: 12,
    color: '#667085',
  },
  primaryButton: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#17365D',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2F8F9D',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#216B75',
  },
  resolveButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#2F8F9D',
  },
  terminalActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  warningButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFF6E5',
  },
  warningButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B54708',
  },
  dangerButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FEF3F2',
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B42318',
  },
  disabled: {
    opacity: 0.55,
  },
  finalCard: {
    marginTop: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#B7E4C7',
    borderRadius: 16,
    backgroundColor: '#F0FAF4',
  },
  finalTitle: {
    marginBottom: 6,
    fontSize: 17,
    fontWeight: '800',
    color: '#216E39',
  },
  historyItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  historyDot: {
    width: 10,
    height: 10,
    marginTop: 5,
    borderRadius: 5,
    backgroundColor: '#2F8F9D',
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: '800',
    color: '#344054',
  },
  historyNote: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
    color: '#475467',
  },
  historyMeta: {
    marginTop: 4,
    fontSize: 11,
    color: '#98A2B3',
  },
  backButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2F75B5',
  },

  previewSafeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewHeader: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#000000',
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewCloseButton: {
    minWidth: 72,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#1F2937',
  },
  previewClosePressed: {
    opacity: 0.65,
  },
  previewCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },});