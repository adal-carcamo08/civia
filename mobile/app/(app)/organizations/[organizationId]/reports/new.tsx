import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAuth } from '../../../../../contexts/auth-context';
import {
  ApiError,
  apiRequest,
  buildApiUrl,
} from '../../../../../services/api';

type Category = {
  id: string;
  name: string;
  description: string | null;
  department: {
    id: string;
    name: string;
  } | null;
};

type CreatedReport = {
  id: string;
  code: string;
  status: 'RECEIVED';
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

export default function NewReportScreen() {
  const params = useLocalSearchParams<{
    organizationId?: string | string[];
  }>();

  const { token } = useAuth();

  const organizationId = Array.isArray(params.organizationId)
    ? params.organizationId[0]
    : params.organizationId;

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] =
    useState(true);
  const [categoryLoadError, setCategoryLoadError] =
    useState('');
  const [categoryModalVisible, setCategoryModalVisible] =
    useState(false);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [otherProblemType, setOtherProblemType] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [otherProblemTypeError, setOtherProblemTypeError] =
    useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [photoError, setPhotoError] = useState('');

  const loadCategories = useCallback(async () => {
    if (!token || !organizationId) {
      setCategories([]);
      setIsLoadingCategories(false);
      return;
    }

    setIsLoadingCategories(true);
    setCategoryLoadError('');

    try {
      const response = await apiRequest<Category[]>(
        `/organizations/${organizationId}/categories`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setCategories(response);
    } catch {
      setCategoryLoadError(
        'No pudimos cargar las categorías de esta organización.'
      );
    } finally {
      setIsLoadingCategories(false);
    }
  }, [organizationId, token]);

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
    }, [loadCategories])
  );

  const selectPhoto = async () => {
    setPhotoError('');

    if (photoUris.length >= 5) {
      setPhotoError(
        'Puedes adjuntar un máximo de 5 fotografías.'
      );
      return;
    }

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
      const asset = result.assets[0];

      setPhotoUris((current) => {
        if (current.length >= 5) {
          return current;
        }

        return [...current, asset.uri];
      });
    }
  };

  const validateForm = async () => {
    if (isSubmitting) {
      return;
    }
    let isValid = true;

    setCategoryError('');
    setOtherProblemTypeError('');
    setDescriptionError('');
    setLocationError('');
    setSubmitError('');

    if (!selectedCategory) {
      setCategoryError('Selecciona una categoría.');
      isValid = false;
    }

    if (
      selectedCategory?.name === 'Otro / No estoy seguro' &&
      !otherProblemType.trim()
    ) {
      setOtherProblemTypeError(
        'Indica brevemente qué tipo de problema deseas reportar.'
      );
      isValid = false;
    } else if (
      selectedCategory?.name === 'Otro / No estoy seguro' &&
      otherProblemType.trim().length < 3
    ) {
      setOtherProblemTypeError(
        'Describe un poco mejor el tipo de problema.'
      );
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

    if (!token || !organizationId || !selectedCategory) {
      setSubmitError(
        'No pudimos preparar el reporte. Regresa e inténtalo nuevamente.'
      );
      return;
    }

    const normalizedDescription = description.trim();
    const normalizedLocation = location.trim();

    const finalDescription =
      selectedCategory.name === 'Otro / No estoy seguro'
        ? `Tipo de problema: ${otherProblemType.trim()}

${normalizedDescription}`
        : normalizedDescription;

    setIsSubmitting(true);

    try {
      const createdReport = await apiRequest<CreatedReport>(
        '/reports',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            organizationId,
            categoryId: selectedCategory.id,
            description: finalDescription,
            location: normalizedLocation,
          }),
        }
      );

      if (photoUris.length > 0) {
        let failedUploads = 0;
        let lastUploadError = '';

        for (const photoUri of photoUris) {
          try {
            const file = new File(photoUri);
            const formData = new FormData();

            formData.append('file', file);

            const uploadResponse = await expoFetch(
              buildApiUrl(
                `/reports/${createdReport.id}/attachments`
              ),
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              }
            );

            if (!uploadResponse.ok) {
              const responseBody =
                await uploadResponse.text();

              throw new Error(
                `Servidor (${uploadResponse.status}): ${
                  responseBody ||
                  'No fue posible adjuntar la fotografía.'
                }`
              );
            }
          } catch (uploadError) {
            failedUploads += 1;

            lastUploadError =
              uploadError instanceof Error
                ? uploadError.message
                : 'Error desconocido durante la subida.';
          }
        }

        if (failedUploads > 0) {
          Alert.alert(
            'Reporte creado',
            `El reporte fue enviado correctamente, pero ${failedUploads} de ${photoUris.length} fotografías no pudieron adjuntarse.

${lastUploadError}`
          );
        }
      }

      router.replace({
        pathname: '/reports/[reportId]',
        params: {
          reportId: createdReport.id,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError(
          'No pudimos enviar el reporte. Verifica tu conexión e inténtalo nuevamente.'
        );
      }
    } finally {
      setIsSubmitting(false);
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
                <Text style={styles.label}>
                  Fotografías
                </Text>

                {photoUris.length === 0 ? (
                  <Pressable
                    onPress={selectPhoto}
                    style={({ pressed }) => [
                      styles.photoSelector,
                      pressed
                        ? styles.buttonPressed
                        : undefined,
                    ]}
                  >
                    <Text style={styles.photoSelectorTitle}>
                      Agregar fotografía
                    </Text>

                    <Text style={styles.photoSelectorText}>
                      Puedes adjuntar hasta 5 imágenes
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.photoGrid}>
                    {photoUris.map((photoUri, index) => (
                      <View
                        key={`${photoUri}-${index}`}
                        style={styles.photoCard}
                      >
                        <Image
                          source={{ uri: photoUri }}
                          style={styles.photoCardImage}
                        />

                        <Pressable
                          onPress={() => {
                            setPhotoUris((current) =>
                              current.filter(
                                (_, photoIndex) =>
                                  photoIndex !== index
                              )
                            );
                            setPhotoError('');
                          }}
                          style={({ pressed }) => [
                            styles.photoRemoveButton,
                            pressed
                              ? styles.buttonPressed
                              : undefined,
                          ]}
                        >
                          <Text
                            style={styles.photoRemoveText}
                          >
                            Quitar
                          </Text>
                        </Pressable>
                      </View>
                    ))}

                    {photoUris.length < 5 ? (
                      <Pressable
                        onPress={selectPhoto}
                        style={({ pressed }) => [
                          styles.photoAddCard,
                          pressed
                            ? styles.buttonPressed
                            : undefined,
                        ]}
                      >
                        <Text
                          style={styles.photoAddSymbol}
                        >
                          +
                        </Text>

                        <Text style={styles.photoAddText}>
                          Agregar otra
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}

                <Text style={styles.photoCounter}>
                  {photoUris.length} de 5 fotografías
                </Text>

                <Text style={styles.helperText}>
                  Las fotografías son opcionales.
                </Text>

                {photoError ? (
                  <Text style={styles.errorText}>
                    {photoError}
                  </Text>
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
                    {selectedCategory?.name ?? 'Seleccionar categoría'}
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

              {selectedCategory?.name ===
              'Otro / No estoy seguro' ? (
                <View style={styles.field}>
                  <Text style={styles.label}>
                    ¿Qué tipo de problema es?
                  </Text>

                  <TextInput
                    value={otherProblemType}
                    onChangeText={(value) => {
                      setOtherProblemType(value);

                      if (otherProblemTypeError) {
                        setOtherProblemTypeError('');
                      }
                    }}
                    placeholder="Ej. Árbol en riesgo de caer"
                    placeholderTextColor="#98A2B3"
                    autoCapitalize="sentences"
                    maxLength={100}
                    style={[
                      styles.input,
                      otherProblemTypeError
                        ? styles.inputError
                        : undefined,
                    ]}
                  />

                  {otherProblemTypeError ? (
                    <Text style={styles.errorText}>
                      {otherProblemTypeError}
                    </Text>
                  ) : (
                    <Text style={styles.helperText}>
                      Describe brevemente el tipo de incidencia.
                    </Text>
                  )}
                </View>
              ) : null}

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

              {submitError ? (
                <Text style={styles.submitError}>
                  {submitError}
                </Text>
              ) : null}

              <Pressable
                onPress={() => {
                  void validateForm();
                }}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && !isSubmitting
                    ? styles.buttonPressed
                    : undefined,
                  isSubmitting
                    ? styles.primaryButtonDisabled
                    : undefined,
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Enviar reporte
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!organizationId) {
                    router.replace('/organizations');
                    return;
                  }

                  router.replace({
                    pathname: '/organizations/[organizationId]',
                    params: { organizationId },
                  });
                }}
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

                {isLoadingCategories ? (
                  <View style={styles.modalState}>
                    <ActivityIndicator
                      size="small"
                      color="#17365D"
                    />

                    <Text style={styles.modalHelperText}>
                      Cargando categorías...
                    </Text>
                  </View>
                ) : categoryLoadError ? (
                  <View style={styles.modalState}>
                    <Text style={styles.modalEmptyText}>
                      No pudimos cargar las categorías.
                    </Text>

                    <Text style={styles.modalHelperText}>
                      {categoryLoadError}
                    </Text>

                    <Pressable
                      onPress={() => {
                        void loadCategories();
                      }}
                      style={({ pressed }) => [
                        styles.retryButton,
                        pressed
                          ? styles.buttonPressed
                          : undefined,
                      ]}
                    >
                      <Text style={styles.retryButtonText}>
                        Intentar nuevamente
                      </Text>
                    </Pressable>
                  </View>
                ) : categories.length === 0 ? (
                  <View style={styles.modalState}>
                    <Text style={styles.modalEmptyText}>
                      No hay categorías disponibles.
                    </Text>

                    <Text style={styles.modalHelperText}>
                      Esta organización aún no tiene categorías activas.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.categoryOptions}>
                    {categories.map((category) => (
                      <Pressable
                        key={category.id}
                        onPress={() => {
                          setSelectedCategory(category);
                          setCategoryError('');
                          setOtherProblemTypeError('');

                          if (
                            category.name !==
                            'Otro / No estoy seguro'
                          ) {
                            setOtherProblemType('');
                          }

                          setCategoryModalVisible(false);
                        }}
                        style={({ pressed }) => [
                          styles.categoryOption,
                          selectedCategory?.id === category.id
                            ? styles.categoryOptionSelected
                            : undefined,
                          pressed
                            ? styles.buttonPressed
                            : undefined,
                        ]}
                      >
                        <Text
                          style={styles.categoryOptionTitle}
                        >
                          {category.name}
                        </Text>

                        {category.department ? (
                          <Text
                            style={styles.categoryOptionDepartment}
                          >
                            {category.department.name}
                          </Text>
                        ) : null}

                        {category.description ? (
                          <Text
                            style={styles.categoryOptionDescription}
                            numberOfLines={2}
                          >
                            {category.description}
                          </Text>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                )}

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

  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoCard: {
    width: '48%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  photoCardImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#E8EFF7',
  },
  photoRemoveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderTopWidth: 1,
    borderTopColor: '#EAECF0',
  },
  photoRemoveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D92D20',
  },
  photoAddCard: {
    width: '48%',
    minHeight: 169,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#98A2B3',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  photoAddSymbol: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '400',
    color: '#17365D',
  },
  photoAddText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    color: '#17365D',
  },
  photoCounter: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667085',
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
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  submitError: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#D92D20',
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
  modalState: {
    marginTop: 20,
    alignItems: 'center',
  },
  categoryOptions: {
    gap: 10,
    marginTop: 20,
  },
  categoryOption: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  categoryOptionSelected: {
    borderColor: '#2F75B5',
    backgroundColor: '#F2F7FC',
  },
  categoryOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  categoryOptionDepartment: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#2F75B5',
  },
  categoryOptionDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: '#667085',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#17365D',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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