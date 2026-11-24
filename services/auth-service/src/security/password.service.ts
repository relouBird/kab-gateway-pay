import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';

const COMMON_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'password123',
  'qwerty',
  'qwertyuiop',
  'qwerty123',
  'letmein',
  'welcome',
  'welcome1',
  'admin',
  'admin123',
  'abc123',
  'iloveyou',
  'monkey',
  'dragon',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'trustno1',
  'passw0rd',
  'p@ssword',
  '123qwe',
  'default',
  'login',
  'changeme',
  'p@ssw0rd',
]);

@Injectable()
export class PasswordService {
  private readonly dummyHash = argon2.hash(randomBytes(32).toString('hex'), {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  constructor(private readonly minimumLength: number) {}

  validate(password: string): void {
    if (password.length < this.minimumLength) {
      throw new BadRequestException(
        `Password must contain at least ${this.minimumLength} characters.`,
      );
    }
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      throw new BadRequestException(
        'Choose a password that is not commonly used.',
      );
    }
  }

  hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  async burnForUnknownIdentity(password: string): Promise<void> {
    await argon2.verify(await this.dummyHash, password);
  }
}
