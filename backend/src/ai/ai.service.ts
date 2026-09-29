import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ReportSuggestionDto } from './dto/report-suggestion.dto';

type AiClassificationResponse = {
  intent: string;

  domain: string;
  problem_type: string;
  problem_label: string;

  suggested_category_id: string;
  suggested_category_name: string;

  suggested_department_id: string | null;
  suggested_department_name: string | null;

  priority: 'LOW' | 'MEDIUM' | 'HIGH';

  detection_confidence: number;
  category_match_confidence: number;
  confidence: number;

  model: string;
  classification_mode: string;
};

@Injectable()
export class AiService {
  private readonly logger =
    new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async suggestReport(
    userId: string,
    dto: ReportSuggestionDto,
  ) {
    const membership =
      await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: dto.organizationId,
          },
        },
        select: {
          status: true,
        },
      });

    if (
      !membership ||
      membership.status !== 'ACTIVE'
    ) {
      throw new ForbiddenException(
        'Debes ser miembro activo de la organización para utilizar la sugerencia de CIVIA.',
      );
    }

    const organization =
      await this.prisma.organization.findFirst({
        where: {
          id: dto.organizationId,
          active: true,
        },
        select: {
          id: true,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organización no encontrada.',
      );
    }

    const categories =
      await this.prisma.category.findMany({
        where: {
          organizationId: dto.organizationId,
          active: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

    if (categories.length === 0) {
      throw new NotFoundException(
        'La organización no tiene categorías activas.',
      );
    }

    const aiUrl =
      this.configService.get<string>(
        'AI_SERVICE_URL',
      ) ?? 'http://127.0.0.1:8001';

    const images = (dto.images ?? []).map(
      (image) => ({
        mime_type: image.mime_type,
        data_base64:
          image.data_base64.trim(),
      }),
    );

    this.logger.log(
      `Enviando análisis a CIVIA IA. imágenes=${images.length}`,
    );

    let response: Response;

    try {
      response = await fetch(
        `${aiUrl}/classify`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            description:
              dto.description.trim(),
            categories:
              categories.map(
                (category) => ({
                  id: category.id,
                  name: category.name,
                  description:
                    category.description,
                  department_id:
                    category.department?.id ??
                    null,
                  department_name:
                    category.department?.name ??
                    null,
                }),
              ),
            images,
          }),
          signal:
            AbortSignal.timeout(90000),
        },
      );
    } catch (error) {
      this.logger.error(
        'No fue posible conectar con el microservicio de IA.',
        error instanceof Error
          ? error.stack
          : undefined,
      );

      throw new BadGatewayException(
        'El servicio de inteligencia de CIVIA no está disponible.',
      );
    }

    if (!response.ok) {
      const detail =
        (await response.text())
          .slice(0, 1200);

      this.logger.warn(
        `CIVIA IA respondió HTTP ${response.status}: ${detail}`,
      );

      throw new BadGatewayException(
        'El servicio de inteligencia de CIVIA no pudo procesar la solicitud.',
      );
    }

    let data: AiClassificationResponse;

    try {
      data =
        (await response.json()) as AiClassificationResponse;
    } catch {
      this.logger.error(
        'CIVIA IA devolvió una respuesta JSON inválida.',
      );

      throw new BadGatewayException(
        'El servicio de inteligencia de CIVIA devolvió una respuesta inválida.',
      );
    }

    const suggestedCategory =
      categories.find(
        (category) =>
          category.id ===
          data.suggested_category_id,
      );

    if (!suggestedCategory) {
      throw new BadGatewayException(
        'La IA devolvió una categoría que no pertenece a la organización.',
      );
    }

    return {
      intent: data.intent,

      domain: data.domain,
      problemType: data.problem_type,
      problemLabel: data.problem_label,

      suggestedCategory: {
        id: suggestedCategory.id,
        name: suggestedCategory.name,
      },

      suggestedDepartment:
        suggestedCategory.department
          ? {
              id:
                suggestedCategory
                  .department.id,
              name:
                suggestedCategory
                  .department.name,
            }
          : null,

      priority: data.priority,

      detectionConfidence:
        data.detection_confidence,

      categoryMatchConfidence:
        data.category_match_confidence,

      confidence: data.confidence,

      model: data.model,
      classificationMode:
        data.classification_mode,
    };
  }
}
