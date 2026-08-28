import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NewReportScreen() {
  const { organizationId } = useLocalSearchParams<{
    organizationId: string;
  }>();

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [locationError, setLocationError] = useState('');

  const validateForm = () => {
    let isValid = true;

    setDescriptionError('');
    setLocationError('');

    if (!description.trim()) {
      setDescriptionError('Describe el problema que deseas reportar.');
      isValid = false;
    } else if (description.trim().length < 10) {
      setDescriptionError('Agrega un poco más de detalle al reporte.');
      isValid = false;
    }

    if (!location.trim()) {
      setLocationError('Ingresa una ubicación o referencia.');
      isValid = false;
    }

    if (!isValid) {
      return;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Text style={styles.brand}>CIVIA</Text>

            <Text style={styles.title}>Nuevo reporte</Text>

            <Text style={styles.subtitle}>
              Proporciona la información necesaria para reportar una incidencia.
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Categoría</Text>

                <View style={styles.categoryField}>
                  <Text style={styles.categoryText}>
                    Seleccionar categoría
                  </Text>
                </View>

                <Text style={styles.helperText}>
                  Las categorías disponibles dependerán de la organización.
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Descripción</Text>

                <TextInput
                  value={description}
                  onChangeText={(value) => {
                    setDescription(value);

                    if (descriptionError) {
                      setDescriptionError('');
                    }
                  }}
                  placeholder="Describe lo ocurrido"
                  placeholderTextColor="#98A2B3"
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  style={[
                    styles.textArea,
                    descriptionError ? styles.inputError : undefined,
                  ]}
                />

                <View style={styles.descriptionFooter}>
                  {descriptionError ? (
                    <Text style={styles.errorText}>{descriptionError}</Text>
                  ) : (
                    <View />
                  )}

                  <Text style={styles.counter}>
                    {description.length}/500
                  </Text>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Ubicación o referencia</Text>

                <TextInput
                  value={location}
                  onChangeText={(value) => {
                    setLocation(value);

                    if (locationError) {
                      setLocationError('');
                    }
                  }}
                  placeholder="Ej. Edificio B, segundo nivel"
                  placeholderTextColor="#98A2B3"
                  autoCapitalize="sentences"
                  maxLength={150}
                  style={[
                    styles.input,
                    locationError ? styles.inputError : undefined,
                  ]}
                />

                {locationError ? (
                  <Text style={styles.errorText}>{locationError}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={validateForm}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.buttonPressed : undefined,
                ]}
              >
                <Text style={styles.primaryButtonText}>Continuar</Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.replace({
                    pathname: '/organizations/[organizationId]',
                    params: { organizationId },
                  })
                }
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed ? styles.buttonPressed : undefined,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FB',
  },
  keyboardView: {
    flex: 1,
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
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: '#667085',
  },
  form: {
    marginTop: 32,
    gap: 22,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#344054',
  },
  categoryField: {
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  categoryText: {
    fontSize: 16,
    color: '#98A2B3',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#667085',
  },
  textArea: {
    minHeight: 130,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    color: '#1F2937',
  },
  descriptionFooter: {
    minHeight: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  counter: {
    marginLeft: 'auto',
    fontSize: 13,
    color: '#98A2B3',
  },
  input: {
    height: 54,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#1F2937',
  },
  inputError: {
    borderColor: '#D92D20',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#D92D20',
  },
  primaryButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: '#17365D',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
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