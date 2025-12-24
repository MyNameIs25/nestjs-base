import mailgunTransport from 'nodemailer-mailgun-transport';

export function createMailgunTransport(domain: string, apiKey: string) {
  return mailgunTransport({
    auth: {
      api_key: apiKey,
      domain: domain,
    },
  });
}