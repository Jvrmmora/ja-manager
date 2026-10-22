import jwt from 'jsonwebtoken';
import { SheetsError, SheetsGateway } from './types';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

interface Credentials {
  clientEmail: string;
  privateKey: string;
}

/**
 * Cliente mínimo de Google Sheets con cuenta de servicio, sin SDK: firma el
 * JWT con jsonwebtoken (ya es dependencia), lo cambia por un access token y
 * usa la REST API v4 con fetch. El token se reutiliza hasta 1 min antes de
 * que venza.
 */
export class GoogleSheetsGateway implements SheetsGateway {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly credentials: Credentials) {}

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) return this.token.value;

    const now = Math.floor(Date.now() / 1000);
    const assertion = jwt.sign(
      { iss: this.credentials.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 },
      this.credentials.privateKey,
      { algorithm: 'RS256' }
    );
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
    const body: any = await response.json().catch(() => ({}));
    if (!response.ok || !body.access_token) {
      throw new SheetsError('Las credenciales de Google no son válidas. Revisa la cuenta de servicio.', response.status);
    }
    this.token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
    return this.token.value;
  }

  private async call(path: string, init: RequestInit = {}): Promise<any> {
    const response = await fetch(`${API}/${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${await this.accessToken()}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const body: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 403) {
        throw new SheetsError(
          `No tenemos permiso sobre esa hoja. Compártela con ${this.credentials.clientEmail} como Editor.`,
          403
        );
      }
      if (response.status === 404) throw new SheetsError('No encontramos esa hoja. Revisa el enlace.', 404);
      throw new SheetsError(body?.error?.message || `Google Sheets respondió ${response.status}`, response.status);
    }
    return body;
  }

  private range(sheetName: string, cells = 'A1') {
    return encodeURIComponent(`'${sheetName.replace(/'/g, "''")}'!${cells}`);
  }

  async getSpreadsheetTitle(spreadsheetId: string): Promise<string> {
    const body = await this.call(`${encodeURIComponent(spreadsheetId)}?fields=properties.title`);
    return body?.properties?.title ?? '';
  }

  async ensureSheet(spreadsheetId: string, sheetName: string): Promise<void> {
    const id = encodeURIComponent(spreadsheetId);
    const body = await this.call(`${id}?fields=sheets.properties.title`);
    const exists = (body?.sheets || []).some((s: any) => s?.properties?.title === sheetName);
    if (exists) return;
    await this.call(`${id}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] }),
    });
  }

  async replaceAll(spreadsheetId: string, sheetName: string, rows: string[][]): Promise<void> {
    const id = encodeURIComponent(spreadsheetId);
    await this.call(`${id}/values/${this.range(sheetName, 'A:ZZ')}:clear`, { method: 'POST', body: '{}' });
    await this.call(`${id}/values/${this.range(sheetName)}?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({ values: rows }),
    });
  }

  async appendRows(spreadsheetId: string, sheetName: string, rows: string[][]): Promise<void> {
    const id = encodeURIComponent(spreadsheetId);
    await this.call(
      `${id}/values/${this.range(sheetName)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: 'POST', body: JSON.stringify({ values: rows }) }
    );
  }
}
