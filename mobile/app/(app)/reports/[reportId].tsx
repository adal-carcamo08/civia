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
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/auth-context';
import {
  ApiError,
  apiRequest,
  buildApiUrl,
} from '../../../services/api';

type ReportStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'NOT_APPLICABLE'
  | 'REJECTED';

type ReportDetail = {
  id: string;
  code: string;
  status: ReportStatus;
  description: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  organization: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  assignedTo: {
    id: string;
    fullName: string;
  } | null;
  attachments: Array<{
    id: string;
    url: string;
    fileName: string;
    mimeType: string;
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

const statusLabels: Record<ReportStatus, string> = {
  RECEIVED: 'Recibido',
  UNDER_REVIEW: 'En revisión',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En proceso',
  RESOLVED: 'Resuelto',
  NOT_APPLICABLE: 'No procede',
  REJECTED: 'Rechazado',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-SV', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function ReportDetailScreen() {
  const params = useLocalSearchParams<{
    reportId?: string | string[];
  }>();

  const { token } = useAuth();

  const reportId = Array.isArray(params.reportId)
    ? params.reportId[0]
    : params.reportId;

  const [report, setReport] =
    useState<ReportDetail | null>(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<ReportDetail['attachments'][number] | null>(
      null
    );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadReport = useCallback(async () => {
    if (!token || !reportId) {
      setReport(null);
      setErrorMessage(
        'No pudimos identificar el reporte solicitado.'
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiRequest<ReportDetail>(
        `/reports/${reportId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setReport(response);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 404
      ) {
        setErrorMessage(
          'No encontramos este reporte o ya no está disponible.'
        );
      } else {
        setErrorMessage(
          'No pudimos cargar el reporte. Inténtalo nuevamente.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [reportId, token]);

  useFocusEffect(
    useCallback(() => {
      void loadReport();
    }, [loadReport])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Pressable
            onPress={() => router.replace('/reports')}
            style={({ pressed }) => [
              styles.topBackButton,
              pressed ? styles.buttonPressed : undefined,
            ]}
          >
            <Text style={styles.topBackText}>
              ‹ Mis reportes
            </Text>
          </Pressable>

          <Text style={styles.brand}>CIVIA</Text>

          <Text style={styles.title}>
            Detalle del reporte
          </Text>

          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator
                size="large"
                color="#17365D"
              />

              <Text style={styles.stateText}>
                Cargando reporte...
              </Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.centerState}>
              <Text style={styles.errorTitle}>
                No pudimos mostrar el reporte
              </Text>

              <Text style={styles.stateText}>
                {errorMessage}
              </Text>

              <Pressable
                onPress={() => {
                  void loadReport();
                }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed
                    ? styles.buttonPressed
                    : undefined,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  Intentar nuevamente
                </Text>
              </Pressable>
            </View>
          ) : report ? (
            <>
              <Text style={styles.reportCode}>
                {report.code}
              </Text>

              <View style={styles.statusCard}>
                <Text style={styles.sectionLabel}>
                  Estado actual
                </Text>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {statusLabels[report.status]}
                  </Text>
                </View>

                <Text style={styles.updatedText}>
                  Actualizado {formatDate(report.updatedAt)}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Información del reporte
                </Text>

                <View style={styles.infoCard}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>
                      Organización
                    </Text>

                    <Text style={styles.infoValue}>
                      {report.organization.name}
                    </Text>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>
                      Categoría
                    </Text>

                    <Text style={styles.infoValue}>
                      {report.category?.name ??
                        'Sin categoría'}
                    </Text>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>
                      Departamento
                    </Text>

                    <Text style={styles.infoValue}>
                      {report.department?.name ??
                        'Pendiente de asignación'}
                    </Text>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>
                      Responsable
                    </Text>

                    <Text style={styles.infoValue}>
                      {report.assignedTo?.fullName ??
                        'Pendiente de asignación'}
                    </Text>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>
                      Descripción
                    </Text>

                    <Text style={styles.infoValue}>
                      {report.description}
                    </Text>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>
                      Ubicación
                    </Text>

                    <Text style={styles.infoValue}>
                      {report.location ??
                        'No especificada'}
                    </Text>
                  </View>

                  <View style={styles.separator} />

                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>
                      Fecha de creación
                    </Text>

                    <Text style={styles.infoValue}>
                      {formatDate(report.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Seguimiento
                </Text>

                {report.history.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>
                      Aún no hay movimientos registrados.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.timelineList}>
                    {report.history.map(
                      (historyItem, index) => (
                        <View
                          key={historyItem.id}
                          style={styles.timelineCard}
                        >
                          <View
                            style={styles.timelineIndicator}
                          >
                            <View
                              style={styles.timelineDot}
                            />

                            {index <
                            report.history.length - 1 ? (
                              <View
                                style={styles.timelineLine}
                              />
                            ) : null}
                          </View>

                          <View
                            style={styles.timelineContent}
                          >
                            <Text
                              style={styles.timelineTitle}
                            >
                              {
                                statusLabels[
                                  historyItem.toStatus
                                ]
                              }
                            </Text>

                            <Text
                              style={styles.timelineDate}
                            >
                              {formatDate(
                                historyItem.createdAt
                              )}
                            </Text>

                            {historyItem.note ? (
                              <Text
                                style={styles.timelineText}
                              >
                                {historyItem.note}
                              </Text>
                            ) : null}

                            {historyItem.changedBy ? (
                              <Text
                                style={styles.changedBy}
                              >
                                Por{' '}
                                {
                                  historyItem.changedBy
                                    .fullName
                                }
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      )
                    )}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Evidencias
                </Text>

                {report.attachments.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>
                      Este reporte no tiene evidencias adjuntas.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.attachmentsCard}>
                    {report.attachments.map(
                      (attachment, index) => (
                        <View key={attachment.id}>
                          <View
                            style={styles.attachmentItem}
                          >
                            <Pressable
                              onPress={() =>
                                setPreviewAttachment(
                                  attachment
                                )
                              }
                              style={({ pressed }) => [
                                styles.attachmentImageButton,
                                pressed
                                  ? styles.buttonPressed
                                  : undefined,
                              ]}
                            >
                              <Image
                                source={{
                                  uri: buildApiUrl(
                                    attachment.url
                                  ),
                                  headers: {
                                    Authorization: `Bearer ${token}`,
                                  },
                                }}
                                style={styles.attachmentImage}
                                resizeMode="cover"
                              />
                            </Pressable>

                            <View
                              style={styles.attachmentInfo}
                            >
                              <Text
                                style={styles.fileName}
                                numberOfLines={1}
                              >
                                {attachment.fileName}
                              </Text>

                              <Text
                                style={styles.fileMeta}
                              >
                                {attachment.mimeType} ·{' '}
                                {formatDate(
                                  attachment.createdAt
                                )}
                              </Text>

                              <Text
                                style={styles.protectedText}
                              >
                                Evidencia protegida
                              </Text>
                            </View>
                          </View>

                          {index <
                          report.attachments.length - 1 ? (
                            <View
                              style={styles.separator}
                            />
                          ) : null}
                        </View>
                      )
                    )}
                  </View>
                )}
              </View>

              <Pressable
                onPress={() =>
                  router.replace('/reports')
                }
                style={({ pressed }) => [
                  styles.backButton,
                  pressed
                    ? styles.buttonPressed
                    : undefined,
                ]}
              >
                <Text style={styles.backButtonText}>
                  Volver a mis reportes
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={previewAttachment !== null}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setPreviewAttachment(null)
        }
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewHeader}>
            <Text
              style={styles.previewFileName}
              numberOfLines={1}
            >
              {previewAttachment?.fileName ??
                'Evidencia'}
            </Text>

            <Pressable
              onPress={() =>
                setPreviewAttachment(null)
              }
              hitSlop={12}
              style={({ pressed }) => [
                styles.previewCloseButton,
                pressed
                  ? styles.previewClosePressed
                  : undefined,
              ]}
            >
              <Text style={styles.previewCloseText}>
                Cerrar
              </Text>
            </Pressable>
          </View>

          <View style={styles.previewContent}>
            {previewAttachment ? (
              <Image
                source={{
                  uri: buildApiUrl(
                    previewAttachment.url
                  ),
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }}
                style={styles.previewImage}
                resizeMode="contain"
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
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 32,
  },
  topBackButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 10,
  },
  topBackText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2F75B5',
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
  reportCode: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: '#667085',
  },
  centerState: {
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  stateText: {
    maxWidth: 320,
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#667085',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1F2937',
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
  statusCard: {
    marginTop: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#E8EFF7',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#17365D',
  },
  updatedText: {
    marginTop: 10,
    fontSize: 12,
    color: '#98A2B3',
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  infoItem: {
    padding: 18,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
  },
  infoValue: {
    marginTop: 5,
    fontSize: 15,
    lineHeight: 22,
    color: '#344054',
  },
  separator: {
    height: 1,
    backgroundColor: '#E4E7EC',
  },
  emptyCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#667085',
  },
  timelineList: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  timelineCard: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  timelineIndicator: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    marginTop: 4,
    borderRadius: 6,
    backgroundColor: '#2F8F9D',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 42,
    marginTop: 5,
    backgroundColor: '#D0D5DD',
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 20,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  timelineDate: {
    marginTop: 3,
    fontSize: 12,
    color: '#98A2B3',
  },
  timelineText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
  },
  changedBy: {
    marginTop: 6,
    fontSize: 12,
    color: '#667085',
  },
  attachmentsCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  attachmentImageButton: {
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8EFF7',
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#344054',
  },
  fileMeta: {
    marginTop: 4,
    fontSize: 11,
    color: '#98A2B3',
  },
  protectedText: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '600',
    color: '#2F75B5',
  },
  backButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#17365D',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  previewFileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewCloseButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewClosePressed: {
    opacity: 0.65,
  },
  previewCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  buttonPressed: {
    opacity: 0.88,
  },
});