import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

type ReportStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'NOT_APPLICABLE'
  | 'REJECTED';

type ReportSummary = {
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
  attachments: Array<{
    id: string;
    url: string;
    fileName: string;
    mimeType: string;
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
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function MyReportsScreen() {
  const { token } = useAuth();

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadReports = useCallback(async () => {
    if (!token) {
      setReports([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await apiRequest<ReportSummary[]>(
        '/reports/mine',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setReports(response);
    } catch {
      setErrorMessage(
        'No pudimos cargar tus reportes. Inténtalo nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadReports();
    }, [loadReports])
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

            <Text style={styles.title}>Mis reportes</Text>

            <Text style={styles.subtitle}>
              Consulta el estado y seguimiento de los reportes que has enviado.
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator
                size="large"
                color="#17365D"
              />

              <Text style={styles.stateText}>
                Cargando tus reportes...
              </Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.centerState}>
              <Text style={styles.errorTitle}>
                No pudimos cargar tus reportes
              </Text>

              <Text style={styles.stateText}>
                {errorMessage}
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
                <Text style={styles.primaryButtonText}>
                  Intentar nuevamente
                </Text>
              </Pressable>
            </View>
          ) : reports.length === 0 ? (
            <View style={styles.centerState}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>!</Text>
              </View>

              <Text style={styles.emptyTitle}>
                Aún no tienes reportes
              </Text>

              <Text style={styles.stateText}>
                Cuando envíes un reporte podrás consultar aquí su estado y avance.
              </Text>

              <Pressable
                onPress={() =>
                  router.replace('/organizations')
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed
                    ? styles.buttonPressed
                    : undefined,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  Ir a mis organizaciones
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.reportsList}>
              {reports.map((report) => (
                <Pressable
                  key={report.id}
                  onPress={() =>
                    router.push({
                      pathname: '/reports/[reportId]',
                      params: {
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
                      <Text
                        style={styles.organizationName}
                        numberOfLines={1}
                      >
                        {report.organization.name}
                      </Text>

                      <Text style={styles.reportCode}>
                        {report.code}
                      </Text>
                    </View>

                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {statusLabels[report.status]}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={styles.description}
                    numberOfLines={3}
                  >
                    {report.description}
                  </Text>

                  <View style={styles.metadata}>
                    <Text style={styles.metadataText}>
                      {report.category?.name ??
                        'Sin categoría'}
                    </Text>

                    <Text style={styles.metadataDot}>
                      •
                    </Text>

                    <Text style={styles.metadataText}>
                      {formatDate(report.createdAt)}
                    </Text>
                  </View>

                  {report.location ? (
                    <Text
                      style={styles.location}
                      numberOfLines={1}
                    >
                      {report.location}
                    </Text>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={styles.detailsLink}>
                      Ver detalle
                    </Text>

                    {report.attachments.length > 0 ? (
                      <Text style={styles.attachmentText}>
                        {report.attachments.length}{' '}
                        {report.attachments.length === 1
                          ? 'evidencia'
                          : 'evidencias'}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <AppBottomNav active="reports" />
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
    paddingTop: 32,
    paddingBottom: 28,
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
  centerState: {
    flex: 1,
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
  reportsList: {
    gap: 14,
    marginTop: 28,
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
  organizationName: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  reportCode: {
    marginTop: 4,
    fontSize: 12,
    color: '#667085',
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
  description: {
    marginTop: 15,
    fontSize: 15,
    lineHeight: 22,
    color: '#344054',
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 14,
  },
  metadataText: {
    fontSize: 13,
    color: '#667085',
  },
  metadataDot: {
    marginHorizontal: 7,
    fontSize: 13,
    color: '#98A2B3',
  },
  location: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#667085',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
  },
  detailsLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2F75B5',
  },
  attachmentText: {
    fontSize: 12,
    color: '#667085',
  },
  buttonPressed: {
    opacity: 0.88,
  },
});