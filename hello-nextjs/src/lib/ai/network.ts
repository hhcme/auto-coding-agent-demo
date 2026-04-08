/**
 * Shared network guards for external AI integrations.
 * These prevent accidental data exfiltration to arbitrary endpoints and
 * block obvious SSRF-style download targets.
 */

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function parseUrl(rawUrl: string, label: string): URL {
  try {
    return new URL(rawUrl);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
}

function isPrivateIpv4(hostname: string): boolean {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return false;
  }

  const octets = hostname.split(".").map((part) => Number(part));
  if (octets.length !== 4 || octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isBlockedHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    LOOPBACK_HOSTS.has(normalized) ||
    normalized.endsWith(".local") ||
    isPrivateIpv4(normalized)
  );
}

export function resolveAllowedApiBaseUrl(
  rawValue: string | undefined,
  fallback: string,
  allowedHosts: string[],
  envVarName: string,
): string {
  const url = parseUrl((rawValue ?? fallback).trim(), envVarName);

  if (url.protocol !== "https:") {
    throw new Error(`${envVarName} must use https`);
  }

  if (!allowedHosts.includes(url.hostname)) {
    throw new Error(
      `${envVarName} must use an approved host: ${allowedHosts.join(", ")}`,
    );
  }

  return url.toString().replace(/\/+$/, "");
}

export function assertSafeDownloadUrl(rawUrl: string, label: string): string {
  const url = parseUrl(rawUrl, label);

  if (url.protocol !== "https:") {
    throw new Error(`${label} must use https`);
  }

  if (url.username || url.password) {
    throw new Error(`${label} must not include credentials`);
  }

  if (isBlockedHost(url.hostname)) {
    throw new Error(`${label} points to a blocked host`);
  }

  return url.toString();
}
