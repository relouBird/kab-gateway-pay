import type { OpenAPIObject } from '@nestjs/swagger';

const httpMethods = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
] as const;

const securityPairs = [
  ['bearer', 'step_up_proof'],
  ['service_client', 'service_secret'],
] as const;

export function normalizeOpenApiSecurity(paths: OpenAPIObject['paths']): void {
  for (const pathItem of Object.values(paths)) {
    if (!pathItem || '$ref' in pathItem) continue;

    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (!operation?.security) continue;

      const names = operation.security.flatMap((requirement) =>
        Object.keys(requirement),
      );
      const pair = securityPairs.find((required) =>
        required.every((name) => names.includes(name)),
      );
      if (pair) {
        operation.security = [
          Object.fromEntries(pair.map((name) => [name, []])),
        ];
        continue;
      }

      if (
        ['csrf_token', 'kgpay_refresh'].every((name) => names.includes(name))
      ) {
        operation.security = [{ kgpay_refresh: [], csrf_token: [] }, {}];
        operation.description = [
          operation.description,
          'Use the refresh cookie with its matching CSRF cookie and header, or provide refreshToken in the request body.',
        ]
          .filter(Boolean)
          .join('\n\n');
      }
    }
  }
}
