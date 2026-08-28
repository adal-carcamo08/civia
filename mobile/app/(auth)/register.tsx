import { router } from 'expo-router';
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

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateForm = () => {
    let isValid = true;

    setFullNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim();

    if (!normalizedName) {
      setFullNameError('Ingresa tu nombre completo.');
      isValid = false;
    } else if (normalizedName.length < 3) {
      setFullNameError('Ingresa un nombre válido.');
      isValid = false;
    }

    if (!normalizedEmail) {
      setEmailError('Ingresa tu correo electrónico.');
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setEmailError('Ingresa un correo electrónico válido.');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Ingresa una contraseña.');
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.');
      isValid = false;
    } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setPasswordError(
        'La contraseña debe incluir al menos una letra y un número.'
      );
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Confirma tu contraseña.');
      isValid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Las contraseñas no coinciden.');
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    // El registro real se conectará posteriormente con el backend.
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

            <Text style={styles.title}>Crear cuenta</Text>

            <Text style={styles.subtitle}>
              Regístrate para acceder a organizaciones y dar seguimiento a tus
              reportes.
            </Text>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Nombre completo</Text>

                <TextInput
                  value={fullName}
                  onChangeText={(value) => {
                    setFullName(value);

                    if (fullNameError) {
                      setFullNameError('');
                    }
                  }}
                  placeholder="Nombre y apellido"
                  placeholderTextColor="#98A2B3"
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  style={[
                    styles.input,
                    fullNameError ? styles.inputError : undefined,
                  ]}
                />

                {fullNameError ? (
                  <Text style={styles.errorText}>{fullNameError}</Text>
                ) : null}
              </View>

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
                    placeholder="Mínimo 8 caracteres"
                    placeholderTextColor="#98A2B3"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
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

              <View style={styles.field}>
                <Text style={styles.label}>Confirmar contraseña</Text>

                <View
                  style={[
                    styles.passwordContainer,
                    confirmPasswordError ? styles.inputError : undefined,
                  ]}
                >
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);

                      if (confirmPasswordError) {
                        setConfirmPasswordError('');
                      }
                    }}
                    placeholder="Repite tu contraseña"
                    placeholderTextColor="#98A2B3"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={validateForm}
                    style={styles.passwordInput}
                  />

                  <Pressable
                    onPress={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    hitSlop={10}
                  >
                    <Text style={styles.passwordToggle}>
                      {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                    </Text>
                  </Pressable>
                </View>

                {confirmPasswordError ? (
                  <Text style={styles.errorText}>{confirmPasswordError}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={validateForm}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.primaryButtonPressed : undefined,
                ]}
              >
                <Text style={styles.primaryButtonText}>Crear cuenta</Text>
              </Pressable>
            </View>

            <View style={styles.loginRow}>
              <Text style={styles.helperText}>¿Ya tienes una cuenta? </Text>

              <Pressable onPress={() => router.replace('/login')}>
                <Text style={styles.loginLink}>Iniciar sesión</Text>
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
    justifyContent: 'center',
  },
  content: {
    width: '100%',
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
    marginTop: 30,
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
  loginRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
  },
  loginLink: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#2F75B5',
  },
});
