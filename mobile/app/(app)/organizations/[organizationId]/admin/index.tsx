import {
  router,
  useFocusEffect,
  useLocalSearchParams,
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

type AdminContext = {
  organization: {
    id: string;
    name: string;
    description: string | null;
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
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reporter: {
    id: string;
    fullName: string;
    email: string;
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
  _count: {
    attachments: number;
  };
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

const roleLabels = {
  STAFF: 'Personal',
  ADMIN: 'Administrador',
  GLOBAL_ADMIN: 'Administrador global',
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'No se pudo cargar el panel administrativo.';
}

export default function OrganizationAdminDashboard() {
  const { organizationId } =
    useLocalSearchParams<{
      organizationId: string;
    }>();

  const { token } = useAuth();

  const [context, setContext] =
    useState<AdminContext | null>(null);

  const [reports, setReports] =
    useState<AdminReport[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState('');

  const loadDashboard =
    useCallback(async () => {
      if (!token || !organizationId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError('');

      try {
        const [contextData, reportsData] =
          await Promise.all([
            apiRequest<AdminContext>(
              `/organizations/${organizationId}/admin/context`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            ),
            apiRequest<AdminReport[]>(
              `/organizations/${organizationId}/admin/reports`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            ),
          ]);

        setContext(contextData);
        setReports(reportsData);
      } catch (error) {
        setContext(null);
        setReports([]);
        setLoadError(
          getErrorMessage(error),
        );
      } finally {
        setIsLoading(false);
      }
    }, [organizationId, token]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const metrics = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter(
        (report) =>
          report.status === 'RECEIVED' ||
          report.status === 'UNDER_REVIEW',
      ).length,
      assigned: reports.filter(
        (report) =>
          report.status === 'ASSIGNED',
      ).length,
      inProgress: reports.filter(
        (report) =>
          report.status === 'IN_PROGRESS',
      ).length,
      resolved: reports.filter(
        (report) =>
          report.status === 'RESOLVED',
      ).length,
    }),
    [reports],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#17365D"
          />
          <Text style={styles.loadingText}>
            Cargando gestión...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError || !context) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>
            No pudimos abrir la gestión
          </Text>

          <Text style={styles.errorText}>
            {loadError}
          </Text>

          <Pressable
            onPress={() => {
              void loadDashboard();
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerContent}>
            <Text style={styles.brand}>
              CIVIA GESTIÓN
            </Text>

            <Text style={styles.title}>
              {context.organization.name}
            </Text>

            <Text style={styles.subtitle}>
              Administra los reportes y el seguimiento
              operativo de esta organización.
            </Text>
          </View>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {roleLabels[context.accessRole]}
            </Text>
          </View>
        </View>
        {context.accessRole !== 'STAFF' ? (
          <Pressable
            onPress={() =>
              router.push(
                `/organizations/${organizationId}/admin/manage` as never
              )
            }
            style={styles.managementButton}
          >
            <Text style={styles.managementButtonTitle}>
              Administrar estructura
            </Text>

            <Text style={styles.managementButtonText}>
              Departamentos, categorías, personal e invitaciones
            </Text>
          </Pressable>
        ) : null}

        <Text style={styles.sectionTitle}>
          Resumen
        </Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {metrics.total}
            </Text>
            <Text style={styles.metricLabel}>
              Total
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {metrics.pending}
            </Text>
            <Text style={styles.metricLabel}>
              Por revisar
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {metrics.assigned}
            </Text>
            <Text style={styles.metricLabel}>
              Asignados
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {metrics.inProgress}
            </Text>
            <Text style={styles.metricLabel}>
              En proceso
            </Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {metrics.resolved}
            </Text>
            <Text style={styles.metricLabel}>
              Resueltos
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Bandeja de reportes
          </Text>

          <Text style={styles.sectionCount}>
            {reports.length}
          </Text>
        </View>

        {reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Sin reportes
            </Text>

            <Text style={styles.emptyText}>
              Los reportes enviados a la organización
              aparecerán aquí.
            </Text>
          </View>
        ) : (
          <View style={styles.reportList}>
            {reports.map((report) => (
              <Pressable
                key={report.id}
                onPress={() =>
                  router.push({
                    pathname:
                      '/organizations/[organizationId]/admin/reports/[reportId]',
                    params: {
                      organizationId,
                      reportId: report.id,
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.reportCard,
                  pressed
                    ? styles.cardPressed
                    : undefined,
                ]}
              >
                <View style={styles.reportTopRow}>
                  <View style={styles.reportMain}>
                    <Text style={styles.reportCategory}>
                      {report.category.name}
                    </Text>

                    <Text
                      numberOfLines={2}
                      style={styles.reportDescription}
                    >
                      {report.description}
                    </Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      {statusLabels[report.status]}
                    </Text>
                  </View>
                </View>

                <Text style={styles.metaText}>
                  Reportó: {report.reporter.fullName}
                </Text>

                <Text style={styles.metaText}>
                  Ubicación: {report.location}
                </Text>

                <Text style={styles.metaText}>
                  Departamento:{' '}
                  {report.department?.name ??
                    'Sin asignar'}
                </Text>

                <Text style={styles.metaText}>
                  Responsable:{' '}
                  {report.assignedTo?.fullName ??
                    'Sin asignar'}
                </Text>

                {report._count.attachments > 0 ? (
                  <Text style={styles.attachmentText}>
                    {report._count.attachments}{' '}
                    evidencia
                    {report._count.attachments === 1
                      ? ''
                      : 's'}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}

        <Pressable
          onPress={() => {
            if (
              context.accessRole ===
              'GLOBAL_ADMIN'
            ) {
              router.replace(
                '/global-admin' as never
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
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>
            {context.accessRole ===
            'GLOBAL_ADMIN'
              ? 'Volver al panel global'
              : 'Volver a la organización'}
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
    textAlign: 'center',
    color: '#1F2937',
  },
  errorText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#667085',
  },
  headerRow: {
    gap: 14,
  },
  headerContent: {
    flex: 1,
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
    lineHeight: 36,
    fontWeight: '800',
    color: '#17365D',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#667085',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#E5F4F6',
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#216B75',
  },
  managementButton: {
    marginTop: 22,
    padding: 17,
    borderRadius: 14,
    backgroundColor: '#17365D',
  },
  managementButtonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  managementButtonText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#D6E4F0',
  },
  sectionTitle: {
    marginTop: 28,
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  metricsGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    minWidth: '30%',
    flexGrow: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#17365D',
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 13,
    color: '#667085',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionCount: {
    marginTop: 28,
    minWidth: 30,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 16,
    textAlign: 'center',
    fontWeight: '700',
    color: '#17365D',
    backgroundColor: '#EAF1F8',
  },
  reportList: {
    marginTop: 14,
    gap: 12,
  },
  reportCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  cardPressed: {
    opacity: 0.82,
  },
  reportTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reportMain: {
    flex: 1,
  },
  reportCategory: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  reportDescription: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: '#475467',
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#EEF4FA',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2F75B5',
  },
  metaText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: '#667085',
  },
  attachmentText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#2F8F9D',
  },
  emptyCard: {
    marginTop: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: '#667085',
  },
  primaryButton: {
    width: '100%',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    borderRadius: 12,
    backgroundColor: '#17365D',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
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