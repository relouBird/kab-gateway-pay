import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService(10);

  it('rejects short and commonly used passwords', () => {
    expect(() => service.validate('short')).toThrow(
      'Password must contain at least 10 characters.',
    );
    expect(() => service.validate('Password123')).toThrow(
      'Choose a password that is not commonly used.',
    );
  });

  it('hashes passwords with a one-way Argon2id hash', async () => {
    const password = 'a-long-unique-passphrase';
    const hash = await service.hash(password);

    expect(hash).not.toBe(password);
    await expect(service.verify(hash, password)).resolves.toBe(true);
    await expect(service.verify(hash, 'a-different-passphrase')).resolves.toBe(
      false,
    );
  });
});
