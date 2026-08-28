import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InvitationScreen() {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const validateInvitation = () => {
    const normalizedCode = code.trim();

    setCodeError('');

    if (!normalizedCode) {
      setCodeError('Ingresa tu código de invitación.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.brand}>CIVIA</Text>

          <Text style={styles.title}>Acceder con invitación</Text>

          <Text style={styles.subtitle}>
            Ingresa el código que recibiste para solicitar acceso a una
            organización privada.
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Código de invitación</Text>

              <TextInput
                value={code}
                onChangeText={(value) => {
                  setCode(value);

                  if (codeError) {
                    setCodeError('');
                  }
                }}
                placeholder="Ingresa tu código"
                placeholderTextColor="#98A2B3"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={validateInvitation}
                style={[
                  styles.input,
                  codeError ? styles.inputError : undefined,
                ]}
              />

              {codeError ? (
                <Text style={styles.errorText}>{codeError}</Text>
              ) : null}
            </View>

            <Pressable
              onPress={validateInvitation}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed ? styles.buttonPressed : undefined,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                Validar invitación
              </Text>
            </Pressable>

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
  container: {
    flex: 1,
    justifyContent: 'center',
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
    marginTop: 36,
    gap: 18,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#344054',
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
    fontSize: 13,
    lineHeight: 18,
    color: '#D92D20',
  },
  primaryButton: {
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