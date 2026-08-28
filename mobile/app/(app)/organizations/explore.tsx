import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreOrganizationsScreen() {
  const [search, setSearch] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>CIVIA</Text>

        <Text style={styles.title}>Explorar organizaciones</Text>

        <Text style={styles.subtitle}>
          Busca organizaciones públicas disponibles en CIVIA.
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar organización"
          placeholderTextColor="#98A2B3"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />

        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Organizaciones públicas</Text>

          <Text style={styles.emptyText}>
            Las organizaciones disponibles aparecerán aquí cuando estén
            conectadas con el backend.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : undefined,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Volver</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FB',
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
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