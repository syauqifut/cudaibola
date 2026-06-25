const TECHNICAL_ERROR_PATTERN =
  /(\bat\s+\w+\(|\.tsx?:|\.js?:|ECONNREFUSED|SyntaxError|TypeError:|Unexpected token|<!DOCTYPE)/i;

/** Map error ke pesan aman untuk UI — jangan bocorkan stack trace atau detail teknis. */
export function toUserMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message || TECHNICAL_ERROR_PATTERN.test(message)) {
    return fallback;
  }

  return message;
}
