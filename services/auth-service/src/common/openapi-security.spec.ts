import type { OpenAPIObject } from '@nestjs/swagger';
import { normalizeOpenApiSecurity } from './openapi-security';

describe('normalizeOpenApiSecurity', () => {
  it('documents bearer and step-up proof as jointly required', () => {
    const paths: OpenAPIObject['paths'] = {
      '/auth/email/change': {
        post: {
          responses: { '204': { description: 'No content' } },
          security: [{ bearer: [] }, { step_up_proof: [] }],
        },
      },
    };

    normalizeOpenApiSecurity(paths);

    expect(paths['/auth/email/change']?.post?.security).toEqual([
      { bearer: [], step_up_proof: [] },
    ]);
  });

  it('documents service client credentials as jointly required', () => {
    const paths: OpenAPIObject['paths'] = {
      '/internal/introspect': {
        post: {
          responses: { '200': { description: 'OK' } },
          security: [{ service_secret: [] }, { service_client: [] }],
        },
      },
    };

    normalizeOpenApiSecurity(paths);

    expect(paths['/internal/introspect']?.post?.security).toEqual([
      { service_client: [], service_secret: [] },
    ]);
  });

  it('documents cookie refresh and body refresh as distinct alternatives', () => {
    const paths: OpenAPIObject['paths'] = {
      '/auth/refresh': {
        post: {
          description: 'Rotate the refresh token.',
          responses: { '200': { description: 'OK' } },
          security: [{ csrf_token: [] }, { kgpay_refresh: [] }],
        },
      },
    };

    normalizeOpenApiSecurity(paths);

    expect(paths['/auth/refresh']?.post?.security).toEqual([
      { kgpay_refresh: [], csrf_token: [] },
      {},
    ]);
    expect(paths['/auth/refresh']?.post?.description).toContain(
      'provide refreshToken in the request body',
    );
  });
});
