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

type AiSuggestion = {
  intent: string;
  domain: string;
  problemType: string;
  problemLabel: string;
  suggestedCategory: {
    id: string;
    name: string;
  };
  suggestedDepartment: {
    id: string;
    name: string;
  } | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  detectionConfidence: number;
  categoryMatchConfidence: number;
  confidence: number;
  model: string;
  classificationMode: 'online_text' | 'online_text_image';
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

type AiImageEvidence = {
  mime_type: 'image/jpeg' | 'image/png' | 'image/webp';
  data_base64: string;
};

function getMimeTypeFromFile(
  file: File,
  uri: string
): 'image/jpeg' | 'image/png' | 'image/webp' {
  if (file.type === 'image/png') {
    return 'image/png';
  }

  if (file.type === 'image/webp') {
    return 'image/webp';
  }

  if (
    file.type === 'image/jpeg' ||
    file.type === 'image/jpg'
  ) {
    return 'image/jpeg';
  }

  const normalizedUri = uri.toLowerCase();

  if (normalizedUri.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedUri.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
}

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

  const [aiSuggestion, setAiSuggestion] =
    useState<AiSuggestion | null>(null);

  const [isLoadingSuggestion, setIsLoadingSuggestion] =
    useState(false);

  const [aiSuggestionError, setAiSuggestionError] =
    useState('');

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

  const buildAiImagesPayload = async (): Promise<
    AiImageEvidence[]
  > => {
    const imagesForAnalysis = photoUris.slice(0, 3);
    const payload: AiImageEvidence[] = [];

    for (const uri of imagesForAnalysis) {
      const file = new File(uri);
      const data_base64 = await file.base64();

      if (!data_base64.trim()) {
        throw new Error(
          'No fue posible leer una de las fotografías.'
        );
      }

      payload.push({
        mime_type: getMimeTypeFromFile(
          file,
          uri
        ),
        data_base64,
      });
    }

    if (
      imagesForAnalysis.length > 0 &&
      payload.length !== imagesForAnalysis.length
    ) {
      throw new Error(
        'No fue posible preparar las fotografías para CIVIA.'
      );
    }

    return payload;
  };

  const requestAiSuggestion = async () => {
    const normalizedDescription =
      description.trim();

    if (
      !token ||
      !organizationId ||
      normalizedDescription.length < 10
    ) {
      setAiSuggestion(null);
      setAiSuggestionError(
        'Escribe al menos 10 caracteres para solicitar una sugerencia.'
      );
      return;
    }

    setIsLoadingSuggestion(true);
    setAiSuggestionError('');

    try {
      const images = await buildAiImagesPayload();

      const suggestion =
        await apiRequest<AiSuggestion>(
          '/ai/report-suggestion',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              organizationId,
              description:
                normalizedDescription,
              images,
            }),
          }
        );

      setAiSuggestion(suggestion);

      const suggestedCategory =
        categories.find(
          (category) =>
            category.id ===
            suggestion.suggestedCategory.id
        );

      if (suggestedCategory) {
        setSelectedCategory(
          suggestedCategory
        );

        setCategoryError('');

        if (
          suggestedCategory.name !==
          'Otro / No estoy seguro'
        ) {
          setOtherProblemType('');
          setOtherProblemTypeError('');
        }
      }
    } catch (error) {
      setAiSuggestion(null);

      if (
        photoUris.length > 0 &&
        error instanceof Error
      ) {
        setAiSuggestionError(
          `No pudimos analizar las fotografías con CIVIA. ${error.message}`
        );
      } else {
        setAiSuggestionError(
          'No pudimos obtener la sugerencia de CIVIA. Puedes continuar seleccionando la categoría manualmente.'
        );
      }
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

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

      setAiSuggestion(null);
      setAiSuggestionError('');
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
            ...(aiSuggestion
              ? {
                  aiAnalysis: {
                    intent: aiSuggestion.intent,
                    domain: aiSuggestion.domain,
                    problemType: aiSuggestion.problemType,
                    problemLabel: aiSuggestion.problemLabel,
                    suggestedCategoryId:
                      aiSuggestion.suggestedCategory.id,
                    priority: aiSuggestion.priority,
                    detectionConfidence:
                      aiSuggestion.detectionConfidence,
                    categoryMatchConfidence:
                      aiSuggestion.categoryMatchConfidence,
                    confidence: aiSuggestion.confidence,
                    model: aiSuggestion.model,
                    classificationMode:
                      aiSuggestion.classificationMode,
                  },
                }
              : {}),
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
                            setAiSuggestion(null);
                            setAiSuggestionError('');
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
                  Las fotografías son opcionales. CIVIA analizará
                  hasta 3 imágenes para generar la sugerencia.
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
                    setAiSuggestion(null);
                    setAiSuggestionError('');
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
              <View style={styles.aiCard}>
                <View style={styles.aiHeader}>
                  <View style={styles.aiIcon}>
                    <Text style={styles.aiIconText}>IA</Text>
                  </View>

                  <View style={styles.aiHeaderContent}>
                    <Text style={styles.aiTitle}>
                      Sugerencia de CIVIA
                    </Text>

                    <Text style={styles.aiSubtitle}>
                      Analiza la descripción y te ayuda a clasificar el reporte.
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    void requestAiSuggestion();
                  }}
                  disabled={
                    isLoadingSuggestion ||
                    description.trim().length < 10
                  }
                  style={({ pressed }) => [
                    styles.aiButton,
                    isLoadingSuggestion ||
                    description.trim().length < 10
                      ? styles.aiButtonDisabled
                      : undefined,
                    pressed &&
                    !isLoadingSuggestion &&
                    description.trim().length >= 10
                      ? styles.buttonPressed
                      : undefined,
                  ]}
                >
                  {isLoadingSuggestion ? (
                    <View style={styles.aiLoadingRow}>
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />

                      <Text style={styles.aiButtonText}>
                        Analizando...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.aiButtonText}>
                      Analizar con CIVIA
                    </Text>
                  )}
                </Pressable>

                {description.trim().length < 10 ? (
                  <Text style={styles.aiHelper}>
                    Escribe al menos 10 caracteres en la descripción para activar el análisis.
                  </Text>
                ) : null}

                {photoUris.length > 0 ? (
                  <Text style={styles.aiHelper}>
                    Si adjuntas fotografías, CIVIA también las tomará en cuenta.
                  </Text>
                ) : null}

                {aiSuggestionError ? (
                  <Text style={styles.aiErrorText}>
                    {aiSuggestionError}
                  </Text>
                ) : null}

                {aiSuggestion ? (
                  <View style={styles.aiResult}>
                    <View style={styles.aiResultHeader}>
                      <Text style={styles.aiResultTitle}>
                        Análisis completado
                      </Text>

                      <View style={styles.aiConfidenceBadge}>
                        <Text style={styles.aiConfidenceText}>
                          {Math.round(
                            aiSuggestion.detectionConfidence * 100
                          )}
                          % detección
                        </Text>
                      </View>
                    </View>

                    <View style={styles.aiDivider} />

                    <View style={styles.aiResultRow}>
                      <Text style={styles.aiResultLabel}>
                        Tipo de análisis
                      </Text>

                      <Text style={styles.aiResultValue}>
                        {aiSuggestion.classificationMode ===
                        'online_text_image'
                          ? 'Texto + evidencia visual'
                          : 'Solo texto'}
                      </Text>
                    </View>

                    <View style={styles.aiDivider} />

                    <View style={styles.aiResultRow}>
                      <Text style={styles.aiResultLabel}>
                        Problema detectado
                      </Text>

                      <Text style={styles.aiResultValue}>
                        {aiSuggestion.problemLabel}
                      </Text>
                    </View>

                    <View style={styles.aiDivider} />

                    <View style={styles.aiResultRow}>
                      <Text style={styles.aiResultLabel}>
                        Dominio
                      </Text>

                      <Text style={styles.aiResultValue}>
                        {aiSuggestion.domain}
                      </Text>
                    </View>

                    <View style={styles.aiDivider} />

                    <View style={styles.aiResultRow}>
                      <Text style={styles.aiResultLabel}>
                        Categoría disponible
                      </Text>

                      <Text style={styles.aiResultValue}>
                        {aiSuggestion.suggestedCategory.name}
                      </Text>
                    </View>

                    <View style={styles.aiDivider} />

                    <View style={styles.aiResultRow}>
                      <Text style={styles.aiResultLabel}>
                        Coincidencia con categoría
                      </Text>

                      <Text style={styles.aiResultValue}>
                        {Math.round(
                          aiSuggestion.categoryMatchConfidence * 100
                        )}
                        %
                      </Text>
                    </View>

                    <View style={styles.aiDivider} />

                    <View style={styles.aiResultRow}>
                      <Text style={styles.aiResultLabel}>
                        Área responsable
                      </Text>

                      <Text style={styles.aiResultValue}>
                        {aiSuggestion.suggestedDepartment?.name ??
                          'Sin área asignada'}
                      </Text>
                    </View>

                    <View style={styles.aiDivider} />

                    <View style={styles.aiResultRow}>
                      <Text style={styles.aiResultLabel}>
                        Prioridad
                      </Text>

                      <Text style={styles.aiResultValue}>
                        {aiSuggestion.priority === 'HIGH'
                          ? 'Alta'
                          : aiSuggestion.priority === 'MEDIUM'
                            ? 'Media'
                            : 'Baja'}
                      </Text>
                    </View>

                    <Text style={styles.aiNotice}>
                      La categoría sugerida fue seleccionada automáticamente. Puedes cambiarla manualmente antes de enviar el reporte.
                    </Text>
                  </View>
                ) : null}
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
  aiCard: {
    padding: 18,
    borderWidth: 1,
    borderColor: '#C7D7EA',
    borderRadius: 16,
    backgroundColor: '#F4F8FC',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aiIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#17365D',
  },
  aiIconText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  aiHeaderContent: {
    flex: 1,
  },
  aiTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17365D',
  },
  aiSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: '#667085',
  },
  aiButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 11,
    backgroundColor: '#17365D',
  },
  aiButtonDisabled: {
    opacity: 0.45,
  },
  aiButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiHelper: {
    marginTop: 9,
    fontSize: 12,
    lineHeight: 17,
    color: '#667085',
  },
  aiErrorText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: '#B42318',
  },
  aiResult: {
    marginTop: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#D8E2EE',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  aiResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiResultTitle: {
    flex: 1,
    marginRight: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#17365D',
  },
  aiConfidenceBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#EAF2FA',
  },
  aiConfidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#17365D',
  },
  aiResultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  aiResultLabel: {
    flex: 1,
    marginRight: 12,
    fontSize: 13,
    color: '#667085',
  },
  aiResultValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    color: '#17365D',
  },
  aiDivider: {
    height: 1,
    marginVertical: 11,
    backgroundColor: '#EAECF0',
  },
  aiNotice: {
    marginTop: 15,
    fontSize: 12,
    lineHeight: 18,
    color: '#475467',
  },
  buttonPressed: {
    opacity: 0.88,
  },
});
