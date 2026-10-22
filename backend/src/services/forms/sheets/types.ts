/**
 * Puerto hacia la hoja de cálculo. La implementación real habla con Google
 * Sheets; las pruebas usan una falsa en memoria (igual que emailProviders).
 */
export interface SheetsGateway {
  /** Verifica acceso y devuelve el título del documento. */
  getSpreadsheetTitle(spreadsheetId: string): Promise<string>;
  /** Crea la pestaña si no existe. */
  ensureSheet(spreadsheetId: string, sheetName: string): Promise<void>;
  /** Reemplaza todo el contenido de la pestaña por `rows`. */
  replaceAll(spreadsheetId: string, sheetName: string, rows: string[][]): Promise<void>;
  /** Agrega filas al final. */
  appendRows(spreadsheetId: string, sheetName: string, rows: string[][]): Promise<void>;
}

/** Error de Sheets con un mensaje apto para mostrar al admin. */
export class SheetsError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'SheetsError';
  }
}
