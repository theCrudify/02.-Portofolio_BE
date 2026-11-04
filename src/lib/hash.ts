export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuffer);
  let hex = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    hex += (bytes[i] ?? 0).toString(16).padStart(2, '0');
  }
  return hex;
}

export async function ipHash(ip: string, salt: string): Promise<string> {
  return sha256Hex(`${ip}:${salt}`);
}

export async function visitorHash(
  ip: string,
  userAgent: string,
  utcDate: string,
  salt: string,
): Promise<string> {
  return sha256Hex(`${ip}:${userAgent}:${utcDate}:${salt}`);
}
