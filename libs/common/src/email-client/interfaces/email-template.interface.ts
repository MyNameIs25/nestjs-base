export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export type TemplateData = Record<string, string | undefined>;

export type TemplateFunction<T extends TemplateData = TemplateData> = (
  data: T,
) => EmailContent;
