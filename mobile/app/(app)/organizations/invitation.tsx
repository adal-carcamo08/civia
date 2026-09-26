import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/auth-context';
import {
  ApiError,
  apiRequest,
} from '../../../services/api';

export default function InvitationScreen() {
  const { token } = useAuth();

  const [code, setCode] = useState('');
  const [codeError, setCodeError] =
    useState('');
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const validateInvitation = async () => {
    if (isSubmitting) {
      return;
    }

    const normalizedCode =
      code.trim();

    setCodeError('');

    if (!normalizedCode) {
      setCodeError(
        'Ingresa tu código de invitación.'
      );
      return;
    }

    if (!token) {
      setCodeError(
        'Tu sesión no está disponible. Inicia sesión nuevamente.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest(
        '/invitations/accept',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            token: normalizedCode,
          }),
        }
      );

      Alert.alert(
        'Invitación aceptada',
        'Ya tienes acceso a la organización.',
        [
          {
            text: 'Ver mis organizaciones',
            onPress: () => {
              router.replace(
                '/organizations'
              );
            },
          },
        ]
      );
    } catch (error) {
      setCodeError(
        error instanceof ApiError
          ? error.message
          : 'No pudimos validar la invitación. Verifica tu conexión e inténtalo nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.container}>
          <Text style={styles.brand}>
            CIVIA
          </Text>

          <Text style={styles.title}>
            Acceder con invitación
          </Text>

          <Text style={styles.subtitle}>
            Ingresa el código que recibiste para acceder a una organización privada.
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Código de invitación
              </Text>

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
                editable={!isSubmitting}
                onSubmitEditing={() => {
                  void validateInvitation();
                }}
                style={[
                  styles.input,
                  codeError
                    ? styles.inputError
                    : undefined,
                ]}
              />

              {codeError ? (
                <Text
                  style={
                    styles.errorText
                  }
                >
                  {codeError}
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => {
                void validateInvitation();
              }}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed &&
                !isSubmitting
                  ? styles.buttonPressed
                  : undefined,
                isSubmitting
                  ? styles.disabledButton
                  : undefined,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Validar invitación
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() =>
                router.back()
              }
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed &&
                !isSubmitting
                  ? styles.buttonPressed
                  : undefined,
              ]}
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Volver
              </Text>
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
  disabledButton: {
    opacity: 0.6,
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