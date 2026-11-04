const BOT_REGEX =
  /bot|crawler|spider|crawling|headlesschrome|lighthouse|pingdom|gtmetrix|uptime|slurp|bingpreview|facebookexternalhit|discordbot|whatsapp|telegrambot/i;

export function isBot(ua: string | null | undefined): boolean {
  if (!ua || !ua.trim()) return true;
  return BOT_REGEX.test(ua);
}

export function deviceOf(ua: string | null | undefined): 'mobile' | 'tablet' | 'desktop' {
  if (!ua) return 'desktop';
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

