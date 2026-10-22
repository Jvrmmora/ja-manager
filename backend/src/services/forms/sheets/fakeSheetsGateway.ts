import { SheetsError, SheetsGateway } from './types';

/** Implementación en memoria para pruebas. */
export class FakeSheetsGateway implements SheetsGateway {
  sheets = new Map<string, string[][]>();
  failNext: SheetsError | null = null;
  calls: string[] = [];

  private key(spreadsheetId: string, sheetName: string) {
    return `${spreadsheetId}::${sheetName}`;
  }

  private maybeFail(call: string) {
    this.calls.push(call);
    if (this.failNext) {
      const error = this.failNext;
      this.failNext = null;
      throw error;
    }
  }

  async getSpreadsheetTitle(spreadsheetId: string) {
    this.maybeFail('getSpreadsheetTitle');
    return `Hoja ${spreadsheetId}`;
  }

  async ensureSheet(spreadsheetId: string, sheetName: string) {
    this.maybeFail('ensureSheet');
    const key = this.key(spreadsheetId, sheetName);
    if (!this.sheets.has(key)) this.sheets.set(key, []);
  }

  async replaceAll(spreadsheetId: string, sheetName: string, rows: string[][]) {
    this.maybeFail('replaceAll');
    this.sheets.set(this.key(spreadsheetId, sheetName), rows.map(r => [...r]));
  }

  async appendRows(spreadsheetId: string, sheetName: string, rows: string[][]) {
    this.maybeFail('appendRows');
    const key = this.key(spreadsheetId, sheetName);
    this.sheets.set(key, [...(this.sheets.get(key) || []), ...rows.map(r => [...r])]);
  }

  rows(spreadsheetId: string, sheetName = 'Respuestas') {
    return this.sheets.get(this.key(spreadsheetId, sheetName)) || [];
  }
}
