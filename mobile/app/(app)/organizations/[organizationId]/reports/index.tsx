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
import { useAuth } from '../../../../../contexts/auth-context';
import {
  ApiError,
  apiRequest,
} from '../../../../../services/api';

type ReportStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'NOT_APPLICABLE'
  | 'REJECTED'
  | 'CANCELLED';

type OrganizationReport = {
  id: string;
  code: string;
  status: ReportStatus;
  description: string;
  location: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: {
    id: string;
    fullName: string;
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
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  ).format(new Date(value));
}

export default function OrganizationReportsScreen() {
  const params =
    useLocalSearchParams<{
      organizationId?:
        | string
        | string[];
    }>();

  const { token } = useAuth();

  const organizationId =
    Array.isArray(
      params.organizationId
    )
      ? params.organizationId[0]
      : params.organizationId;

  const [reports, setReports] =
    useState<OrganizationReport[]>(
      []
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState('');

  const loadReports =
    useCallback(async () => {
      if (
        !token ||
        !organizationId
      ) {
        setReports([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError('');

      try {
        const response =
          await apiRequest<
            OrganizationReport[]
          >(
            `/organizations/${organizationId}/reports`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        setReports(response);
      } catch (error) {
        setReports([]);

        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'No pudimos cargar los reportes de esta organización.'
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      organizationId,
      token,
    ]);

  useFocusEffect(
    useCallback(() => {
      void loadReports();
    }, [loadReports])
  );

  const goBack = () => {
    if (!organizationId) {
      router.replace(
        '/organizations'
      );
      return;
    }

    router.replace({
      pathname:
        '/organizations/[organizationId]',
      params: {
        organizationId,
      },
    });
  };

  const createReport = () => {
    if (!organizationId) {
      return;
    }

    router.push({
      pathname:
        '/organizations/[organizationId]/reports/new',
      params: {
        organizationId,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Text style={styles.brand}>
          CIVIA
        </Text>

        <Text style={styles.title}>
          Reportes de la organización
        </Text>

        <Text style={styles.subtitle}>
          Consulta los reportes registrados dentro de esta organización.
        </Text>

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color="#17365D"
            />

            <Text
              style={styles.stateText}
            >
              Cargando reportes...
            </Text>
          </View>
        ) : loadError ? (
          <View style={styles.centerState}>
            <Text
              style={styles.emptyTitle}
            >
              No pudimos cargar los reportes
            </Text>

            <Text
              style={styles.emptyText}
            >
              {loadError}
            </Text>

            <Pressable
              onPress={() => {
                void loadReports();
              }}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed
                  ? styles.buttonPressed
                  : undefined,
              ]}
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Intentar nuevamente
              </Text>
            </Pressable>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.centerState}>
            <View
              style={
                styles.iconCircle
              }
            >
              <Text
                style={
                  styles.iconText
                }
              >
                !
              </Text>
            </View>

            <Text
              style={styles.emptyTitle}
            >
              Aún no hay reportes
            </Text>

            <Text
              style={styles.emptyText}
            >
              Los reportes de esta organización aparecerán aquí cuando estén disponibles.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            <Text
              style={
                styles.resultCount
              }
            >
              {reports.length === 1
                ? '1 reporte'
                : `${reports.length} reportes`}
            </Text>

            {reports.map(
              (report) => (
                <View
                  key={report.id}
                  style={
                    styles.reportCard
                  }
                >
                  <View
                    style={
                      styles.cardHeader
                    }
                  >
                    <View
                      style={
                        styles.headerText
                      }
                    >
                      <Text
                        style={
                          styles.reportCode
                        }
                        numberOfLines={1}
                      >
                        {report.code}
                      </Text>

                      <Text
                        style={
                          styles.reportDate
                        }
                      >
                        {formatDate(
                          report.createdAt
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.statusBadge
                      }
                    >
                      <Text
                        style={
                          styles.statusText
                        }
                      >
                        {
                          statusLabels[
                            report.status
                          ]
                        }
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.categoryName
                    }
                  >
                    {report.category
                      ?.name ??
                      'Sin categoría'}
                  </Text>

                  <Text
                    style={
                      styles.description
                    }
                    numberOfLines={3}
                  >
                    {report.description}
                  </Text>

                  <View
                    style={
                      styles.metaSection
                    }
                  >
                    <Text
                      style={
                        styles.metaText
                      }
                    >
                      Ubicación: {report.location ??
                        'No especificada'}
                    </Text>

                    <Text
                      style={
                        styles.metaText
                      }
                    >
                      Reportado por: {
                        report.reporter
                          .fullName
                      }
                    </Text>

                    <Text
                      style={
                        styles.metaText
                      }
                    >
                      Departamento: {
                        report.department
                          ?.name ??
                        'Pendiente de asignación'
                      }
                    </Text>

                    <Text
                      style={
                        styles.metaText
                      }
                    >
                      Responsable: {
                        report.assignedTo
                          ?.fullName ??
                        'Pendiente de asignación'
                      }
                    </Text>
                  </View>
                </View>
              )
            )}
          </View>
        )}

        <View
          style={
            styles.footerActions
          }
        >
          <Pressable
            onPress={createReport}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed
                ? styles.buttonPressed
                : undefined,
            ]}
          >
            <Text
              style={
                styles.primaryButtonText
              }
            >
              Crear nuevo reporte
            </Text>
          </Pressable>

          <Pressable
            onPress={goBack}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed
                ? styles.buttonPressed
                : undefined,
            ]}
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              Volver a la organización
            </Text>
          </Pressable>
        </View>
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
  centerState: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    marginTop: 12,
    fontSize: 15,
    color: '#667085',
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
    fontSize: 36,
    fontWeight: '700',
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
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#667085',
  },
  list: {
    marginTop: 28,
    gap: 14,
  },
  resultCount: {
    marginBottom: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#667085',
  },
  reportCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  reportCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667085',
  },
  reportDate: {
    marginTop: 3,
    fontSize: 12,
    color: '#98A2B3',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E8EFF7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#17365D',
  },
  categoryName: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  description: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    color: '#475467',
  },
  metaSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#667085',
  },
  footerActions: {
    marginTop: 28,
    gap: 12,
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