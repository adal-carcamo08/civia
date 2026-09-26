import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  useCallback,
  useState,
} from 'react';
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
import { useAuth } from '../../../../contexts/auth-context';
import {
  ApiError,
  apiRequest,
  buildApiUrl,
} from '../../../../services/api';

type ReportStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'NOT_APPLICABLE'
  | 'REJECTED'
  | 'CANCELLED';

type Category = {
  id: string;
  name: string;
  description: string | null;
  department: {
    id: string;
    name: string;
  } | null;
};

type Attachment = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
};

type ReportForEdit = {
  id: string;
  code: string;
  status: ReportStatus;
  description: string;
  location: string | null;
  organization: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    name: string;
  } | null;
  attachments: Attachment[];
};

const GENERIC_CATEGORY = 'Otro / No estoy seguro';

function splitGenericDescription(value: string) {
  const match = value.match(
    /^Tipo de problema:\s*(.+?)\r?\n\r?\n([\s\S]*)$/
  );

  if (!match) {
    return {
      otherProblemType: '',
      description: value,
    };
  }

  return {
    otherProblemType: match[1].trim(),
    description: match[2].trim(),
  };
}

export default function EditReportScreen() {
  const params = useLocalSearchParams<{
    reportId?: string | string[];
  }>();

  const { token } = useAuth();

  const reportId = Array.isArray(params.reportId)
    ? params.reportId[0]
    : params.reportId;

  const [report, setReport] =
    useState<ReportForEdit | null>(null);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);

  const [description, setDescription] =
    useState('');

  const [location, setLocation] =
    useState('');

  const [otherProblemType, setOtherProblemType] =
    useState('');

  const [existingAttachments, setExistingAttachments] =
    useState<Attachment[]>([]);

  const [removedAttachmentIds, setRemovedAttachmentIds] =
    useState<string[]>([]);

  const [newPhotoUris, setNewPhotoUris] =
    useState<string[]>([]);

  const [categoryModalVisible, setCategoryModalVisible] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState('');

  const [categoryError, setCategoryError] =
    useState('');

  const [otherProblemTypeError, setOtherProblemTypeError] =
    useState('');

  const [descriptionError, setDescriptionError] =
    useState('');

  const [locationError, setLocationError] =
    useState('');

  const [photoError, setPhotoError] =
    useState('');

  const [submitError, setSubmitError] =
    useState('');

  const loadEditData = useCallback(async () => {
    if (!token || !reportId) {
      setLoadError(
        'No pudimos identificar el reporte solicitado.'
      );
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      const reportResponse =
        await apiRequest<ReportForEdit>(
          `/reports/${reportId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      setReport(reportResponse);

      if (reportResponse.status !== 'RECEIVED') {
        setCategories([]);
        return;
      }

      const categoryResponse =
        await apiRequest<Category[]>(
          `/organizations/${reportResponse.organization.id}/categories`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      setCategories(categoryResponse);

      const currentCategory =
        categoryResponse.find(
          (category) =>
            category.id === reportResponse.category?.id
        ) ??
        (reportResponse.category
          ? {
              id: reportResponse.category.id,
              name: reportResponse.category.name,
              description: null,
              department: reportResponse.department,
            }
          : null);

      setSelectedCategory(currentCategory);

      if (
        reportResponse.category?.name ===
        GENERIC_CATEGORY
      ) {
        const parsed = splitGenericDescription(
          reportResponse.description
        );

        setOtherProblemType(
          parsed.otherProblemType
        );

        setDescription(
          parsed.description
        );
      } else {
        setOtherProblemType('');
        setDescription(
          reportResponse.description
        );
      }

      setLocation(
        reportResponse.location ?? ''
      );

      setExistingAttachments(
        reportResponse.attachments
      );

      setRemovedAttachmentIds([]);
      setNewPhotoUris([]);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 404
      ) {
        setLoadError(
          'No encontramos este reporte o ya no está disponible.'
        );
      } else {
        setLoadError(
          'No pudimos cargar el reporte para editarlo.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [reportId, token]);

  useFocusEffect(
    useCallback(() => {
      void loadEditData();
    }, [loadEditData])
  );

  const totalPhotos =
    existingAttachments.length +
    newPhotoUris.length;

  const selectPhoto = async () => {
    setPhotoError('');

    if (totalPhotos >= 5) {
      setPhotoError(
        'Puedes conservar un máximo de 5 fotografías.'
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

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

    if (
      !result.canceled &&
      result.assets.length > 0
    ) {
      const asset = result.assets[0];

      setNewPhotoUris((current) => {
        if (
          existingAttachments.length +
            current.length >=
          5
        ) {
          return current;
        }

        return [...current, asset.uri];
      });
    }
  };

  const removeExistingAttachment = (
    attachmentId: string
  ) => {
    setExistingAttachments((current) =>
      current.filter(
        (attachment) =>
          attachment.id !== attachmentId
      )
    );

    setRemovedAttachmentIds((current) =>
      current.includes(attachmentId)
        ? current
        : [...current, attachmentId]
    );

    setPhotoError('');
  };

  const validateAndSave = async () => {
    if (isSaving) {
      return;
    }

    setCategoryError('');
    setOtherProblemTypeError('');
    setDescriptionError('');
    setLocationError('');
    setPhotoError('');
    setSubmitError('');

    let isValid = true;

    if (!selectedCategory) {
      setCategoryError(
        'Selecciona una categoría.'
      );
      isValid = false;
    }

    if (
      selectedCategory?.name ===
        GENERIC_CATEGORY &&
      !otherProblemType.trim()
    ) {
      setOtherProblemTypeError(
        'Indica brevemente qué tipo de problema deseas reportar.'
      );
      isValid = false;
    } else if (
      selectedCategory?.name ===
        GENERIC_CATEGORY &&
      otherProblemType.trim().length < 3
    ) {
      setOtherProblemTypeError(
        'Describe un poco mejor el tipo de problema.'
      );
      isValid = false;
    }

    if (!description.trim()) {
      setDescriptionError(
        'Describe el problema que deseas reportar.'
      );
      isValid = false;
    } else if (
      description.trim().length < 10
    ) {
      setDescriptionError(
        'Agrega un poco más de detalle al reporte.'
      );
      isValid = false;
    }

    if (!location.trim()) {
      setLocationError(
        'Ingresa una ubicación o referencia.'
      );
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    if (
      !token ||
      !reportId ||
      !report ||
      !selectedCategory
    ) {
      setSubmitError(
        'No pudimos preparar los cambios. Inténtalo nuevamente.'
      );
      return;
    }

    if (report.status !== 'RECEIVED') {
      setSubmitError(
        'Este reporte ya no puede editarse.'
      );
      return;
    }

    const normalizedDescription =
      description.trim();

    const normalizedLocation =
      location.trim();

    const finalDescription =
      selectedCategory.name ===
      GENERIC_CATEGORY
        ? `Tipo de problema: ${otherProblemType.trim()}

${normalizedDescription}`
        : normalizedDescription;

    const updatePayload: {
      categoryId?: string;
      description?: string;
      location?: string;
    } = {};

    if (
      selectedCategory.id !==
      report.category?.id
    ) {
      updatePayload.categoryId =
        selectedCategory.id;
    }

    if (
      finalDescription !==
      report.description
    ) {
      updatePayload.description =
        finalDescription;
    }

    if (
      normalizedLocation !==
      (report.location ?? '')
    ) {
      updatePayload.location =
        normalizedLocation;
    }

    const hasFieldChanges =
      Object.keys(updatePayload).length > 0;

    const hasEvidenceChanges =
      removedAttachmentIds.length > 0 ||
      newPhotoUris.length > 0;

    if (
      !hasFieldChanges &&
      !hasEvidenceChanges
    ) {
      Alert.alert(
        'Sin cambios',
        'No has realizado cambios en el reporte.'
      );
      return;
    }

    setIsSaving(true);

    try {
      if (hasFieldChanges) {
        await apiRequest(
          `/reports/${reportId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(
              updatePayload
            ),
          }
        );
      }

      let failedEvidenceOperations = 0;

      for (
        const attachmentId
        of removedAttachmentIds
      ) {
        try {
          await apiRequest(
            `/reports/${reportId}/attachments/${attachmentId}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } catch {
          failedEvidenceOperations += 1;
        }
      }

      for (const photoUri of newPhotoUris) {
        try {
          const file =
            new File(photoUri);

          const formData =
            new FormData();

          formData.append(
            'file',
            file
          );

          const uploadResponse =
            await expoFetch(
              buildApiUrl(
                `/reports/${reportId}/attachments`
              ),
              {
                method: 'POST',
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
                body: formData,
              }
            );

          if (!uploadResponse.ok) {
            throw new Error(
              'No fue posible subir una evidencia.'
            );
          }
        } catch {
          failedEvidenceOperations += 1;
        }
      }

      if (
        failedEvidenceOperations > 0
      ) {
        Alert.alert(
          'Cambios guardados parcialmente',
          'Los datos principales fueron procesados, pero alguna operación con las fotografías no pudo completarse. Revisa el reporte antes de intentarlo nuevamente.',
          [
            {
              text: 'Ver reporte',
              onPress: () => {
                router.replace({
                  pathname:
                    '/reports/[reportId]',
                  params: {
                    reportId,
                  },
                });
              },
            },
          ]
        );

        return;
      }

      Alert.alert(
        'Reporte actualizado',
        'Los cambios se guardaron correctamente.',
        [
          {
            text: 'Ver reporte',
            onPress: () => {
              router.replace({
                pathname:
                  '/reports/[reportId]',
                params: {
                  reportId,
                },
              });
            },
          },
        ]
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(
          error.message
        );
      } else {
        setSubmitError(
          'No pudimos guardar los cambios. Verifica tu conexión e inténtalo nuevamente.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    if (!reportId) {
      router.replace('/reports');
      return;
    }

    router.replace({
      pathname: '/reports/[reportId]',
      params: {
        reportId,
      },
    });
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
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Pressable
              onPress={goBack}
              style={({ pressed }) => [
                styles.topBackButton,
                pressed
                  ? styles.buttonPressed
                  : undefined,
              ]}
            >
              <Text style={styles.topBackText}>
                ‹ Volver al reporte
              </Text>
            </Pressable>

            <Text style={styles.brand}>
              CIVIA
            </Text>

            <Text style={styles.title}>
              Editar reporte
            </Text>

            <Text style={styles.subtitle}>
              Puedes modificar el reporte mientras permanezca en estado Recibido.
            </Text>

            {isLoading ? (
              <View style={styles.centerState}>
                <ActivityIndicator
                  size="large"
                  color="#17365D"
                />

                <Text style={styles.stateText}>
                  Cargando reporte...
                </Text>
              </View>
            ) : loadError ? (
              <View style={styles.centerState}>
                <Text style={styles.errorTitle}>
                  No pudimos abrir la edición
                </Text>

                <Text style={styles.stateText}>
                  {loadError}
                </Text>

                <Pressable
                  onPress={() => {
                    void loadEditData();
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed
                      ? styles.buttonPressed
                      : undefined,
                  ]}
                >
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Intentar nuevamente
                  </Text>
                </Pressable>
              </View>
            ) : report &&
              report.status !== 'RECEIVED' ? (
              <View style={styles.centerState}>
                <Text style={styles.errorTitle}>
                  Edición no disponible
                </Text>

                <Text style={styles.stateText}>
                  Este reporte ya avanzó en su proceso y no puede modificarse.
                </Text>

                <Pressable
                  onPress={goBack}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed
                      ? styles.buttonPressed
                      : undefined,
                  ]}
                >
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Volver al reporte
                  </Text>
                </Pressable>
              </View>
            ) : report ? (
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Fotografías
                  </Text>

                  {totalPhotos === 0 ? (
                    <Pressable
                      onPress={selectPhoto}
                      style={({ pressed }) => [
                        styles.photoSelector,
                        pressed
                          ? styles.buttonPressed
                          : undefined,
                      ]}
                    >
                      <Text
                        style={
                          styles.photoSelectorTitle
                        }
                      >
                        Agregar fotografía
                      </Text>

                      <Text
                        style={
                          styles.photoSelectorText
                        }
                      >
                        Puedes conservar hasta 5 imágenes
                      </Text>
                    </Pressable>
                  ) : (
                    <View
                      style={
                        styles.photoGrid
                      }
                    >
                      {existingAttachments.map(
                        (attachment) => (
                          <View
                            key={
                              attachment.id
                            }
                            style={
                              styles.photoCard
                            }
                          >
                            <Image
                              source={{
                                uri: buildApiUrl(
                                  attachment.url
                                ),
                                headers: {
                                  Authorization:
                                    `Bearer ${token}`,
                                },
                              }}
                              style={
                                styles.photoCardImage
                              }
                            />

                            <Text
                              style={
                                styles.existingBadge
                              }
                            >
                              Evidencia actual
                            </Text>

                            <Pressable
                              onPress={() =>
                                removeExistingAttachment(
                                  attachment.id
                                )
                              }
                              style={({
                                pressed,
                              }) => [
                                styles.photoRemoveButton,
                                pressed
                                  ? styles.buttonPressed
                                  : undefined,
                              ]}
                            >
                              <Text
                                style={
                                  styles.photoRemoveText
                                }
                              >
                                Quitar
                              </Text>
                            </Pressable>
                          </View>
                        )
                      )}

                      {newPhotoUris.map(
                        (
                          photoUri,
                          index
                        ) => (
                          <View
                            key={`${photoUri}-${index}`}
                            style={
                              styles.photoCard
                            }
                          >
                            <Image
                              source={{
                                uri: photoUri,
                              }}
                              style={
                                styles.photoCardImage
                              }
                            />

                            <Text
                              style={
                                styles.newBadge
                              }
                            >
                              Nueva
                            </Text>

                            <Pressable
                              onPress={() => {
                                setNewPhotoUris(
                                  (current) =>
                                    current.filter(
                                      (
                                        _,
                                        photoIndex
                                      ) =>
                                        photoIndex !==
                                        index
                                    )
                                );

                                setPhotoError(
                                  ''
                                );
                              }}
                              style={({
                                pressed,
                              }) => [
                                styles.photoRemoveButton,
                                pressed
                                  ? styles.buttonPressed
                                  : undefined,
                              ]}
                            >
                              <Text
                                style={
                                  styles.photoRemoveText
                                }
                              >
                                Quitar
                              </Text>
                            </Pressable>
                          </View>
                        )
                      )}

                      {totalPhotos < 5 ? (
                        <Pressable
                          onPress={selectPhoto}
                          style={({
                            pressed,
                          }) => [
                            styles.photoAddCard,
                            pressed
                              ? styles.buttonPressed
                              : undefined,
                          ]}
                        >
                          <Text
                            style={
                              styles.photoAddSymbol
                            }
                          >
                            +
                          </Text>

                          <Text
                            style={
                              styles.photoAddText
                            }
                          >
                            Agregar otra
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  )}

                  <Text
                    style={
                      styles.photoCounter
                    }
                  >
                    {totalPhotos} de 5 fotografías
                  </Text>

                  {removedAttachmentIds.length >
                  0 ? (
                    <Text
                      style={
                        styles.pendingChangeText
                      }
                    >
                      {
                        removedAttachmentIds.length
                      } evidencia(s) se eliminarán únicamente al guardar.
                    </Text>
                  ) : null}

                  {photoError ? (
                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {photoError}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>
                    Categoría
                  </Text>

                  <Pressable
                    onPress={() =>
                      setCategoryModalVisible(
                        true
                      )
                    }
                    style={[
                      styles.categoryField,
                      categoryError
                        ? styles.inputError
                        : undefined,
                    ]}
                  >
                    <Text
                      style={
                        selectedCategory
                          ? styles.categorySelectedText
                          : styles.categoryText
                      }
                    >
                      {selectedCategory?.name ??
                        'Seleccionar categoría'}
                    </Text>

                    <View
                      style={
                        styles.categoryArrow
                      }
                    />
                  </Pressable>

                  {categoryError ? (
                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {categoryError}
                    </Text>
                  ) : (
                    <Text
                      style={
                        styles.helperText
                      }
                    >
                      Solo se muestran categorías válidas para esta organización.
                    </Text>
                  )}
                </View>

                {selectedCategory?.name ===
                GENERIC_CATEGORY ? (
                  <View style={styles.field}>
                    <Text
                      style={styles.label}
                    >
                      ¿Qué tipo de problema es?
                    </Text>

                    <TextInput
                      value={
                        otherProblemType
                      }
                      onChangeText={(
                        value
                      ) => {
                        setOtherProblemType(
                          value
                        );

                        if (
                          otherProblemTypeError
                        ) {
                          setOtherProblemTypeError(
                            ''
                          );
                        }
                      }}
                      placeholder="Ej. Árbol en riesgo de caer"
                      placeholderTextColor="#98A2B3"
                      maxLength={100}
                      style={[
                        styles.input,
                        otherProblemTypeError
                          ? styles.inputError
                          : undefined,
                      ]}
                    />

                    {otherProblemTypeError ? (
                      <Text
                        style={
                          styles.errorText
                        }
                      >
                        {
                          otherProblemTypeError
                        }
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.field}>
                  <Text style={styles.label}>
                    Descripción
                  </Text>

                  <TextInput
                    value={description}
                    onChangeText={(
                      value
                    ) => {
                      setDescription(
                        value
                      );

                      if (
                        descriptionError
                      ) {
                        setDescriptionError(
                          ''
                        );
                      }
                    }}
                    placeholder="Describe lo ocurrido"
                    placeholderTextColor="#98A2B3"
                    multiline
                    textAlignVertical="top"
                    maxLength={500}
                    style={[
                      styles.textArea,
                      descriptionError
                        ? styles.inputError
                        : undefined,
                    ]}
                  />

                  <View
                    style={
                      styles.descriptionFooter
                    }
                  >
                    {descriptionError ? (
                      <Text
                        style={
                          styles.errorText
                        }
                      >
                        {descriptionError}
                      </Text>
                    ) : (
                      <View />
                    )}

                    <Text
                      style={styles.counter}
                    >
                      {description.length}/500
                    </Text>
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>
                    Ubicación o referencia
                  </Text>

                  <TextInput
                    value={location}
                    onChangeText={(
                      value
                    ) => {
                      setLocation(value);

                      if (
                        locationError
                      ) {
                        setLocationError(
                          ''
                        );
                      }
                    }}
                    placeholder="Ej. Edificio B, segundo nivel"
                    placeholderTextColor="#98A2B3"
                    maxLength={150}
                    style={[
                      styles.input,
                      locationError
                        ? styles.inputError
                        : undefined,
                    ]}
                  />

                  {locationError ? (
                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {locationError}
                    </Text>
                  ) : null}
                </View>

                {submitError ? (
                  <Text
                    style={
                      styles.submitError
                    }
                  >
                    {submitError}
                  </Text>
                ) : null}

                <Pressable
                  onPress={() => {
                    void validateAndSave();
                  }}
                  disabled={isSaving}
                  style={({
                    pressed,
                  }) => [
                    styles.primaryButton,
                    pressed &&
                    !isSaving
                      ? styles.buttonPressed
                      : undefined,
                    isSaving
                      ? styles.primaryButtonDisabled
                      : undefined,
                  ]}
                >
                  {isSaving ? (
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
                      Guardar cambios
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={goBack}
                  disabled={isSaving}
                  style={({
                    pressed,
                  }) => [
                    styles.secondaryButton,
                    pressed &&
                    !isSaving
                      ? styles.buttonPressed
                      : undefined,
                  ]}
                >
                  <Text
                    style={
                      styles.secondaryButtonText
                    }
                  >
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <Modal
            visible={
              categoryModalVisible
            }
            transparent
            animationType="fade"
            onRequestClose={() =>
              setCategoryModalVisible(
                false
              )
            }
          >
            <View
              style={
                styles.modalOverlay
              }
            >
              <View
                style={
                  styles.modalCard
                }
              >
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Seleccionar categoría
                </Text>

                <ScrollView
                  style={
                    styles.categoryScroll
                  }
                  showsVerticalScrollIndicator={
                    false
                  }
                >
                  <View
                    style={
                      styles.categoryOptions
                    }
                  >
                    {categories.map(
                      (category) => (
                        <Pressable
                          key={
                            category.id
                          }
                          onPress={() => {
                            setSelectedCategory(
                              category
                            );

                            setCategoryError(
                              ''
                            );

                            setOtherProblemTypeError(
                              ''
                            );

                            if (
                              category.name !==
                              GENERIC_CATEGORY
                            ) {
                              setOtherProblemType(
                                ''
                              );
                            }

                            setCategoryModalVisible(
                              false
                            );
                          }}
                          style={({
                            pressed,
                          }) => [
                            styles.categoryOption,
                            selectedCategory?.id ===
                            category.id
                              ? styles.categoryOptionSelected
                              : undefined,
                            pressed
                              ? styles.buttonPressed
                              : undefined,
                          ]}
                        >
                          <Text
                            style={
                              styles.categoryOptionTitle
                            }
                          >
                            {
                              category.name
                            }
                          </Text>

                          {category.department ? (
                            <Text
                              style={
                                styles.categoryOptionDepartment
                              }
                            >
                              {
                                category.department
                                  .name
                              }
                            </Text>
                          ) : null}

                          {category.description ? (
                            <Text
                              style={
                                styles.categoryOptionDescription
                              }
                            >
                              {
                                category.description
                              }
                            </Text>
                          ) : null}
                        </Pressable>
                      )
                    )}
                  </View>
                </ScrollView>

                <Pressable
                  onPress={() =>
                    setCategoryModalVisible(
                      false
                    )
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.modalButton,
                    pressed
                      ? styles.buttonPressed
                      : undefined,
                  ]}
                >
                  <Text
                    style={
                      styles.modalButtonText
                    }
                  >
                    Cerrar
                  </Text>
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
    paddingVertical: 24,
  },
  topBackButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 10,
  },
  topBackText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2F75B5',
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
    fontSize: 15,
    lineHeight: 22,
    color: '#667085',
  },
  centerState: {
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    maxWidth: 330,
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#667085',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  form: {
    marginTop: 30,
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
  existingBadge: {
    paddingHorizontal: 10,
    paddingTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: '#2F75B5',
  },
  newBadge: {
    paddingHorizontal: 10,
    paddingTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#027A48',
  },
  photoRemoveButton: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D92D20',
  },
  photoAddCard: {
    width: '48%',
    minHeight: 177,
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
  pendingChangeText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#B54708',
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
    transform: [
      {
        rotate: '45deg',
      },
    ],
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#667085',
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
  inputError: {
    borderColor: '#D92D20',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#D92D20',
  },
  submitError: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
    opacity: 0.65,
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
    maxHeight: '82%',
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  categoryScroll: {
    marginTop: 18,
  },
  categoryOptions: {
    gap: 10,
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
  modalButton: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
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