import {
  fetch as expoFetch,
} from 'expo/fetch';
import {
  File,
  Paths,
} from 'expo-file-system';
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
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../../../contexts/auth-context';
import {
  ApiError,
  apiRequest,
  buildApiUrl,
} from '../../../../../services/api';

type ReportStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'NOT_APPLICABLE'
  | 'REJECTED'
  | 'CANCELLED';

type ReportAttachment = {
  id: string;
  url: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
};

type ReportHistory = {
  id: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  note: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    fullName: string;
  } | null;
};

type ReportDetail = {
  id: string;
  code: string;
  status: ReportStatus;
  description: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;

  reporter?: {
    id: string;
    fullName: string;
    email?: string;
  };

  organization: {
    id: string;
    name: string;
    type?: 'PUBLIC' | 'PRIVATE';
  };

  category: {
    id: string;
    name: string;
  } | null;

  department: {
    id: string;
    name: string;
  } | null;

  assignedTo: {
    id: string;
    fullName: string;
    email?: string;
  } | null;

  attachments: ReportAttachment[];
  history: ReportHistory[];
};

type DetailMode =
  | 'mine'
  | 'organization';

const statusLabels: Record<
  ReportStatus,
  string
> = {
  RECEIVED: 'Recibido',
  UNDER_REVIEW: 'En revisión',
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En proceso',
  RESOLVED: 'Resuelto',
  NOT_APPLICABLE: 'No procede',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    'es-SV',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(new Date(value));
}

function getAttachmentExtension(
  mimeType: string
) {
  switch (mimeType) {
    case 'image/png':
      return 'png';

    case 'image/webp':
      return 'webp';

    case 'image/jpeg':
    default:
      return 'jpg';
  }
}

export default function OrganizationReportDetailScreen() {
  const params =
    useLocalSearchParams<{
      organizationId?:
        | string
        | string[];
      reportId?:
        | string
        | string[];
    }>();

  const {
    token,
    user,
  } = useAuth();

  const organizationId =
    Array.isArray(
      params.organizationId
    )
      ? params.organizationId[0]
      : params.organizationId;

  const reportId =
    Array.isArray(params.reportId)
      ? params.reportId[0]
      : params.reportId;

  const [report, setReport] =
    useState<ReportDetail | null>(
      null
    );

  const [
    previewAttachment,
    setPreviewAttachment,
  ] =
    useState<ReportAttachment | null>(
      null
    );

  const [
    attachmentLocalUris,
    setAttachmentLocalUris,
  ] = useState<
    Record<string, string>
  >({});

  const [
    attachmentLoadErrors,
    setAttachmentLoadErrors,
  ] = useState<
    Record<string, boolean>
  >({});

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const loadProtectedAttachments =
    useCallback(
      async (
        attachments:
          ReportAttachment[],
        mode: DetailMode
      ) => {
        if (
          !token ||
          !reportId ||
          !organizationId
        ) {
          setAttachmentLocalUris(
            {}
          );
          return;
        }

        const nextUris: Record<
          string,
          string
        > = {};

        const nextErrors: Record<
          string,
          boolean
        > = {};

        await Promise.all(
          attachments.map(
            async (attachment) => {
              try {
                const path =
                  mode ===
                  'organization'
                    ? `/organizations/${organizationId}/admin/reports/${reportId}/attachments/${attachment.id}/file`
                    : attachment.url;

                const response =
                  await expoFetch(
                    buildApiUrl(
                      path
                    ),
                    {
                      headers: {
                        Authorization:
                          `Bearer ${token}`,
                      },
                    }
                  );

                if (
                  !response.ok
                ) {
                  throw new Error(
                    `HTTP ${response.status}`
                  );
                }

                const extension =
                  getAttachmentExtension(
                    attachment.mimeType
                  );

                const cachedFile =
                  new File(
                    Paths.cache,
                    `civia-org-report-${attachment.id}.${extension}`
                  );

                cachedFile.write(
                  await response.bytes()
                );

                nextUris[
                  attachment.id
                ] =
                  cachedFile.uri;
              } catch (error) {
                console.warn(
                  `No se pudo cargar la evidencia ${attachment.id}.`,
                  error
                );

                nextErrors[
                  attachment.id
                ] = true;
              }
            }
          )
        );

        setAttachmentLocalUris(
          nextUris
        );

        setAttachmentLoadErrors(
          nextErrors
        );
      },
      [
        organizationId,
        reportId,
        token,
      ]
    );

  const loadReport =
    useCallback(async () => {
      if (
        !token ||
        !organizationId ||
        !reportId
      ) {
        setReport(null);
        setErrorMessage(
          'No pudimos identificar el reporte solicitado.'
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      setAttachmentLocalUris({});
      setAttachmentLoadErrors(
        {}
      );

      try {
        let response:
          ReportDetail;

        let mode:
          DetailMode = 'mine';

        try {
          response =
            await apiRequest<
              ReportDetail
            >(
              `/reports/${reportId}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );
        } catch (
          personalError
        ) {
          if (
            personalError instanceof
              ApiError &&
            (personalError.status ===
              403 ||
              personalError.status ===
                404)
          ) {
            mode =
              'organization';

            response =
              await apiRequest<
                ReportDetail
              >(
                `/organizations/${organizationId}/admin/reports/${reportId}`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              );
          } else {
            throw personalError;
          }
        }

        setReport(response);

        await loadProtectedAttachments(
          response.attachments ??
            [],
          mode
        );
      } catch (error) {
        setReport(null);

        if (
          error instanceof
            ApiError &&
          error.status === 403
        ) {
          setErrorMessage(
            'No tienes permiso para consultar el detalle de este reporte.'
          );
        } else if (
          error instanceof
            ApiError &&
          error.status === 404
        ) {
          setErrorMessage(
            'No encontramos este reporte.'
          );
        } else {
          setErrorMessage(
            'No pudimos cargar el detalle del reporte. Inténtalo nuevamente.'
          );
        }
      } finally {
        setIsLoading(false);
      }
    }, [
      loadProtectedAttachments,
      organizationId,
      reportId,
      token,
    ]);

  useFocusEffect(
    useCallback(() => {
      void loadReport();
    }, [loadReport])
  );

  const goBack = () => {
    if (!organizationId) {
      router.replace(
        '/organizations'
      );
      return;
    }

    router.replace({
      pathname:
        '/organizations/[organizationId]/reports',
      params: {
        organizationId,
      },
    });
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={styles.container}
        >
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [
              styles.topBackButton,
              pressed
                ? styles.buttonPressed
                : undefined,
            ]}
          >
            <Text
              style={
                styles.topBackText
              }
            >
              ‹ Reportes de la
              organización
            </Text>
          </Pressable>

          <Text style={styles.brand}>
            CIVIA
          </Text>

          <Text style={styles.title}>
            Detalle del reporte
          </Text>

          {isLoading ? (
            <View
              style={
                styles.centerState
              }
            >
              <ActivityIndicator
                size="large"
                color="#17365D"
              />

              <Text
                style={
                  styles.stateText
                }
              >
                Cargando reporte...
              </Text>
            </View>
          ) : errorMessage ? (
            <View
              style={
                styles.centerState
              }
            >
              <Text
                style={
                  styles.errorTitle
                }
              >
                No pudimos mostrar
                el reporte
              </Text>

              <Text
                style={
                  styles.stateText
                }
              >
                {errorMessage}
              </Text>

              <Pressable
                onPress={() => {
                  void loadReport();
                }}
                style={({
                  pressed,
                }) => [
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

              <Pressable
                onPress={goBack}
                style={({
                  pressed,
                }) => [
                  styles.secondaryButton,
                  styles.errorBackButton,
                  pressed
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
          ) : report ? (
            <>
              <Text
                style={
                  styles.reportCode
                }
              >
                {report.code}
              </Text>

              <View
                style={
                  styles.statusCard
                }
              >
                <Text
                  style={
                    styles.sectionLabel
                  }
                >
                  Estado actual
                </Text>

                <View
                  style={
                    styles.statusBadge
                  }
                >
                  <Text
                    style={
                      styles.statusText
                    }
                  >
                    {
                      statusLabels[
                        report.status
                      ]
                    }
                  </Text>
                </View>

                <Text
                  style={
                    styles.updatedText
                  }
                >
                  Actualizado{' '}
                  {formatDate(
                    report.updatedAt
                  )}
                </Text>
              </View>

              <View
                style={styles.section}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Información del
                  reporte
                </Text>

                <View
                  style={
                    styles.infoCard
                  }
                >
                  <View
                    style={
                      styles.infoItem
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Organización
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {
                        report
                          .organization
                          .name
                      }
                    </Text>
                  </View>

                  <View
                    style={
                      styles.separator
                    }
                  />

                  <View
                    style={
                      styles.infoItem
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Categoría
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {report.category
                        ?.name ??
                        'Sin categoría'}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.separator
                    }
                  />

                  <View
                    style={
                      styles.infoItem
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Reportado por
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {report.reporter
                        ?.fullName ??
                        user?.fullName ??
                        'No disponible'}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.separator
                    }
                  />

                  <View
                    style={
                      styles.infoItem
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Departamento
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {report.department
                        ?.name ??
                        'Pendiente de asignación'}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.separator
                    }
                  />

                  <View
                    style={
                      styles.infoItem
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Responsable
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {report.assignedTo
                        ?.fullName ??
                        'Pendiente de asignación'}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.separator
                    }
                  />

                  <View
                    style={
                      styles.infoItem
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Descripción
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {
                        report.description
                      }
                    </Text>
                  </View>

                  <View
                    style={
                      styles.separator
                    }
                  />

                  <View
                    style={
                      styles.infoItem
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Ubicación
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {report.location ??
                        'No especificada'}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.separator
                    }
                  />

                  <View
                    style={
                      styles.infoItem
                    }
                  >
                    <Text
                      style={
                        styles.infoLabel
                      }
                    >
                      Fecha de creación
                    </Text>

                    <Text
                      style={
                        styles.infoValue
                      }
                    >
                      {formatDate(
                        report.createdAt
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={styles.section}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Seguimiento
                </Text>

                {report.history
                  .length === 0 ? (
                  <View
                    style={
                      styles.emptyCard
                    }
                  >
                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      Aún no hay
                      movimientos
                      registrados.
                    </Text>
                  </View>
                ) : (
                  <View
                    style={
                      styles.timelineList
                    }
                  >
                    {report.history.map(
                      (
                        item,
                        index
                      ) => (
                        <View
                          key={
                            item.id
                          }
                          style={
                            styles.timelineCard
                          }
                        >
                          <View
                            style={
                              styles.timelineIndicator
                            }
                          >
                            <View
                              style={
                                styles.timelineDot
                              }
                            />

                            {index <
                            report
                              .history
                              .length -
                              1 ? (
                              <View
                                style={
                                  styles.timelineLine
                                }
                              />
                            ) : null}
                          </View>

                          <View
                            style={
                              styles.timelineContent
                            }
                          >
                            <Text
                              style={
                                styles.timelineTitle
                              }
                            >
                              {
                                statusLabels[
                                  item
                                    .toStatus
                                ]
                              }
                            </Text>

                            <Text
                              style={
                                styles.timelineDate
                              }
                            >
                              {formatDate(
                                item.createdAt
                              )}
                            </Text>

                            {item.note ? (
                              <Text
                                style={
                                  styles.timelineText
                                }
                              >
                                {
                                  item.note
                                }
                              </Text>
                            ) : null}

                            {item.changedBy ? (
                              <Text
                                style={
                                  styles.changedBy
                                }
                              >
                                Por{' '}
                                {
                                  item
                                    .changedBy
                                    .fullName
                                }
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      )
                    )}
                  </View>
                )}
              </View>

              <View
                style={styles.section}
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Evidencias
                </Text>

                {report.attachments
                  .length === 0 ? (
                  <View
                    style={
                      styles.emptyCard
                    }
                  >
                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      Este reporte no
                      tiene evidencias
                      adjuntas.
                    </Text>
                  </View>
                ) : (
                  <View
                    style={
                      styles.attachmentsCard
                    }
                  >
                    {report.attachments.map(
                      (
                        attachment,
                        index
                      ) => (
                        <View
                          key={
                            attachment.id
                          }
                        >
                          <View
                            style={
                              styles.attachmentItem
                            }
                          >
                            <Pressable
                              onPress={() =>
                                setPreviewAttachment(
                                  attachment
                                )
                              }
                              style={({
                                pressed,
                              }) => [
                                styles.attachmentImageButton,
                                pressed
                                  ? styles.buttonPressed
                                  : undefined,
                              ]}
                            >
                              {attachmentLocalUris[
                                attachment
                                  .id
                              ] ? (
                                <Image
                                  source={{
                                    uri: attachmentLocalUris[
                                      attachment
                                        .id
                                    ],
                                  }}
                                  style={
                                    styles.attachmentImage
                                  }
                                  resizeMode="cover"
                                />
                              ) : (
                                <View
                                  style={
                                    styles.attachmentPlaceholder
                                  }
                                >
                                  {attachmentLoadErrors[
                                    attachment
                                      .id
                                  ] ? (
                                    <Text
                                      style={
                                        styles.attachmentErrorText
                                      }
                                    >
                                      No
                                      disponible
                                    </Text>
                                  ) : (
                                    <ActivityIndicator
                                      size="small"
                                      color="#17365D"
                                    />
                                  )}
                                </View>
                              )}
                            </Pressable>

                            <View
                              style={
                                styles.attachmentInfo
                              }
                            >
                              <Text
                                style={
                                  styles.fileName
                                }
                                numberOfLines={
                                  1
                                }
                              >
                                {
                                  attachment.fileName
                                }
                              </Text>

                              <Text
                                style={
                                  styles.fileMeta
                                }
                              >
                                {
                                  attachment.mimeType
                                }{' '}
                                ·{' '}
                                {formatDate(
                                  attachment.createdAt
                                )}
                              </Text>

                              <Text
                                style={
                                  styles.protectedText
                                }
                              >
                                Evidencia
                                protegida
                              </Text>
                            </View>
                          </View>

                          {index <
                          report
                            .attachments
                            .length -
                            1 ? (
                            <View
                              style={
                                styles.separator
                              }
                            />
                          ) : null}
                        </View>
                      )
                    )}
                  </View>
                )}
              </View>

              <Pressable
                onPress={goBack}
                style={({
                  pressed,
                }) => [
                  styles.backButton,
                  pressed
                    ? styles.buttonPressed
                    : undefined,
                ]}
              >
                <Text
                  style={
                    styles.backButtonText
                  }
                >
                  Volver a reportes
                  de la organización
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={
          previewAttachment !== null
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setPreviewAttachment(
            null
          )
        }
      >
        <View
          style={
            styles.previewOverlay
          }
        >
          <View
            style={
              styles.previewHeader
            }
          >
            <Text
              style={
                styles.previewFileName
              }
              numberOfLines={1}
            >
              {previewAttachment
                ?.fileName ??
                'Evidencia'}
            </Text>

            <Pressable
              onPress={() =>
                setPreviewAttachment(
                  null
                )
              }
              hitSlop={12}
              style={({
                pressed,
              }) => [
                styles.previewCloseButton,
                pressed
                  ? styles.previewClosePressed
                  : undefined,
              ]}
            >
              <Text
                style={
                  styles.previewCloseText
                }
              >
                Cerrar
              </Text>
            </Pressable>
          </View>

          <View
            style={
              styles.previewContent
            }
          >
            {previewAttachment &&
            attachmentLocalUris[
              previewAttachment.id
            ] ? (
              <Image
                source={{
                  uri: attachmentLocalUris[
                    previewAttachment
                      .id
                  ],
                }}
                style={
                  styles.previewImage
                }
                resizeMode="contain"
              />
            ) : previewAttachment ? (
              <View
                style={
                  styles.previewPlaceholder
                }
              >
                {attachmentLoadErrors[
                  previewAttachment.id
                ] ? (
                  <Text
                    style={
                      styles.previewErrorText
                    }
                  >
                    No pudimos cargar
                    esta evidencia.
                  </Text>
                ) : (
                  <>
                    <ActivityIndicator
                      size="large"
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.previewLoadingText
                      }
                    >
                      Cargando
                      evidencia...
                    </Text>
                  </>
                )}
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#F7F9FB',
    },

    scrollContent: {
      flexGrow: 1,
    },

    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 18,
      paddingBottom: 32,
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
      letterSpacing: 0.5,
    },

    title: {
      fontSize: 32,
      lineHeight: 39,
      fontWeight: '700',
      color: '#1F2937',
    },

    reportCode: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '600',
      color: '#667085',
    },

    centerState: {
      minHeight: 420,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },

    stateText: {
      maxWidth: 320,
      marginTop: 10,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      color: '#667085',
    },

    errorTitle: {
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      color: '#1F2937',
    },

    statusCard: {
      marginTop: 28,
      padding: 20,
      borderWidth: 1,
      borderColor: '#E4E7EC',
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
    },

    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: '#667085',
    },

    statusBadge: {
      alignSelf: 'flex-start',
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: '#E8EFF7',
    },

    statusText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#17365D',
    },

    updatedText: {
      marginTop: 10,
      fontSize: 12,
      color: '#98A2B3',
    },

    section: {
      marginTop: 28,
    },

    sectionTitle: {
      marginBottom: 12,
      fontSize: 20,
      fontWeight: '700',
      color: '#1F2937',
    },

    infoCard: {
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#E4E7EC',
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
    },

    infoItem: {
      padding: 18,
    },

    infoLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: '#667085',
    },

    infoValue: {
      marginTop: 5,
      fontSize: 15,
      lineHeight: 22,
      color: '#344054',
    },

    separator: {
      height: 1,
      backgroundColor: '#E4E7EC',
    },

    emptyCard: {
      padding: 18,
      borderWidth: 1,
      borderColor: '#E4E7EC',
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
    },

    emptyText: {
      fontSize: 14,
      lineHeight: 21,
      color: '#667085',
    },

    timelineList: {
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#E4E7EC',
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
    },

    timelineCard: {
      flexDirection: 'row',
      paddingHorizontal: 18,
      paddingTop: 18,
    },

    timelineIndicator: {
      width: 24,
      alignItems: 'center',
    },

    timelineDot: {
      width: 12,
      height: 12,
      marginTop: 4,
      borderRadius: 6,
      backgroundColor: '#2F8F9D',
    },

    timelineLine: {
      width: 2,
      flex: 1,
      minHeight: 42,
      marginTop: 5,
      backgroundColor: '#D0D5DD',
    },

    timelineContent: {
      flex: 1,
      paddingLeft: 10,
      paddingBottom: 20,
    },

    timelineTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1F2937',
    },

    timelineDate: {
      marginTop: 3,
      fontSize: 12,
      color: '#98A2B3',
    },

    timelineText: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color: '#667085',
    },

    changedBy: {
      marginTop: 6,
      fontSize: 12,
      color: '#667085',
    },

    attachmentsCard: {
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#E4E7EC',
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
    },

    attachmentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },

    attachmentImageButton: {
      width: 76,
      height: 76,
      borderRadius: 12,
      overflow: 'hidden',
    },

    attachmentImage: {
      width: '100%',
      height: '100%',
      backgroundColor: '#E8EFF7',
    },

    attachmentPlaceholder: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
      backgroundColor: '#E8EFF7',
    },

    attachmentErrorText: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: '600',
      textAlign: 'center',
      color: '#667085',
    },

    attachmentInfo: {
      flex: 1,
      marginLeft: 12,
    },

    fileName: {
      fontSize: 14,
      fontWeight: '700',
      color: '#344054',
    },

    fileMeta: {
      marginTop: 4,
      fontSize: 11,
      color: '#98A2B3',
    },

    protectedText: {
      marginTop: 5,
      fontSize: 11,
      fontWeight: '600',
      color: '#2F75B5',
    },

    primaryButton: {
      width: '100%',
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 28,
      borderRadius: 12,
      backgroundColor: '#17365D',
    },

    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    secondaryButton: {
      width: '100%',
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

    errorBackButton: {
      marginTop: 12,
    },

    backButton: {
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 28,
      borderWidth: 1,
      borderColor: '#D0D5DD',
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
    },

    backButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#17365D',
    },

    previewOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0, 0, 0, 0.96)',
    },

    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      gap: 16,
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
    },

    previewFileName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    previewCloseButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },

    previewClosePressed: {
      opacity: 0.65,
    },

    previewCloseText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    previewContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingBottom: 40,
    },

    previewImage: {
      width: '100%',
      height: '100%',
    },

    previewPlaceholder: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },

    previewLoadingText: {
      marginTop: 12,
      fontSize: 14,
      color: '#FFFFFF',
    },

    previewErrorText: {
      paddingHorizontal: 24,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      color: '#FFFFFF',
    },

    buttonPressed: {
      opacity: 0.88,
    },
  });