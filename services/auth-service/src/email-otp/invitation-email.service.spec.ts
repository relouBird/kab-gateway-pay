import { InvitationEmailService } from './invitation-email.service';
import type { EmailMessage, EmailTransport } from './email-otp.types';

describe('InvitationEmailService', () => {
  let transport: EmailTransport;
  let sentMessages: EmailMessage[];
  let service: InvitationEmailService;

  beforeEach(() => {
    sentMessages = [];
    transport = {
      sendMail: async (message) => {
        sentMessages.push(message);
      },
    };
    service = new InvitationEmailService(transport, 'no-reply@kgpay.local');
  });

  it('sends an invitation without a link when the staff portal is not configured', async () => {
    await service.send('staff@example.com', 'one-time-token', 48, 'fr');

    expect(sentMessages.at(0)).toMatchObject({
      subject: 'Votre invitation KG Pay',
      text: expect.stringContaining('one-time-token'),
      html: expect.stringContaining('one-time-token'),
    });
    expect(sentMessages.at(0)?.html).not.toContain('<a href=');
  });

  it('includes an optional staff invitation link while keeping the token in the message', async () => {
    await service.send(
      'staff@example.com',
      'one-time-token',
      48,
      'en',
      'https://staff.example.com/staff',
    );

    expect(sentMessages.at(0)).toMatchObject({
      subject: 'Your KG Pay staff invitation',
      text: expect.stringContaining(
        'https://staff.example.com/staff/accept-invitation',
      ),
      html: expect.stringContaining(
        'href="https://staff.example.com/staff/accept-invitation"',
      ),
    });
    expect(sentMessages.at(0)?.html).toContain('one-time-token');
  });
});
