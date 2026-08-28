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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateForm = () => {
    let isValid = true;

    setEmailError('');
    setPasswordError('');

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setEmailError('Ingresa tu correo electrónico.');
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setEmailError('Ingresa un correo electrónico válido.');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Ingresa tu contraseña.');
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.');
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    // La autenticación real se conectará posteriormente con el backend.
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
          <View style={styles.content}>
            <Text style={styles.brand}>CIVIA</Text>

            <Text style={styles.title}>Iniciar sesión</Text>

            <Text style={styles.subtitle}>
              Accede a tu cuenta para gestionar y dar seguimiento a tus reportes.
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Correo electrónico</Text>

                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);

                    if (emailError) {
                      setEmailError('');
                    }
                  }}
                  placeholder="nombre@correo.com"
                  placeholderTextColor="#98A2B3"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  style={[
                    styles.input,
                    emailError ? styles.inputError : undefined,
                  ]}
                />

                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Contraseña</Text>

                <View
                  style={[
                    styles.passwordContainer,
                    passwordError ? styles.inputError : undefined,
                  ]}
                >
                  <TextInput
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);

                      if (passwordError) {
                        setPasswordError('');
                      }
                    }}
                    placeholder="Ingresa tu contraseña"
                    placeholderTextColor="#98A2B3"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="done"
                    onSubmitEditing={validateForm}
                    style={styles.passwordInput}
                  />

                  <Pressable
                    onPress={() => setShowPassword((current) => !current)}
                    hitSlop={10}
                  >
                    <Text style={styles.passwordToggle}>
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </Text>
                  </Pressable>
                </View>

                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={validateForm}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.primaryButtonPressed : undefined,
                ]}
              >
                <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
              </Pressable>
            </View>

            <Text style={styles.helperText}>
              ¿Aún no tienes una cuenta? El registro estará disponible en el
              siguiente paso.
            </Text>
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
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  brand: {
    marginBottom: 28,
    fontSize: 22,
    fontWeight: '700',
    color: '#17365D',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 34,
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
  passwordContainer: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  passwordToggle: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#2F75B5',
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
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: '#17365D',
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helperText: {
    marginTop: 28,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
  },
});