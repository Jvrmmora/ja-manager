import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { GoogleSheetsGateway } from './googleSheetsGateway';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const credentials = { clientEmail: 'bot@ja.iam.gserviceaccount.com', privateKey };

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe('GoogleSheetsGateway', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('firma el JWT de la cuenta de servicio y reutiliza el token', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'tok', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse(200, { properties: { title: 'Bolos' } }))
      .mockResolvedValueOnce(jsonResponse(200, { properties: { title: 'Bolos' } }));

    const gateway = new GoogleSheetsGateway(credentials);
    expect(await gateway.getSpreadsheetTitle('abc')).toBe('Bolos');
    await gateway.getSpreadsheetTitle('abc');

    // 1 token + 2 llamadas: el token no se pidió dos veces
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    const claims = jwt.verify(body.get('assertion')!, publicKey, { algorithms: ['RS256'] }) as any;
    expect(claims).toMatchObject({
      iss: credentials.clientEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
    });
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer tok');
  });

  it('403 → explica con quién compartir la hoja', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'tok', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse(403, { error: { message: 'forbidden' } }));

    await expect(new GoogleSheetsGateway(credentials).getSpreadsheetTitle('abc')).rejects.toThrow(
      'Compártela con bot@ja.iam.gserviceaccount.com como Editor'
    );
  });

  it('credenciales inválidas → mensaje claro', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: 'invalid_grant' }));
    await expect(new GoogleSheetsGateway(credentials).getSpreadsheetTitle('abc')).rejects.toThrow(
      /credenciales de Google no son válidas/
    );
  });

  it('ensureSheet crea la pestaña solo si no existe y escapa el nombre en los rangos', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'tok', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse(200, { sheets: [{ properties: { title: 'Hoja 1' } }] }))
      .mockResolvedValueOnce(jsonResponse(200, {}))
      .mockResolvedValueOnce(jsonResponse(200, {}));

    const gateway = new GoogleSheetsGateway(credentials);
    await gateway.ensureSheet('abc', 'Respuestas');
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      requests: [{ addSheet: { properties: { title: 'Respuestas' } } }],
    });

    await gateway.appendRows('abc', "Jóvenes' sheet", [['a']]);
    expect(fetchMock.mock.calls[3][0]).toContain(encodeURIComponent("'Jóvenes'' sheet'!A1"));
  });
});
