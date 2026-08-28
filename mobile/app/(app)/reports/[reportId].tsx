import { router, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReportDetailScreen() {
  const { reportId } = useLocalSearchParams<{
    reportId: string;
  }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Text style={styles.brand}>CIVIA</Text>

          <Text style={styles.title}>Detalle del reporte</Text>

          <Text style={styles.reportCode}>Reporte #{reportId}</Text>

          <View style={styles.statusCard}>
            <Text style={styles.sectionLabel}>Estado actual</Text>
            <Text style={styles.pendingText}>
              Pendiente de información del sistema
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del reporte</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Organización</Text>
                <Text style={styles.infoValue}>
                  Se mostrará al conectar la API
                </Text>
              </View>

              <View style={styles.separator} />

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Categoría</Text>
                <Text style={styles.infoValue}>
                  Se mostrará al conectar la API
                </Text>
              </View>

              <View style={styles.separator} />

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Descripción</Text>
                <Text style={styles.infoValue}>
                  Se mostrará al conectar la API
                </Text>
              </View>

              <View style={styles.separator} />

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Ubicación</Text>
                <Text style={styles.infoValue}>
                  Se mostrará al conectar la API
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seguimiento</Text>

            <View style={styles.timelineCard}>
              <View style={styles.timelineIcon}>
                <View style={styles.timelineDot} />
              </View>

              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>
                  Historial del reporte
                </Text>

                <Text style={styles.timelineText}>
                  Los cambios de estado y asignaciones aparecerán aquí.
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => router.replace('/reports')}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.buttonPressed : undefined,
            ]}
          >
            <Text style={styles.backButtonText}>Volver a mis reportes</Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
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
    fontWeight: '700',
    color: '#1F2937',
  },
  reportCode: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#667085',
  },
  statusCard: {
    marginTop: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667085',
  },
  pendingText: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: '#17365D',
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
    borderRadius: 14,
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
  timelineCard: {
    flexDirection: 'row',
    padding: 18,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  timelineIcon: {
    width: 28,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2F8F9D',
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  timelineText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
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
  buttonPressed: {
    opacity: 0.88,
  },
});