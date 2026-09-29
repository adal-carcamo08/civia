const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

const DEFAULT_TIMEOUT_MS = 15000;
const AI_TIMEOUT_MS = 65000;

export class ApiError extends Error {
  status: number;

  constructor(
    status: number,
    message: string
  ) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
  }
}

export class ApiNetworkError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'ApiNetworkError';
  }
}

type ApiRequestOptions = RequestInit & {
  timeoutMs?: number;
  retryOnNetworkError?: boolean;
};

function normalizePath(path: string) {
  return path.startsWith('/')
    ? path
    : `/${path}`;
}

export function buildApiUrl(path: string) {
  if (!apiUrl) {
    throw new ApiNetworkError(
      'La URL de la API no está configurada.'
    );
  }

  return `${apiUrl}${normalizePath(path)}`;
}

function extractApiErrorMessage(
  rawBody: string,
  status: number
) {
  if (!rawBody) {
    return `No se pudo completar la solicitud (${status}).`;
  }

  try {
    const parsed = JSON.parse(rawBody) as {
      message?: string | string[];
    };

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(' ');
    }

    if (
      typeof parsed.message === 'string' &&
      parsed.message.trim()
    ) {
      return parsed.message;
    }
  } catch {
    // Si no es JSON, usamos el texto recibido.
  }

  return rawBody;
}

async function executeRequest<T>(
  path: string,
  options: ApiRequestOptions,
  allowRetry: boolean
): Promise<T> {
  const normalizedPath = normalizePath(path);

  const method =
    (options.method ?? 'GET').toUpperCase();

  const {
    timeoutMs,
    retryOnNetworkError,
    signal: externalSignal,
    ...fetchOptions
  } = options;

  const effectiveTimeout =
    timeoutMs ??
    (
      normalizedPath.startsWith('/ai/')
        ? AI_TIMEOUT_MS
        : DEFAULT_TIMEOUT_MS
    );

  const shouldRetry =
    retryOnNetworkError ??
    method === 'GET';

  const controller =
    new AbortController();

  const abortFromExternalSignal = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener(
        'abort',
        abortFromExternalSignal,
        { once: true }
      );
    }
  }

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    effectiveTimeout
  );

  const headers =
    new Headers(fetchOptions.headers);

  if (
    fetchOptions.body &&
    !(fetchOptions.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set(
      'Content-Type',
      'application/json'
    );
  }

  try {
    const response = await fetch(
      buildApiUrl(normalizedPath),
      {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const rawBody =
        await response.text();

      throw new ApiError(
        response.status,
        extractApiErrorMessage(
          rawBody,
          response.status
        )
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (
      await response.json()
    ) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const canceledExternally =
      externalSignal?.aborted === true;

    const timedOut =
      controller.signal.aborted &&
      !canceledExternally;

    if (
      allowRetry &&
      shouldRetry &&
      method === 'GET' &&
      !canceledExternally
    ) {
      await new Promise<void>(
        (resolve) => {
          setTimeout(resolve, 350);
        }
      );

      return executeRequest<T>(
        path,
        {
          ...options,
          retryOnNetworkError: false,
        },
        false
      );
    }

    if (timedOut) {
      throw new ApiNetworkError(
        normalizedPath.startsWith('/ai/')
          ? 'El análisis de CIVIA está tardando más de lo esperado. Inténtalo nuevamente.'
          : 'La solicitud tardó demasiado. Inténtalo nuevamente.'
      );
    }

    if (canceledExternally) {
      throw new ApiNetworkError(
        'La solicitud fue cancelada.'
      );
    }

    throw new ApiNetworkError(
      'No pudimos conectarnos con CIVIA. Verifica la conexión e inténtalo nuevamente.'
    );
  } finally {
    clearTimeout(timeoutId);

    if (externalSignal) {
      externalSignal.removeEventListener(
        'abort',
        abortFromExternalSignal
      );
    }
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return executeRequest<T>(
    path,
    options,
    true
  );
}