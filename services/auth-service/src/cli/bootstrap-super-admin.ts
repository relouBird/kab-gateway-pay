import { BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createInterface } from 'node:readline';
import { AuthService } from '../auth/auth.service';
import { loadEnvironment } from '../config/environment';
import { AppModule } from '../app.module';

async function main(): Promise<void> {
  loadEnvironment();
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const auth = app.get(AuthService);
    const email = await prompt(
      'Adresse e-mail du premier super-administrateur : ',
    );
    const phone = await prompt('Téléphone de contact (non vérifié) : ');
    const password = await promptHidden('Mot de passe : ');
    const confirmation = await promptHidden('Confirmer le mot de passe : ');
    if (password !== confirmation) {
      throw new Error('Les mots de passe ne correspondent pas.');
    }

    const { identityId, challengeId } = await auth.bootstrapSuperAdmin(
      { email, phone, password },
      'fr',
    );
    process.stdout.write(
      `Code envoyé par e-mail. Identifiant de défi : ${challengeId}\n`,
    );
    process.stdout.write(
      `Après vérification, l'identité ${identityId} pourra se connecter via OTP e-mail.\n`,
    );

    const attempts = Number(process.env.OTP_MAX_ATTEMPTS);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const code = await promptHidden('Code OTP reçu par e-mail : ');
      try {
        await auth.verifyContact(
          { challengeId, code },
          {
            correlationId: `bootstrap-${identityId}`,
            ipAddress: null,
            userAgent: 'bootstrap-cli',
          },
        );
        process.stdout.write(
          'Premier GLOBAL_SUPER_ADMIN créé et adresse vérifiée. Connectez-vous via /docs.\n',
        );
        return;
      } catch (error) {
        if (!(error instanceof BadRequestException)) {
          throw error;
        }
        process.stdout.write('Code invalide ou expiré.\n');
      }
    }
    throw new Error(
      `Limite d'essais atteinte. Utilisez POST /auth/otp/resend avec le défi ${challengeId}.`,
    );
  } finally {
    await app.close();
  }
}

function prompt(label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    readline.question(label, (answer) => {
      readline.close();
      const value = answer.trim();
      if (!value) {
        reject(new Error('Une valeur est requise.'));
      } else {
        resolve(value);
      }
    });
  });
}

function promptHidden(label: string): Promise<string> {
  const input = process.stdin;
  if (!input.isTTY || !input.setRawMode) {
    return Promise.reject(
      new Error('La saisie masquée exige un terminal interactif.'),
    );
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      input.removeListener('data', onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
    };
    const onData = (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      if (text === '\u0003') {
        cleanup();
        reject(new Error('Opération annulée.'));
      } else if (text === '\r' || text === '\n') {
        cleanup();
        resolve(value);
      } else if (text === '\u007f' || text === '\b') {
        value = Array.from(value).slice(0, -1).join('');
      } else {
        value += text;
      }
    };

    process.stdout.write(label);
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Bootstrap failed.'}\n`,
  );
  process.exitCode = 1;
});
