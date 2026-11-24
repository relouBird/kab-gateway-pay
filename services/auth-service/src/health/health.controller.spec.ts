import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns the liveness status', () => {
    expect(new HealthController().getHealth()).toEqual({ status: 'ok' });
  });
});
