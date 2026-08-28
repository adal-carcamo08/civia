import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
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
  const [selectedCategory] = useState('');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [photoError, setPhotoError] = useState('');

  const selectPhoto = async () => {
    setPhotoError('');

    if (Platform.OS !== 'web') {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setPhotoError(
          'CIVIA necesita permiso para acceder a tus fotografías.'
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const validateForm = () => {
    let isValid = true;

    setCategoryError('');
    setDescriptionError('');
    setLocationError('');

    if (!selectedCategory) {
      setCategoryError('Selecciona una categoría.');
      isValid = false;
    }

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
                <Text style={styles.label}>Fotografía</Text>

                {photoUri ? (
                  <View style={styles.photoContainer}>
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.photoPreview}
                    />

                    <View style={styles.photoActions}>
                      <Pressable
                        onPress={selectPhoto}
                        style={({ pressed }) => [
                          styles.photoButton,
                          pressed ? styles.buttonPressed : undefined,
                        ]}
                      >
                        <Text style={styles.photoButtonText}>Cambiar</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setPhotoUri(null)}
                        style={({ pressed }) => [
                          styles.removePhotoButton,
                          pressed ? styles.buttonPressed : undefined,
                        ]}
                      >
                        <Text style={styles.removePhotoText}>Quitar</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={selectPhoto}
                    style={({ pressed }) => [
                      styles.photoSelector,
                      pressed ? styles.buttonPressed : undefined,
                    ]}
                  >
                    <Text style={styles.photoSelectorTitle}>
                      Agregar fotografía
                    </Text>
                    <Text style={styles.photoSelectorText}>
                      Selecciona una imagen de tu dispositivo
                    </Text>
                  </Pressable>
                )}

                <Text style={styles.helperText}>
                  La fotografía es opcional.
                </Text>

                {photoError ? (
                  <Text style={styles.errorText}>{photoError}</Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Categoría</Text>

                <Pressable
                  onPress={() => setCategoryModalVisible(true)}
                  style={[
                    styles.categoryField,
                    categoryError ? styles.inputError : undefined,
                  ]}
                >
                  <Text
                    style={
                      selectedCategory
                        ? styles.categorySelectedText
                        : styles.categoryText
                    }
                  >
                    {selectedCategory || 'Seleccionar categoría'}
                  </Text>

                  <View style={styles.categoryArrow} />
                </Pressable>

                {categoryError ? (
                  <Text style={styles.errorText}>{categoryError}</Text>
                ) : (
                  <Text style={styles.helperText}>
                    Las categorías disponibles dependerán de la organización.
                  </Text>
                )}
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

                  <Text style={styles.counter}>{description.length}/500</Text>
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

          <Modal
            visible={categoryModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setCategoryModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Seleccionar categoría</Text>

                <Text style={styles.modalEmptyText}>
                  No hay categorías disponibles.
                </Text>

                <Text style={styles.modalHelperText}>
                  Las opciones aparecerán cuando se carguen desde la organización.
                </Text>

                <Pressable
                  onPress={() => setCategoryModalVisible(false)}
                  style={({ pressed }) => [
                    styles.modalButton,
                    pressed ? styles.buttonPressed : undefined,
                  ]}
                >
                  <Text style={styles.modalButtonText}>Cerrar</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
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
  photoSelector: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  photoSelectorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17365D',
  },
  photoSelectorText: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
    color: '#667085',
  },
  photoContainer: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  photoPreview: {
    width: '100%',
    height: 210,
    resizeMode: 'cover',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  photoButton: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#17365D',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  removePhotoButton: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  removePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344054',
  },

  categoryField: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  categorySelectedText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  categoryArrow: {
    width: 9,
    height: 9,
    marginLeft: 12,
    marginTop: -4,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#667085',
    transform: [{ rotate: '45deg' }],
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(16, 24, 40, 0.35)',
  },
  modalCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalEmptyText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    color: '#344054',
  },
  modalHelperText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#667085',
  },
  modalButton: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderRadius: 10,
    backgroundColor: '#17365D',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.88,
  },
});