const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

const API_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(
    status: number,
    message: string,
    responseBody: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.responseBody = responseBody;
  }
}

export class ApiNetworkError extends Error {
  readonly kind: 'NETWORK' | 'TIMEOUT';

  constructor(
    kind: 'NETWORK' | 'TIMEOUT',
    message: string
  ) {
    super(message);
    this.name = 'ApiNetworkError';
    this.kind = kind;
  }
}

function getErrorMessage(
  responseBody: string,
  status: number
): string {
  if (responseBody) {
    try {
      const parsed = JSON.parse(responseBody) as {
        message?: string | string[];
      };

      if (Array.isArray(parsed.message)) {
        return parsed.message.join(' ');
      }

      if (typeof parsed.message === 'string') {
        return parsed.message;
      }
    } catch {
      return responseBody;
    }

    return responseBody;
  }

  return `No se pudo completar la solicitud (${status}).`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!apiUrl) {
    throw new Error('La URL de la API no está configurada.');
  }

  const normalizedPath = path.startsWith('/')
    ? path
    : `/${path}`;

  const headers = new Headers(options.headers);

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, API_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(
      `${apiUrl}${normalizedPath}`,
      {
        ...options,
        headers,
        signal: controller.signal,
      }
    );
  } catch {
    if (controller.signal.aborted) {
      throw new ApiNetworkError(
        'TIMEOUT',
        'La solicitud tardó demasiado en responder.'
      );
    }

    throw new ApiNetworkError(
      'NETWORK',
      'No fue posible conectarse con el servidor.'
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const responseBody = await response.text();

    throw new ApiError(
      response.status,
      getErrorMessage(responseBody, response.status),
      responseBody
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}