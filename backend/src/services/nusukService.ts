import { prisma } from '../lib/prisma';
import axios from 'axios';
import * as XLSX from 'xlsx';
import puppeteer from 'puppeteer';
import { randomUUID } from 'crypto';

function toSqlLiteral(val: any): string {
  if (val === undefined || val === null) {
    return 'NULL';
  }
  if (typeof val === 'boolean') {
    return val ? '1' : '0';
  }
  if (typeof val === 'number') {
    return isNaN(val) ? 'NULL' : String(val);
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? 'NULL' : String(val.getTime());
  }
  const str = String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

// Utility to clean and extract carrier and numbers from flight number
function cleanFlightNumber(flightNum: string): { carrier: string; number: string } {
  const clean = (flightNum || '').replace(/[\s-]/g, '').toUpperCase();
  
  // Try 3-letter carrier followed by digits (e.g. UAE012)
  const match3 = clean.match(/^([A-Z]{3})(\d+)$/);
  if (match3) {
    return { carrier: match3[1], number: String(parseInt(match3[2], 10)) };
  }
  
  // Try 2-char alphanumeric carrier followed by digits (e.g. 6E0065, WY123)
  const match2 = clean.match(/^([A-Z0-9]{2})(\d+)$/);
  if (match2) {
    return { carrier: match2[1], number: String(parseInt(match2[2], 10)) };
  }
  
  // Fallback: split by trailing digits
  const matchFallback = clean.match(/^([A-Z0-9]+?)(\d+)$/);
  if (matchFallback) {
    return { carrier: matchFallback[1], number: String(parseInt(matchFallback[2], 10)) };
  }
  
  return { carrier: clean, number: '' };
}

// Utility to compare two flight numbers robustly
function isFlightNumberMatch(flight1: string | null | undefined, flight2: string | null | undefined): boolean {
  if (!flight1 && !flight2) return true;
  if (!flight1 || !flight2) return false;

  const parse = (f: string) => {
    const clean = f.replace(/[^A-Z0-9]/g, '').toUpperCase();
    const digitsMatch = clean.match(/\d+$/);
    const digits = digitsMatch ? digitsMatch[0] : '';
    const numberVal = digits ? parseInt(digits, 10) : null;
    const carrier = digitsMatch ? clean.substring(0, clean.length - digits.length) : clean;
    return {
      carrier,
      number: numberVal
    };
  };

  const p1 = parse(flight1);
  const p2 = parse(flight2);

  if (p1.number === null || p2.number === null) {
    return flight1.replace(/[^A-Z0-9]/g, '').toUpperCase() === flight2.replace(/[^A-Z0-9]/g, '').toUpperCase();
  }

  if (p1.number !== p2.number) {
    return false;
  }

  if (p1.carrier && p2.carrier) {
    const iataToIcao: Record<string, string> = {
      'SV': 'SVA', 'EK': 'UAE', 'WY': 'OMA', 'QR': 'QTR', 'EY': 'ETD',
      'XY': 'KNE', 'FZ': 'FDB', 'G9': 'ABY', 'MS': 'MSR', 'KU': 'KAC',
      'GF': 'GFA', 'J9': 'JZR', 'BG': 'BBC', 'AI': 'AIC', 'IX': 'AXB',
      '6E': 'IGO'
    };
    const norm = (c: string) => iataToIcao[c] || c;
    return norm(p1.carrier) === norm(p2.carrier);
  }

  return true;
}

// Utility for generous airport name matching
function isAirportSimilar(nameDb: string | null | undefined, nameExcel: string | null | undefined): boolean {
  if (!nameDb || !nameExcel) return false;
  
  const cleanDb = nameDb.toLowerCase();
  const cleanExcel = nameExcel.toLowerCase();

  const getAirportKey = (name: string): string => {
    if (name.includes('jed') || name.includes('jidd') || name.includes('abdulaziz') || name.includes('abdul aziz')) {
      return 'jeddah';
    }
    if (name.includes('med') || name.includes('mad') || name.includes('moham') || name.includes('muham')) {
      return 'madinah';
    }
    if (name.includes('yan') || name.includes('ynb') || name.includes('mohsin')) {
      return 'yanbu';
    }
    if (name.includes('riy') || name.includes('ruh') || name.includes('khalid')) {
      return 'riyadh';
    }
    if (name.includes('dam') || name.includes('dmm') || name.includes('fahd')) {
      return 'dammam';
    }
    return name.replace(/[^a-z0-9]/g, '');
  };

  const keyDb = getAirportKey(cleanDb);
  const keyExcel = getAirportKey(cleanExcel);

  if (keyDb === keyExcel) return true;

  const getLevenshteinDistance = (a: string, b: string): number => {
    const tmp: number[][] = [];
    for (let i = 0; i <= a.length; i++) tmp[i] = [i];
    for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        tmp[i][j] = Math.min(
          tmp[i - 1][j] + 1,
          tmp[i][j - 1] + 1,
          tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return tmp[a.length][b.length];
  };

  if (keyDb.length >= 4 && keyExcel.length >= 4) {
    const dist = getLevenshteinDistance(keyDb, keyExcel);
    if (dist <= 2) return true;
  }

  return false;
}

// Utility to parse dates and times from spreadsheet cells or API dates
function parseExcelDate(dateVal: any, timeVal?: any): Date | null {
  if (!dateVal) return null;
  
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }

  if (typeof dateVal === 'number') {
    const dateObj = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
    if (typeof timeVal === 'number') {
      dateObj.setMilliseconds(dateObj.getMilliseconds() + Math.round(timeVal * 86400 * 1000));
    }
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  const dateStr = String(dateVal).trim();
  const timeStr = timeVal ? String(timeVal).trim() : '';

  // 1. Handle ISO / API date formats e.g. "2026-07-12T20:31:28" or "2026-07-12T00:00:00"
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const ymd = dateStr.slice(0, 10);
    let timePart = '00:00:00';
    if (dateStr.length >= 19 && dateStr.includes('T')) {
      timePart = dateStr.slice(11, 19);
    } else if (timeStr && /^\d{1,2}:\d{2}/.test(timeStr)) {
      const parts = timeStr.split(':');
      const h = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const s = (parts[2] || '00').padStart(2, '0');
      timePart = `${h}:${m}:${s}`;
    }
    // Nusuk reports are in Saudi Time AST (+03:00)
    const saudiIso = `${ymd}T${timePart}+03:00`;
    const parsed = new Date(saudiIso);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // 2. Parse DD/MM/YYYY or YYYY-MM-DD
  const cleanDateStr = dateStr.split(/[\s\u202f\u00a0]+/)[0];
  let year = 0, month = 0, day = 0;
  if (cleanDateStr.includes('/')) {
    const parts = cleanDateStr.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      } else if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      }
    }
  } else if (cleanDateStr.includes('-')) {
    const parts = cleanDateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    }
  }
  
  if (!year || isNaN(year) || !day || isNaN(day)) return null;
  
  let hour = 0, minute = 0;
  if (timeVal) {
    const cleanTimeStr = String(timeVal).trim();
    if (typeof timeVal === 'number') {
      const totalSeconds = Math.round(timeVal * 86400);
      hour = Math.floor(totalSeconds / 3600);
      minute = Math.floor((totalSeconds % 3600) / 60);
    } else {
      const timeOnlyStr = cleanTimeStr.includes(' ') || cleanTimeStr.includes('\u202f') || cleanTimeStr.includes('\u00a0')
        ? cleanTimeStr.split(/[\s\u202f\u00a0]+/)[1]
        : cleanTimeStr;
      const matches = timeOnlyStr.match(/(\d{1,2})[.:](\d{2})/);
      if (matches) {
        hour = parseInt(matches[1], 10);
        minute = parseInt(matches[2], 10);
      } else if (timeOnlyStr.length === 4 && !isNaN(Number(timeOnlyStr))) {
        hour = parseInt(timeOnlyStr.substring(0, 2), 10);
        minute = parseInt(timeOnlyStr.substring(2, 4), 10);
      }
    }
  }
  
  // Convert Saudi Time (UTC+3) to standard UTC date
  const utcHours = hour - 3;
  return new Date(Date.UTC(year, month, day, utcHours, minute, 0));
}

// Case-insensitive key lookup helper for excel / dynamic rows
function getRowValue(row: any, keys: string[]): any {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
    const cleanKey = key.toLowerCase().replace(/[\s_-]+/g, '');
    for (const rowKey of Object.keys(row)) {
      if (rowKey.toLowerCase().replace(/[\s_-]+/g, '') === cleanKey) {
        return row[rowKey];
      }
    }
  }
  return undefined;
}

export class NusukService {

  /**
   * Seed default External Agent entities if none exist.
   * 1) EA-Moulavi Travel and Rec Agents Pvt Ltd, entityId: 719133, contractId: 230195
   * 2) ALHIND TOURS AND TRAVELS PVT LTD, entityId: 719060, contractId: 245548
   */
  static async ensureDefaultExternalAgents() {
    const count = await prisma.nusukExternalAgent.count();
    if (count === 0) {
      console.log('[NUSUK] Seeding default External Agent entities...');
      await prisma.nusukExternalAgent.createMany({
        data: [
          {
            name: 'EA-Moulavi Travel and Rec Agents Pvt Ltd',
            entityId: '719133',
            contractId: '230195',
            activeEntityTypeId: '52',
            isActive: true,
          },
          {
            name: 'ALHIND TOURS AND TRAVELS PVT LTD',
            entityId: '719060',
            contractId: '245548',
            activeEntityTypeId: '52',
            isActive: true,
          }
        ]
      });
    }
  }

  // Get active Nusuk master settings + external agents
  static async getSettings() {
    await this.ensureDefaultExternalAgents();

    let setting = await prisma.nusukSetting.findFirst();
    if (!setting) {
      setting = await prisma.nusukSetting.create({
        data: {
          token: '',
          activeEntityId: '719133',
          activeEntityTypeId: '52',
          entityId: '719133',
          checkByPassport: false,
          externalAgentCodes: '22282, 6655, 1001828',
          syncSchedule: '08:00, 20:00',
          syncType: 'listing',
          isValid: true,
        }
      });
    }

    const externalAgents = await prisma.nusukExternalAgent.findMany({
      orderBy: { createdAt: 'asc' }
    });

    const totalSyncedMutamers = await prisma.nusukMutamerRecord.count();
    const over85DaysCount = await prisma.nusukMutamerRecord.count({
      where: { isOver85Days: true }
    });
    const consulateReviewCount = await prisma.nusukMutamerRecord.count({
      where: { mutamerStateId: 11 }
    });

    return {
      ...setting,
      externalAgents,
      stats: {
        totalSyncedMutamers,
        over85DaysCount,
        consulateReviewCount,
      }
    };
  }

  // Update Nusuk credentials settings
  static async saveSettings(data: {
    token: string;
    activeEntityId?: string;
    activeEntityTypeId?: string;
    entityId?: string;
    selectedUmrahCompanyIds?: string;
    checkByPassport?: boolean;
    externalAgentCodes?: string;
    syncSchedule?: string;
    syncType?: string;
    allowOneWayTicket?: boolean;
    allowWithoutTicket?: boolean;
    allowReEntryOneWayTicket?: boolean;
    allowReEntryWithoutTicket?: boolean;
  }) {
    const existing = await prisma.nusukSetting.findFirst();
    const cleanToken = data.token ? data.token.replace(/^Bearer\s+/i, '').trim() : '';

    if (existing) {
      return await prisma.nusukSetting.update({
        where: { id: existing.id },
        data: {
          token: cleanToken || existing.token,
          activeEntityId: data.activeEntityId ?? existing.activeEntityId,
          activeEntityTypeId: data.activeEntityTypeId ?? existing.activeEntityTypeId,
          entityId: data.entityId ?? existing.entityId,
          selectedUmrahCompanyIds: data.selectedUmrahCompanyIds ?? existing.selectedUmrahCompanyIds,
          checkByPassport: data.checkByPassport ?? existing.checkByPassport,
          externalAgentCodes: data.externalAgentCodes ?? existing.externalAgentCodes,
          syncSchedule: data.syncSchedule ?? existing.syncSchedule,
          syncType: data.syncType ?? existing.syncType,
          allowOneWayTicket: data.allowOneWayTicket ?? existing.allowOneWayTicket,
          allowWithoutTicket: data.allowWithoutTicket ?? existing.allowWithoutTicket,
          allowReEntryOneWayTicket: data.allowReEntryOneWayTicket ?? existing.allowReEntryOneWayTicket,
          allowReEntryWithoutTicket: data.allowReEntryWithoutTicket ?? existing.allowReEntryWithoutTicket,
          isValid: true,
        }
      });
    } else {
      return await prisma.nusukSetting.create({
        data: {
          token: cleanToken,
          activeEntityId: data.activeEntityId ?? '719133',
          activeEntityTypeId: data.activeEntityTypeId ?? '52',
          entityId: data.entityId ?? '719133',
          selectedUmrahCompanyIds: data.selectedUmrahCompanyIds ?? '',
          checkByPassport: data.checkByPassport ?? false,
          externalAgentCodes: data.externalAgentCodes ?? '22282, 6655, 1001828',
          syncSchedule: data.syncSchedule ?? '08:00, 20:00',
          syncType: data.syncType ?? 'listing',
          allowOneWayTicket: data.allowOneWayTicket ?? false,
          allowWithoutTicket: data.allowWithoutTicket ?? false,
          allowReEntryOneWayTicket: data.allowReEntryOneWayTicket ?? false,
          allowReEntryWithoutTicket: data.allowReEntryWithoutTicket ?? false,
          isValid: true,
        }
      });
    }
  }

  // Get all configured External Agents
  static async getExternalAgents() {
    await this.ensureDefaultExternalAgents();
    return await prisma.nusukExternalAgent.findMany({
      orderBy: { createdAt: 'asc' }
    });
  }

  // Create or update an External Agent Entity
  static async saveExternalAgent(data: {
    id?: string;
    name: string;
    entityId: string;
    contractId: string;
    activeEntityTypeId?: string;
    isActive?: boolean;
  }) {
    if (data.id) {
      return await prisma.nusukExternalAgent.update({
        where: { id: data.id },
        data: {
          name: data.name.trim(),
          entityId: String(data.entityId).trim(),
          contractId: String(data.contractId).trim(),
          activeEntityTypeId: String(data.activeEntityTypeId || '52').trim(),
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        }
      });
    } else {
      return await prisma.nusukExternalAgent.create({
        data: {
          name: data.name.trim(),
          entityId: String(data.entityId).trim(),
          contractId: String(data.contractId).trim(),
          activeEntityTypeId: String(data.activeEntityTypeId || '52').trim(),
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        }
      });
    }
  }

  // Delete an External Agent Entity
  static async deleteExternalAgent(id: string) {
    return await prisma.nusukExternalAgent.delete({
      where: { id }
    });
  }

  // Toggle active/disabled status for an External Agent
  static async toggleExternalAgent(id: string, isActive: boolean) {
    return await prisma.nusukExternalAgent.update({
      where: { id },
      data: { isActive }
    });
  }

  static isSyncing = false;
  static syncStage = '';
  static lastSyncResult: any = null;
  static lastSyncError: string | null = null;
  static lastSyncedAt: Date | null = null;

  static startBackgroundSync(agentId?: string): { inProgress: boolean; stage: string } {
    if (this.isSyncing) {
      return { inProgress: true, stage: this.syncStage || 'Synchronization in progress...' };
    }
    this.lastSyncError = null;
    this.syncStage = 'Initializing synchronization...';
    // Trigger in background without blocking HTTP request
    this.triggerSync(agentId).catch((err: any) => {
      console.error('[NUSUK ASYNC SYNC ERROR]', err);
    });
    return { inProgress: true, stage: this.syncStage };
  }

  static getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      stage: this.syncStage,
      lastSyncResult: this.lastSyncResult,
      lastSyncError: this.lastSyncError,
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  /**
   * Main Synchronization Engine
   * Uses master user token across all ACTIVE configured External Agent entities.
   * Calls: POST https://masar.nusuk.sa/umrah/reports_apis/api/Reports/GetMutamerReport
   */
  static async triggerSync(agentId?: string) {
    if (this.isSyncing && this.syncStage !== 'Initializing synchronization...') {
      throw new Error('A synchronization job is already running in the background. Please wait for it to finish.');
    }

    this.isSyncing = true;
    this.lastSyncError = null;
    this.syncStage = 'Initializing session and headless browser...';
    let browser: any = null;

    try {
      await this.ensureDefaultExternalAgents();

      const settings = await prisma.nusukSetting.findFirst();
      if (!settings || !settings.token) {
        throw new Error('Nusuk integration is not configured. Please supply a valid Bearer token in Nusuk Settings.');
      }

      const cleanToken = settings.token.replace(/^Bearer\s+/i, '').trim();

      // Load active External Agent entities to sync
      const activeAgents = await prisma.nusukExternalAgent.findMany({
        where: {
          isActive: true,
          ...(agentId ? { id: agentId } : {}),
        },
        orderBy: { createdAt: 'asc' }
      });

      if (activeAgents.length === 0) {
        throw new Error('No active External Agent entities configured. Please configure and enable at least one External Agent in Nusuk Settings.');
      }

      console.log(`[NUSUK SYNC] Starting sync across ${activeAgents.length} active External Agent contracts...`);

      // Launch headless browser to establish session, bypass WAF/Cloudflare, and evaluate GetMutamerReport
      browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
      ]
    });

    const allSyncedRows: any[] = [];
    const agentSyncResults: any[] = [];

    const page = await browser.newPage();
      
    await page.evaluateOnNewDocument(() => {
      const nav = (globalThis as any).navigator;
      if (nav) {
        Object.defineProperty(nav, 'webdriver', {
          get: () => undefined,
        });
      }
    });

      await page.setRequestInterception(true);
      page.on('request', (req: any) => {
        const type = req.resourceType();
        if (type === 'image' || type === 'stylesheet' || type === 'font' || type === 'media') {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'accept-language': 'en',
        'sec-ch-ua': '"Chromium";v="129", "Not=A?Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
      });
      
      console.log('[NUSUK SYNC] Establishing referrer page context at https://masar.nusuk.sa...');
      try {
        await page.goto('https://masar.nusuk.sa', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
      } catch (navErr: any) {
        console.warn('[NUSUK SYNC] Base page navigation note:', navErr.message);
      }

      for (let i = 0; i < activeAgents.length; i++) {
        const agent = activeAgents[i];
        this.syncStage = `Fetching Mutamer report for "${agent.name}" (${i + 1}/${activeAgents.length})...`;
        console.log(`[NUSUK SYNC] Fetching Mutamer Report for EA: "${agent.name}" (Entity: ${agent.entityId}, Contract: ${agent.contractId}, Type: ${agent.activeEntityTypeId || 52})...`);

        try {
          const evalResult: any = await page.evaluate(async (tok: any, entityId: any, contractId: any, entityTypeId: any) => {
            try {
              let allRows: any[] = [];
              let offset = 0;
              const limit = 500;
              let hasMore = true;
              let iterations = 0;
              const maxIterations = 50; // Safety cap: up to 25,000 mutamers per EA

              while (hasMore && iterations < maxIterations) {
                iterations++;

                const bodyData = {
                  limit,
                  offset,
                  filterList: [],
                  sortColumn: null,
                  sortCriteria: [],
                  noCount: true
                };

                const response = await fetch("https://masar.nusuk.sa/umrah/reports_apis/api/Reports/GetMutamerReport", {
                  method: "POST",
                  headers: {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "en",
                    "activeentityid": String(entityId),
                    "activeentitytypeid": String(entityTypeId || "52"),
                    "authorization": `Bearer ${tok}`,
                    "content-type": "application/json",
                    "contractid": String(contractId),
                    "entity-id": String(entityId),
                    "priority": "u=1, i",
                    "x-lang": "en"
                  },
                  body: JSON.stringify(bodyData)
                });

                if (response.status === 401 || response.status === 403) {
                  const errText = await response.text();
                  return {
                    success: false,
                    isAuthError: true,
                    status: response.status,
                    body: errText,
                    error: `Authentication failed (${response.status}): Token expired or unauthorized for entity ${entityId}.`
                  };
                }

                if (!response.ok) {
                  const errText = await response.text();
                  return {
                    success: false,
                    status: response.status,
                    body: errText,
                    error: `Nusuk API returned status ${response.status}: ${errText}`
                  };
                }

                const resJson = (await response.json()) as any;
                const dataObj = resJson?.response?.data || resJson?.data || resJson;
                const content = dataObj?.content || (Array.isArray(dataObj) ? dataObj : []);

                if (Array.isArray(content) && content.length > 0) {
                  allRows = allRows.concat(content);
                  offset += limit;
                  hasMore = dataObj?.hasNextPage === true || content.length >= limit;
                } else {
                  hasMore = false;
                }
              }

              return {
                success: true,
                data: allRows,
                count: allRows.length,
              };
            } catch (err: any) {
              return {
                success: false,
                error: err?.message || 'Failed during fetch evaluation'
              };
            }
          }, cleanToken, agent.entityId, agent.contractId, agent.activeEntityTypeId);

          if (!evalResult.success) {
            console.error(`[NUSUK SYNC] ⚠️ Error syncing EA "${agent.name}":`, evalResult.error);
            if (evalResult.isAuthError) {
              await prisma.nusukSetting.update({
                where: { id: settings.id },
                data: { isValid: false }
              });
            }
            await prisma.nusukExternalAgent.update({
              where: { id: agent.id },
              data: {
                lastSyncStatus: `Error: ${evalResult.error || 'Failed'}`,
              }
            });
            agentSyncResults.push({
              agentId: agent.id,
              name: agent.name,
              success: false,
              error: evalResult.error,
            });
            continue;
          }

          console.log(`[NUSUK SYNC] ✅ Received ${evalResult.data.length} mutamer records for "${agent.name}".`);
          
          // Tag rows with externalAgentId
          const taggedRows = (evalResult.data || []).map((r: any) => ({
            ...r,
            _externalAgentId: agent.id,
          }));

          allSyncedRows.push(...taggedRows);

          await prisma.nusukExternalAgent.update({
            where: { id: agent.id },
            data: {
              lastSyncedAt: new Date(),
              lastSyncCount: evalResult.data.length,
              lastSyncStatus: 'success',
            }
          });

          agentSyncResults.push({
            agentId: agent.id,
            name: agent.name,
            success: true,
            recordsCount: evalResult.data.length,
          });

        } catch (agentErr: any) {
          console.error(`[NUSUK SYNC] ⚠️ Exception syncing EA "${agent.name}":`, agentErr.message);
          await prisma.nusukExternalAgent.update({
            where: { id: agent.id },
            data: {
              lastSyncStatus: `Error: ${agentErr.message}`,
            }
          });
        }
      }

      await browser.close();
      browser = null;

      // If all agents failed due to auth error, throw
      if (allSyncedRows.length === 0 && agentSyncResults.some(r => r.error && r.error.includes('Authentication'))) {
        throw new Error('Nusuk authentication failed. The Bearer token has expired or is blocked. Please update the Bearer token in Settings.');
      }

      console.log(`[NUSUK SYNC] Total mutamer records collected across all EAs: ${allSyncedRows.length}. Processing rows into database...`);
      this.syncStage = `Persisting ${allSyncedRows.length} records into database & calculating compliance...`;

      // Process rows into database records, passenger matching, and mismatch audit
      const syncResult = await this.processRowsSync(allSyncedRows, settings);

      await prisma.nusukSetting.update({
        where: { id: settings.id },
        data: {
          lastSyncedAt: new Date(),
          isValid: true,
        }
      });

      const finalResult = {
        success: true,
        totalRecords: allSyncedRows.length,
        agentResults: agentSyncResults,
        ...syncResult,
      };

      this.lastSyncResult = finalResult;
      this.lastSyncError = null;
      this.lastSyncedAt = new Date();
      this.syncStage = `Sync completed successfully (${allSyncedRows.length} records processed)`;

      return finalResult;

    } catch (error: any) {
      if (browser) {
        await browser.close().catch(() => {});
      }
      console.error('[NUSUK SYNC] Critical sync error:', error.message);
      this.lastSyncError = error.message || 'Synchronization failed';
      this.syncStage = `Sync failed: ${error.message}`;
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  // Process manual Excel sync upload
  static async processExcelSync(excelBuffer: Buffer, partyId?: string) {
    const settings = await prisma.nusukSetting.findFirst();
    if (!settings) {
      throw new Error('Nusuk integration settings not configured.');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(excelBuffer, { type: 'buffer' });
    } catch (e: any) {
      console.error('[NUSUK SYNC] Failed to parse Excel sheet:', e.message);
      throw new Error(`Failed to parse Nusuk report file format: ${e.message}`);
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Nusuk report file is empty or has no sheets.');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet) as any[];
    console.log(`[NUSUK SYNC] Parsed ${rows.length} rows from manual Excel upload.`);

    const syncResult = await this.processRowsSync(rows, settings);
    return syncResult;
  }

  /**
   * Process and persist Mutamer rows into NusukMutamerRecord,
   * match against UmrahPassenger records, and compute travel discrepancies / 85+ days overstay.
   */
  static async processRowsSync(rows: any[], settings?: any) {
    if (!settings) {
      settings = await prisma.nusukSetting.findFirst();
    }

    const now = new Date();
    let over85DaysCount = 0;
    let consulateReviewCount = 0;
    const processedPassportSet = new Set<string>();

    console.log(`[NUSUK SYNC] Processing ${rows.length} rows into NusukMutamerRecord cache and updating passenger links...`);

    // Pre-fetch all active system passengers into memory for instant O(1) matching
    const systemPassengers = await prisma.umrahPassenger.findMany({
      where: {
        isDeleted: false,
        passportNumber: { not: null },
      },
      select: {
        id: true,
        fullName: true,
        passportNumber: true,
        bookingId: true,
        visaNumber: true,
        mofaNumber: true,
        borderNumber: true,
        visaIssueDate: true,
        entryDate: true,
        exitDate: true,
        currentlyInKingdom: true,
        mutamerStatus: true,
        isConsulateReview: true,
      }
    });

    // Preload system bookings with their passengers to match empty slots by groupNumber
    const systemBookingsWithPassengers = await prisma.umrahVisaBooking.findMany({
      where: { isDeleted: false },
      include: {
        passengers: { where: { isDeleted: false } }
      }
    });

    const bookingsByGroup = new Map<string, typeof systemBookingsWithPassengers>();
    for (const b of systemBookingsWithPassengers) {
      const groupCodes: string[] = [];
      if (b.groupNumber) {
        b.groupNumber.split(',').forEach(g => {
          const clean = g.trim();
          if (clean) groupCodes.push(clean);
        });
      }
      if (b.hasMultipleGroup && Array.isArray(b.multipleGroupDetails)) {
        for (const mg of b.multipleGroupDetails as any[]) {
          if (mg.groupNumber) {
            const clean = String(mg.groupNumber).trim();
            if (clean) groupCodes.push(clean);
          }
        }
      }

      for (const gCode of groupCodes) {
        const list = bookingsByGroup.get(gCode) || [];
        list.push(b);
        bookingsByGroup.set(gCode, list);
      }
    }

    const passengersByPassport = new Map<string, typeof systemPassengers>();
    for (const p of systemPassengers) {
      if (!p.passportNumber) continue;
      const key = p.passportNumber.trim().toUpperCase();
      const list = passengersByPassport.get(key) || [];
      list.push(p);
      passengersByPassport.set(key, list);
    }

    // 1. Parse and deduplicate all records by nusukId
    const recordMap = new Map<string, any>();
    const passengersToUpdate: Array<{ id: string; data: any }> = [];
    const passengersToCreate: Array<any> = [];
    const syncedBookingIds = new Set<string>();

    for (const row of rows) {
      const passportNumber = String(
        getRowValue(row, ['passportNumber', 'Passport Number', 'PassportNumber', 'Passport', 'passport_number']) || ''
      ).trim().toUpperCase();

      if (!passportNumber) continue;

      processedPassportSet.add(passportNumber);

      const nusukId = String(getRowValue(row, ['id', 'Id', 'ID', 'originalId']) || `${passportNumber}_${getRowValue(row, ['mutamerNumber']) || ''}`);
      const fullName = String(getRowValue(row, ['fullName', 'Full Name', 'FullName', 'Name', 'name']) || 'Unknown Mutamer').trim();
      const mutamerNumber = String(getRowValue(row, ['mutamerNumber', 'Mutamer Number', 'mutamer_number']) || '');
      const originalMutamerNumber = String(getRowValue(row, ['originalMutamerNumber', 'Original Mutamer Number']) || '');
      const entrySeqRaw = getRowValue(row, ['entrySequenceNumber', 'Entry Sequence Number', 'Sequence Number']);
      const entrySequenceNumber = entrySeqRaw ? parseInt(String(entrySeqRaw), 10) : null;
      const nationalityName = String(getRowValue(row, ['nationalityName', 'Nationality', 'nationality_name']) || '').trim() || null;
      const groupNumber = String(getRowValue(row, ['groupNumber', 'Group Number', 'GroupNumber', 'group_number', 'groupCode', 'Group Code']) || '').trim() || null;
      const groupCode = groupNumber;
      const groupName = String(getRowValue(row, ['groupName', 'Group Name', 'GroupName', 'group_name']) || '').trim() || null;
      const eaCountryName = String(getRowValue(row, ['eaCountryName', 'EA Country Name', 'Country']) || '').trim() || null;
      const eaCodeRaw = getRowValue(row, ['eaCode', 'EA Code', 'EACode', 'Agent Code', 'External Agent Code']);
      const eaCode = eaCodeRaw ? parseInt(String(eaCodeRaw), 10) : null;
      const subEAName = String(getRowValue(row, ['subEAName', 'Sub EA Name', 'SubEAName', 'Sub Agent']) || '').trim() || null;
      const subEACodeRaw = getRowValue(row, ['subEACode', 'Sub EA Code', 'SubEACode']);
      const subEACode = subEACodeRaw ? parseInt(String(subEACodeRaw), 10) : null;
      const eaName = String(getRowValue(row, ['eaName', 'EA Name', 'EAName', 'Agent Name', 'External Agent']) || '').trim() || null;
      const umrahCompanyIdRaw = getRowValue(row, ['umrahCompanyId', 'Umrah Company ID', 'Company ID']);
      const umrahCompanyId = umrahCompanyIdRaw ? parseInt(String(umrahCompanyIdRaw), 10) : null;
      const umrahCompanyName = String(getRowValue(row, ['umrahCompanyName', 'Umrah Company Name', 'Umrah Company', 'umrah_company_name']) || '').trim() || null;
      
      const entryCarrierNumber = String(getRowValue(row, ['entryCarrierumber', 'entryCarrierNumber', 'Entry Carrier Number', 'Entry Flight Number', 'Arrival Flight']) || '').trim() || null;
      const entryDate = parseExcelDate(getRowValue(row, ['entryDate', 'Entry Date', 'Arrival Date']), getRowValue(row, ['entryTime', 'Entry Time']));
      const entryTime = String(getRowValue(row, ['entryTime', 'Entry Time']) || '').trim() || null;
      const entryPlace = String(getRowValue(row, ['entryPlace', 'Entry Place', 'Arrival Port']) || '').trim() || null;
      const entryPortName = String(getRowValue(row, ['eentryPortName', 'entryPortName', 'Entry Port Name']) || '').trim() || null;

      const exitCarrierNumber = String(getRowValue(row, ['exitCarrierNumber', 'Exit Carrier Number', 'Departure Flight Number', 'Departure Flight']) || '').trim() || null;
      const exitDate = parseExcelDate(getRowValue(row, ['exitDate', 'Exit Date', 'Departure Date']), getRowValue(row, ['exitTime', 'Exit Time']));
      const exitTime = String(getRowValue(row, ['exitTime', 'Exit Time']) || '').trim() || null;
      const exitPlace = String(getRowValue(row, ['exitPlace', 'Exit Place', 'Departure Port']) || '').trim() || null;
      const exitPortName = String(getRowValue(row, ['exitPortName', 'Exit Port Name']) || '').trim() || null;

      const moiNumber = String(getRowValue(row, ['moiNumber', 'MOI Number', 'moi_number']) || '').trim() || null;
      const visaNumber = String(getRowValue(row, ['visaNumber', 'Visa Number', 'visa_number']) || '').trim() || null;
      const iqamaDaysRaw = getRowValue(row, ['iqamaDaysNumber', 'Iqama Days']);
      const iqamaDaysNumber = iqamaDaysRaw ? parseInt(String(iqamaDaysRaw), 10) : null;
      const mutamerGender = String(getRowValue(row, ['mutamerGender', 'Gender', 'mutamer_gender']) || '').trim() || null;
      const passportExpiryDate = parseExcelDate(getRowValue(row, ['passportExpiryDate', 'Passport Expiry Date']));
      const programmeDurationRaw = getRowValue(row, ['progrmaeDuration', 'programmeDuration', 'Program Duration', 'Duration']);
      const programmeDuration = programmeDurationRaw ? parseInt(String(programmeDurationRaw), 10) : null;
      const eaType = String(getRowValue(row, ['eaType', 'EA Type']) || '').trim() || null;

      // Status IDs & State Mapping:
      // 11 = Consulate Review, 9 = Visa Not Issued, 10 = Rejected, 6 = Visa Printed, 4 = Over Stay
      const stateIdRaw = getRowValue(row, ['mutamerStateId', 'mutamerState_id']) ?? (row.mutamerState?.id ? row.mutamerState.id : null);
      const mutamerStateId = stateIdRaw !== null && stateIdRaw !== undefined ? parseInt(String(stateIdRaw), 10) : null;
      
      let mutamerStateName = row.mutamerState?.name || '';
      if (!mutamerStateName && mutamerStateId !== null) {
        if (mutamerStateId === 6) mutamerStateName = 'Visa Printed';
        else if (mutamerStateId === 11) mutamerStateName = 'Consulate Review';
        else if (mutamerStateId === 9) mutamerStateName = 'Visa Not Issued';
        else if (mutamerStateId === 10) mutamerStateName = 'Rejected';
        else if (mutamerStateId === 4) mutamerStateName = 'Over Stay';
        else mutamerStateName = String(getRowValue(row, ['mutamerStatus', 'Status']) || `Status #${mutamerStateId}`);
      }
      if (!mutamerStateName) {
        mutamerStateName = String(getRowValue(row, ['mutamerStatus', 'Status', 'mutamer_status']) || 'Pending');
      }

      const mutamerStateColor = row.mutamerState?.uiColorClass || (mutamerStateId === 6 ? 'badge badge-success' : mutamerStateId === 11 ? 'badge badge-warning' : 'badge badge-secondary');
      const mofaNumber = String(getRowValue(row, ['mofaNumber', 'MOFA Number', 'mofa_number']) || '').trim() || null;
      const ageRaw = getRowValue(row, ['mutamerAge', 'Age', 'mutamer_age']);
      const mutamerAge = ageRaw ? parseInt(String(ageRaw), 10) : null;
      
      const isUmrahPermit = Boolean(getRowValue(row, ['isUmrahPermit']) || String(getRowValue(row, ['umrahPermit']) || '').toLowerCase() === 'yes');
      const umrahPermit = String(getRowValue(row, ['umrahPermit']) || (isUmrahPermit ? 'Yes' : 'No'));
      const isRawdaPermit = Boolean(getRowValue(row, ['isRawdaPermit']) || String(getRowValue(row, ['rawdaPermit']) || '').toLowerCase() === 'yes');
      const rawdaPermit = String(getRowValue(row, ['rawdaPermit']) || (isRawdaPermit ? 'Yes' : 'No'));

      const outStatusIdRaw = getRowValue(row, ['mutamerOutStatusId']) ?? (row.mutamerOutStatus?.id !== undefined ? row.mutamerOutStatus.id : null);
      const mutamerOutStatusId = outStatusIdRaw !== null && outStatusIdRaw !== undefined ? parseInt(String(outStatusIdRaw), 10) : null;
      const mutamerOutStatusName = row.mutamerOutStatus?.name || (mutamerOutStatusId === 1 ? 'Yes' : 'No');

      const b2cStatusIdRaw = getRowValue(row, ['mutamerB2CStatusId']) ?? (row.mutamerB2CStatus?.id !== undefined ? row.mutamerB2CStatus.id : null);
      const mutamerB2CStatusId = b2cStatusIdRaw !== null && b2cStatusIdRaw !== undefined ? parseInt(String(b2cStatusIdRaw), 10) : null;

      const isMutamerVisaExtend = Boolean(getRowValue(row, ['isMutamerVisaExtend']) || String(getRowValue(row, ['mutamerVisaExtend']) || '').toLowerCase() === 'yes');
      const mofaIssueDate = parseExcelDate(getRowValue(row, ['mofaIssueDate', 'MOFA Issue Date']));
      
      const stayDurationRaw = getRowValue(row, ['stayInDuration', 'Stay In Duration']);
      const stayInDuration = stayDurationRaw !== null && stayDurationRaw !== undefined ? parseInt(String(stayDurationRaw), 10) : null;

      const isPresentRaw = getRowValue(row, ['isPresentMutamer', 'Present Mutamer']) ?? (row.presentMutamer?.id !== undefined ? row.presentMutamer.id : null);
      const isPresentMutamer = isPresentRaw !== null && isPresentRaw !== undefined ? parseInt(String(isPresentRaw), 10) : null;

      const packageId = String(getRowValue(row, ['packageId', 'Package ID']) || '').trim() || null;
      const groupId = String(getRowValue(row, ['groupId', 'Group ID']) || '').trim() || null;
      const isVisaMultiEntry = Boolean(getRowValue(row, ['isVisaMultiEntry']) || (row.visaType?.name && row.visaType.name.includes('Multi')));

      const totalResidencyRaw = getRowValue(row, ['totalResidencyDays', 'Total Residency Days']);
      const totalResidencyDays = totalResidencyRaw ? parseInt(String(totalResidencyRaw), 10) : (stayInDuration || 0);

      const remainingResidencyRaw = getRowValue(row, ['remainingResidencyDays', 'Remaining Residency Days']);
      const remainingResidencyDays = remainingResidencyRaw !== undefined && remainingResidencyRaw !== null 
        ? parseInt(String(remainingResidencyRaw), 10) 
        : Math.max(0, 90 - totalResidencyDays);

      // Prioritize official Nusuk iqamaDaysNumber directly from Nusuk
      let daysInKsa = iqamaDaysNumber !== null ? iqamaDaysNumber : totalResidencyDays;
      if (daysInKsa === 0 && entryDate && !exitDate) {
        const entryMs = new Date(entryDate).getTime();
        daysInKsa = Math.max(0, Math.floor((now.getTime() - entryMs) / (1000 * 60 * 60 * 24)));
      }

      const isStillInKsa = exitDate === null || mutamerOutStatusId === 0 || mutamerOutStatusName === 'No' || isPresentMutamer === 1;
      const isOver85Days = isStillInKsa && (daysInKsa >= 85 || (remainingResidencyDays !== null && remainingResidencyDays <= 5) || mutamerStateId === 4);

      if (isOver85Days) over85DaysCount++;
      if ([9, 10, 11].includes(mutamerStateId || 0)) consulateReviewCount++;

      const externalAgentId = row._externalAgentId || null;

      recordMap.set(nusukId, {
        nusukId,
        mutamerNumber,
        originalMutamerNumber,
        entrySequenceNumber,
        fullName,
        passportNumber,
        nationalityName,
        groupNumber,
        groupCode,
        groupName,
        eaCountryName,
        eaCode,
        subEAName,
        subEACode,
        eaName,
        umrahCompanyId,
        umrahCompanyName,
        entryCarrierNumber,
        entryDate,
        entryTime,
        entryPlace,
        entryPortName,
        exitCarrierNumber,
        exitDate,
        exitTime,
        exitPlace,
        exitPortName,
        moiNumber,
        visaNumber: visaNumber || '',
        iqamaDaysNumber,
        mutamerGender,
        passportExpiryDate,
        programmeDuration,
        eaType,
        mutamerStateId,
        mutamerStateName,
        mutamerStateColor,
        mofaNumber,
        mutamerAge,
        isUmrahPermit,
        umrahPermit,
        isRawdaPermit,
        rawdaPermit,
        mutamerOutStatusId,
        mutamerOutStatusName,
        mutamerB2CStatusId,
        isMutamerVisaExtend,
        mofaIssueDate,
        stayInDuration,
        isPresentMutamer,
        packageId,
        groupId,
        isVisaMultiEntry,
        totalResidencyDays,
        remainingResidencyDays,
        daysInKsa,
        isOver85Days,
        externalAgentId,
        syncedAt: now,
      });

      // Match system passenger (by passport first, or feed into empty booking slots by groupNumber)
      const matchedPaxList = passengersByPassport.get(passportNumber);
      if (matchedPaxList && matchedPaxList.length > 0) {
        for (const p of matchedPaxList) {
          passengersToUpdate.push({
            id: p.id,
            data: {
              fullName: (p.fullName && p.fullName !== 'Unknown' && !p.fullName.includes('PAX') && !p.fullName.includes('TRVL') && !p.fullName.startsWith('Passenger')) ? p.fullName : fullName,
              passportNumber,
              visaNumber: visaNumber || p.visaNumber,
              mofaNumber: mofaNumber || p.mofaNumber,
              borderNumber: moiNumber || (entrySequenceNumber ? String(entrySequenceNumber) : p.borderNumber),
              visaIssueDate: mofaIssueDate || p.visaIssueDate,
              entryDate: entryDate || p.entryDate,
              exitDate: exitDate || p.exitDate,
              currentlyInKingdom: isStillInKsa ? 'Yes' : (exitDate ? 'No' : p.currentlyInKingdom),
              mutamerStatus: mutamerStateName || p.mutamerStatus,
              isConsulateReview: [9, 10, 11].includes(mutamerStateId || 0),
              gender: mutamerGender === 'Female' ? 'female' : (mutamerGender === 'Male' ? 'male' : undefined),
              nationality: nationalityName || undefined,
              passportExpiry: passportExpiryDate || undefined,
            }
          });
          if (p.bookingId) syncedBookingIds.add(p.bookingId);
        }
      } else if (groupNumber && bookingsByGroup.has(groupNumber)) {
        const matchingBookings = bookingsByGroup.get(groupNumber)!;
        let matchedInGroup = false;

        for (const b of matchingBookings) {
          const existingInBooking = b.passengers.find(p => p.passportNumber && p.passportNumber.trim().toUpperCase() === passportNumber);
          if (existingInBooking) {
            passengersToUpdate.push({
              id: existingInBooking.id,
              data: {
                fullName: (existingInBooking.fullName && !existingInBooking.fullName.includes('PAX') && !existingInBooking.fullName.includes('TRVL') && !existingInBooking.fullName.startsWith('Passenger')) ? existingInBooking.fullName : fullName,
                passportNumber,
                visaNumber: visaNumber || existingInBooking.visaNumber,
                mofaNumber: mofaNumber || existingInBooking.mofaNumber,
                borderNumber: moiNumber || (entrySequenceNumber ? String(entrySequenceNumber) : existingInBooking.borderNumber),
                visaIssueDate: mofaIssueDate || existingInBooking.visaIssueDate,
                entryDate: entryDate || existingInBooking.entryDate,
                exitDate: exitDate || existingInBooking.exitDate,
                currentlyInKingdom: isStillInKsa ? 'Yes' : (exitDate ? 'No' : existingInBooking.currentlyInKingdom),
                mutamerStatus: mutamerStateName || existingInBooking.mutamerStatus,
                isConsulateReview: [9, 10, 11].includes(mutamerStateId || 0),
                gender: mutamerGender === 'Female' ? 'female' : (mutamerGender === 'Male' ? 'male' : undefined),
                nationality: nationalityName || undefined,
                passportExpiry: passportExpiryDate || undefined,
              }
            });
            syncedBookingIds.add(b.id);
            matchedInGroup = true;
            break;
          }

          const emptySlot = b.passengers.find(p => !p.passportNumber || p.passportNumber.trim() === '');
          if (emptySlot) {
            emptySlot.passportNumber = passportNumber;
            passengersToUpdate.push({
              id: emptySlot.id,
              data: {
                fullName,
                passportNumber,
                visaNumber: visaNumber || emptySlot.visaNumber,
                mofaNumber: mofaNumber || emptySlot.mofaNumber,
                borderNumber: moiNumber || (entrySequenceNumber ? String(entrySequenceNumber) : emptySlot.borderNumber),
                visaIssueDate: mofaIssueDate || emptySlot.visaIssueDate,
                entryDate: entryDate || emptySlot.entryDate,
                exitDate: exitDate || emptySlot.exitDate,
                currentlyInKingdom: isStillInKsa ? 'Yes' : (exitDate ? 'No' : emptySlot.currentlyInKingdom),
                mutamerStatus: mutamerStateName || emptySlot.mutamerStatus,
                isConsulateReview: [9, 10, 11].includes(mutamerStateId || 0),
                gender: mutamerGender === 'Female' ? 'female' : (mutamerGender === 'Male' ? 'male' : undefined),
                nationality: nationalityName || undefined,
                passportExpiry: passportExpiryDate || undefined,
              }
            });
            syncedBookingIds.add(b.id);
            matchedInGroup = true;
            break;
          }
        }

        if (!matchedInGroup && matchingBookings.length > 0) {
          const targetBooking = matchingBookings[0];
          const newPax = {
            id: randomUUID(),
            bookingId: targetBooking.id,
            fullName,
            passportNumber,
            gender: mutamerGender === 'Female' ? 'female' : (mutamerGender === 'Male' ? 'male' : null),
            nationality: nationalityName || null,
            passportExpiry: passportExpiryDate || null,
            visaNumber: visaNumber || null,
            mofaNumber: mofaNumber || null,
            borderNumber: moiNumber || (entrySequenceNumber ? String(entrySequenceNumber) : null),
            visaIssueDate: mofaIssueDate || null,
            entryDate: entryDate || null,
            exitDate: exitDate || null,
            currentlyInKingdom: isStillInKsa ? 'Yes' : (exitDate ? 'No' : null),
            mutamerStatus: mutamerStateName || null,
            isConsulateReview: [9, 10, 11].includes(mutamerStateId || 0),
            isLeadPassenger: false,
          };
          targetBooking.passengers.push(newPax as any);
          passengersToCreate.push(newPax);
          syncedBookingIds.add(targetBooking.id);
        }
      }
    }

    // 2. High-speed multi-row raw SQL batch upsert into nusuk_mutamer_records
    const distinctRecords = Array.from(recordMap.values());
    const chunkSize = 150;
    console.log(`[NUSUK SYNC] Executing fast SQL upsert for ${distinctRecords.length} records in chunks of ${chunkSize}...`);

    for (let i = 0; i < distinctRecords.length; i += chunkSize) {
      const chunk = distinctRecords.slice(i, i + chunkSize);
      const valuesSql = chunk.map(r => {
        const id = randomUUID();
        return `(${toSqlLiteral(id)}, ${toSqlLiteral(r.nusukId)}, ${toSqlLiteral(r.mutamerNumber)}, ${toSqlLiteral(r.originalMutamerNumber)}, ${toSqlLiteral(r.entrySequenceNumber)}, ${toSqlLiteral(r.fullName)}, ${toSqlLiteral(r.passportNumber)}, ${toSqlLiteral(r.nationalityName)}, ${toSqlLiteral(r.groupNumber)}, ${toSqlLiteral(r.groupCode)}, ${toSqlLiteral(r.groupName)}, ${toSqlLiteral(r.eaCountryName)}, ${toSqlLiteral(r.eaCode)}, ${toSqlLiteral(r.subEAName)}, ${toSqlLiteral(r.subEACode)}, ${toSqlLiteral(r.eaName)}, ${toSqlLiteral(r.umrahCompanyId)}, ${toSqlLiteral(r.umrahCompanyName)}, ${toSqlLiteral(r.entryCarrierNumber)}, ${toSqlLiteral(r.entryDate)}, ${toSqlLiteral(r.entryTime)}, ${toSqlLiteral(r.entryPlace)}, ${toSqlLiteral(r.entryPortName)}, ${toSqlLiteral(r.exitCarrierNumber)}, ${toSqlLiteral(r.exitDate)}, ${toSqlLiteral(r.exitTime)}, ${toSqlLiteral(r.exitPlace)}, ${toSqlLiteral(r.exitPortName)}, ${toSqlLiteral(r.moiNumber)}, ${toSqlLiteral(r.visaNumber)}, ${toSqlLiteral(r.iqamaDaysNumber)}, ${toSqlLiteral(r.mutamerGender)}, ${toSqlLiteral(r.passportExpiryDate)}, ${toSqlLiteral(r.programmeDuration)}, ${toSqlLiteral(r.eaType)}, ${toSqlLiteral(r.mutamerStateId)}, ${toSqlLiteral(r.mutamerStateName)}, ${toSqlLiteral(r.mutamerStateColor)}, ${toSqlLiteral(r.mofaNumber)}, ${toSqlLiteral(r.mutamerAge)}, ${toSqlLiteral(r.isUmrahPermit)}, ${toSqlLiteral(r.umrahPermit)}, ${toSqlLiteral(r.isRawdaPermit)}, ${toSqlLiteral(r.rawdaPermit)}, ${toSqlLiteral(r.mutamerOutStatusId)}, ${toSqlLiteral(r.mutamerOutStatusName)}, ${toSqlLiteral(r.mutamerB2CStatusId)}, ${toSqlLiteral(r.isMutamerVisaExtend)}, ${toSqlLiteral(r.mofaIssueDate)}, ${toSqlLiteral(r.stayInDuration)}, ${toSqlLiteral(r.isPresentMutamer)}, ${toSqlLiteral(r.packageId)}, ${toSqlLiteral(r.groupId)}, ${toSqlLiteral(r.isVisaMultiEntry)}, ${toSqlLiteral(r.totalResidencyDays)}, ${toSqlLiteral(r.remainingResidencyDays)}, ${toSqlLiteral(r.daysInKsa)}, ${toSqlLiteral(r.isOver85Days)}, ${toSqlLiteral(r.externalAgentId)}, ${toSqlLiteral(now)}, ${toSqlLiteral(now)}, ${toSqlLiteral(now)})`;
      }).join(',\n');

      const sql = `
        INSERT INTO nusuk_mutamer_records (
          id, nusuk_id, mutamer_number, original_mutamer_number, entry_sequence_number,
          full_name, passport_number, nationality_name, group_number, group_code,
          group_name, ea_country_name, ea_code, sub_ea_name, sub_ea_code,
          ea_name, umrah_company_id, umrah_company_name, entry_carrier_number, entry_date,
          entry_time, entry_place, entry_port_name, exit_carrier_number, exit_date,
          exit_time, exit_place, exit_port_name, moi_number, visa_number,
          iqama_days_number, mutamer_gender, passport_expiry_date, programme_duration, ea_type,
          mutamer_state_id, mutamer_state_name, mutamer_state_color, mofa_number, mutamer_age,
          is_umrah_permit, umrah_permit, is_rawda_permit, rawda_permit, mutamer_out_status_id,
          mutamer_out_status_name, mutamer_b2c_status_id, is_mutamer_visa_extend, mofa_issue_date,
          stay_in_duration, is_present_mutamer, package_id, group_id, is_visa_multi_entry,
          total_residency_days, remaining_residency_days, days_in_ksa, is_over_85_days, external_agent_id,
          synced_at, created_at, updated_at
        ) VALUES
        ${valuesSql}
        ON CONFLICT(nusuk_id) DO UPDATE SET
          mutamer_number = excluded.mutamer_number,
          original_mutamer_number = excluded.original_mutamer_number,
          entry_sequence_number = excluded.entry_sequence_number,
          full_name = excluded.full_name,
          passport_number = excluded.passport_number,
          nationality_name = excluded.nationality_name,
          group_number = excluded.group_number,
          group_code = excluded.group_code,
          group_name = excluded.group_name,
          ea_country_name = excluded.ea_country_name,
          ea_code = excluded.ea_code,
          sub_ea_name = excluded.sub_ea_name,
          sub_ea_code = excluded.sub_ea_code,
          ea_name = excluded.ea_name,
          umrah_company_id = excluded.umrah_company_id,
          umrah_company_name = excluded.umrah_company_name,
          entry_carrier_number = excluded.entry_carrier_number,
          entry_date = excluded.entry_date,
          entry_time = excluded.entry_time,
          entry_place = excluded.entry_place,
          entry_port_name = excluded.entry_port_name,
          exit_carrier_number = excluded.exit_carrier_number,
          exit_date = excluded.exit_date,
          exit_time = excluded.exit_time,
          exit_place = excluded.exit_place,
          exit_port_name = excluded.exit_port_name,
          moi_number = excluded.moi_number,
          visa_number = excluded.visa_number,
          iqama_days_number = excluded.iqama_days_number,
          mutamer_gender = excluded.mutamer_gender,
          passport_expiry_date = excluded.passport_expiry_date,
          programme_duration = excluded.programme_duration,
          ea_type = excluded.ea_type,
          mutamer_state_id = excluded.mutamer_state_id,
          mutamer_state_name = excluded.mutamer_state_name,
          mutamer_state_color = excluded.mutamer_state_color,
          mofa_number = excluded.mofa_number,
          mutamer_age = excluded.mutamer_age,
          is_umrah_permit = excluded.is_umrah_permit,
          umrah_permit = excluded.umrah_permit,
          is_rawda_permit = excluded.is_rawda_permit,
          rawda_permit = excluded.rawda_permit,
          mutamer_out_status_id = excluded.mutamer_out_status_id,
          mutamer_out_status_name = excluded.mutamer_out_status_name,
          mutamer_b2c_status_id = excluded.mutamer_b2c_status_id,
          is_mutamer_visa_extend = excluded.is_mutamer_visa_extend,
          mofa_issue_date = excluded.mofa_issue_date,
          stay_in_duration = excluded.stay_in_duration,
          is_present_mutamer = excluded.is_present_mutamer,
          package_id = excluded.package_id,
          group_id = excluded.group_id,
          is_visa_multi_entry = excluded.is_visa_multi_entry,
          total_residency_days = excluded.total_residency_days,
          remaining_residency_days = excluded.remaining_residency_days,
          days_in_ksa = excluded.days_in_ksa,
          is_over_85_days = excluded.is_over_85_days,
          external_agent_id = excluded.external_agent_id,
          synced_at = excluded.synced_at,
          updated_at = excluded.updated_at;
      `;

      await prisma.$executeRawUnsafe(sql);
    }

    // 3. High-speed raw SQL updates for matched system passengers
    if (passengersToUpdate.length > 0) {
      console.log(`[NUSUK SYNC] Fast updating ${passengersToUpdate.length} matched system passengers...`);
      const paxChunkSize = 100;
      for (let i = 0; i < passengersToUpdate.length; i += paxChunkSize) {
        const chunk = passengersToUpdate.slice(i, i + paxChunkSize);
        for (const p of chunk) {
          const sets: string[] = [];
          if (p.data.fullName !== undefined && p.data.fullName) sets.push(`full_name = ${toSqlLiteral(p.data.fullName)}`);
          if (p.data.passportNumber !== undefined && p.data.passportNumber) sets.push(`passport_number = ${toSqlLiteral(p.data.passportNumber)}`);
          if (p.data.nationality !== undefined && p.data.nationality) sets.push(`nationality = ${toSqlLiteral(p.data.nationality)}`);
          if (p.data.gender !== undefined && p.data.gender) sets.push(`gender = ${toSqlLiteral(p.data.gender)}`);
          if (p.data.passportExpiry !== undefined) sets.push(`passport_expiry = ${toSqlLiteral(p.data.passportExpiry)}`);
          if (p.data.visaNumber !== undefined) sets.push(`visa_number = ${toSqlLiteral(p.data.visaNumber)}`);
          if (p.data.mofaNumber !== undefined) sets.push(`mofa_number = ${toSqlLiteral(p.data.mofaNumber)}`);
          if (p.data.borderNumber !== undefined) sets.push(`border_number = ${toSqlLiteral(p.data.borderNumber)}`);
          if (p.data.visaIssueDate !== undefined) sets.push(`visa_issue_date = ${toSqlLiteral(p.data.visaIssueDate)}`);
          if (p.data.entryDate !== undefined) sets.push(`entry_date = ${toSqlLiteral(p.data.entryDate)}`);
          if (p.data.exitDate !== undefined) sets.push(`exit_date = ${toSqlLiteral(p.data.exitDate)}`);
          if (p.data.currentlyInKingdom !== undefined) sets.push(`currently_in_kingdom = ${toSqlLiteral(p.data.currentlyInKingdom)}`);
          if (p.data.mutamerStatus !== undefined) sets.push(`mutamer_status = ${toSqlLiteral(p.data.mutamerStatus)}`);
          if (p.data.isConsulateReview !== undefined) sets.push(`is_consulate_review = ${toSqlLiteral(p.data.isConsulateReview)}`);
          sets.push(`updated_at = ${toSqlLiteral(now)}`);

          if (sets.length > 0) {
            await prisma.$executeRawUnsafe(`UPDATE umrah_passengers SET ${sets.join(', ')} WHERE id = ${toSqlLiteral(p.id)}`).catch((err) => {
              console.error(`[NUSUK SYNC] Error updating passenger ${p.id}:`, err);
            });
          }
        }
      }
    }

    if (passengersToCreate.length > 0) {
      console.log(`[NUSUK SYNC] Creating ${passengersToCreate.length} new passenger records for overflowing Nusuk group mutamers...`);
      const createChunkSize = 100;
      for (let i = 0; i < passengersToCreate.length; i += createChunkSize) {
        const chunk = passengersToCreate.slice(i, i + createChunkSize);
        const valuesSql = chunk.map(p => {
          return `(${toSqlLiteral(p.id)}, ${toSqlLiteral(p.bookingId)}, ${toSqlLiteral(p.fullName)}, ${toSqlLiteral(p.passportNumber)}, ${toSqlLiteral(p.nationality)}, ${toSqlLiteral(p.gender)}, ${toSqlLiteral(p.passportExpiry)}, ${toSqlLiteral(p.visaNumber)}, ${toSqlLiteral(p.mofaNumber)}, ${toSqlLiteral(p.borderNumber)}, ${toSqlLiteral(p.visaIssueDate)}, ${toSqlLiteral(p.entryDate)}, ${toSqlLiteral(p.exitDate)}, ${toSqlLiteral(p.currentlyInKingdom)}, ${toSqlLiteral(p.mutamerStatus)}, ${toSqlLiteral(p.isConsulateReview)}, ${toSqlLiteral(p.isLeadPassenger)}, ${toSqlLiteral(now)}, ${toSqlLiteral(now)})`;
        }).join(',\n');

        await prisma.$executeRawUnsafe(`
          INSERT INTO umrah_passengers (
            id, booking_id, full_name, passport_number, nationality, gender, passport_expiry,
            visa_number, mofa_number, border_number, visa_issue_date, entry_date, exit_date,
            currently_in_kingdom, mutamer_status, is_consulate_review, is_lead_passenger, created_at, updated_at
          ) VALUES
          ${valuesSql}
        `).catch((err) => {
          console.error('[NUSUK SYNC] Error inserting new passengers:', err);
        });
      }
    }

    // 4. Update is_nusuk_synced and nusuk_synced_at on affected bookings
    if (syncedBookingIds.size > 0) {
      console.log(`[NUSUK SYNC] Flagging ${syncedBookingIds.size} bookings as Nusuk-synced...`);
      const bookingIds = Array.from(syncedBookingIds);
      const bChunkSize = 100;
      for (let i = 0; i < bookingIds.length; i += bChunkSize) {
        const chunk = bookingIds.slice(i, i + bChunkSize);
        const idList = chunk.map(id => toSqlLiteral(id)).join(', ');
        await prisma.$executeRawUnsafe(`
          UPDATE umrah_visa_bookings 
          SET is_nusuk_synced = 1, nusuk_synced_at = ${toSqlLiteral(now)}, updated_at = ${toSqlLiteral(now)}
          WHERE id IN (${idList})
        `).catch(() => {});
      }
    }

    const upsertedCount = distinctRecords.length;
    console.log(`[NUSUK SYNC] Batch upsert completed: ${upsertedCount} mutamers. Over 85 days in KSA: ${over85DaysCount}, Consulate Review: ${consulateReviewCount}.`);

    // 4. Clean up stale historical rows from previous sync runs
    await prisma.nusukMutamerRecord.deleteMany({
      where: {
        syncedAt: { lt: now }
      }
    }).catch(() => {});

    // 5. Clear stale Nusuk fields for passengers that were flagged for consulate review but no longer present in report
    if (processedPassportSet.size > 0) {
      const dbPassengersToClear = await prisma.umrahPassenger.findMany({
        where: {
          isDeleted: false,
          passportNumber: { not: null },
          OR: [
            { isConsulateReview: true },
            { mutamerStatus: 'Consulate Review' },
          ]
        },
        select: { id: true, passportNumber: true }
      });

      const passengersToClear = dbPassengersToClear.filter(
        p => p.passportNumber && !processedPassportSet.has(p.passportNumber.trim().toUpperCase())
      );

      if (passengersToClear.length > 0) {
        const clearChunkSize = 100;
        for (let i = 0; i < passengersToClear.length; i += clearChunkSize) {
          const ids = passengersToClear.slice(i, i + clearChunkSize).map(p => p.id);
          await prisma.umrahPassenger.updateMany({
            where: { id: { in: ids } },
            data: {
              isConsulateReview: false,
              mutamerStatus: null,
            }
          });
        }
      }
    }

    // 4. Check for travel discrepancies and log NusukMismatches
    let mismatchesCreated = 0;
    try {
      const activeBookingsWithTravel = await prisma.umrahVisaBooking.findMany({
        where: {
          isDeleted: false,
          travelDetails: { some: { isAlternate: false } }
        },
        include: {
          passengers: { where: { isDeleted: false } },
          travelDetails: {
            where: { isAlternate: false },
            include: {
              arrivalAirport: true,
              departureAirport: true,
            }
          }
        }
      });

      // Create in-memory map of latest nusuk records by passport
      const nusukByPassport = new Map<string, any>();
      for (const rec of distinctRecords) {
        if (rec.passportNumber) {
          nusukByPassport.set(rec.passportNumber.trim().toUpperCase(), rec);
        }
      }

      for (const booking of activeBookingsWithTravel) {
        const travel = booking.travelDetails[0];
        if (!travel) continue;

        for (const pax of booking.passengers) {
          if (!pax.passportNumber) continue;

          const cleanPaxPassport = pax.passportNumber.trim().toUpperCase();
          const nusukRecord = nusukByPassport.get(cleanPaxPassport);

          if (!nusukRecord) continue;

          const discrepancies: any[] = [];
          let mismatchType: 'entry' | 'exit' | 'both' = 'entry';

          // Check Arrival / Entry mismatch
          if (nusukRecord.entryCarrierNumber && travel.arrivalFlightNumber) {
            if (!isFlightNumberMatch(travel.arrivalFlightNumber, nusukRecord.entryCarrierNumber)) {
              discrepancies.push({
                type: 'Arrival Flight Number',
                systemValue: travel.arrivalFlightNumber,
                nusukValue: nusukRecord.entryCarrierNumber,
              });
            }
          }

          if (nusukRecord.entryDate && travel.arrivalDateTime) {
            const sysDateStr = new Date(travel.arrivalDateTime).toISOString().split('T')[0];
            const nusukDateStr = new Date(nusukRecord.entryDate).toISOString().split('T')[0];
            if (sysDateStr !== nusukDateStr) {
              discrepancies.push({
                type: 'Arrival Date',
                systemValue: sysDateStr,
                nusukValue: nusukDateStr,
              });
            }
          }

          // Check Departure / Exit mismatch
          if (nusukRecord.exitCarrierNumber && travel.departureFlightNumber) {
            if (!isFlightNumberMatch(travel.departureFlightNumber, nusukRecord.exitCarrierNumber)) {
              discrepancies.push({
                type: 'Departure Flight Number',
                systemValue: travel.departureFlightNumber,
                nusukValue: nusukRecord.exitCarrierNumber,
              });
            }
          }

          if (nusukRecord.exitDate && travel.departureDateTime) {
            const sysDateStr = new Date(travel.departureDateTime).toISOString().split('T')[0];
            const nusukDateStr = new Date(nusukRecord.exitDate).toISOString().split('T')[0];
            if (sysDateStr !== nusukDateStr) {
              discrepancies.push({
                type: 'Departure Date',
                systemValue: sysDateStr,
                nusukValue: nusukDateStr,
              });
            }
          }

          if (discrepancies.length > 0) {
            const hasEntry = discrepancies.some(d => d.type.includes('Arrival'));
            const hasExit = discrepancies.some(d => d.type.includes('Departure'));
            mismatchType = hasEntry && hasExit ? 'both' : (hasEntry ? 'entry' : 'exit');

            const existingMismatch = await prisma.nusukMismatch.findFirst({
              where: {
                bookingId: booking.id,
                passengerId: pax.id,
                resolved: false,
              }
            });

            if (!existingMismatch) {
              await prisma.nusukMismatch.create({
                data: {
                  bookingId: booking.id,
                  passengerId: pax.id,
                  mismatchType,
                  details: {
                    passportNumber: pax.passportNumber,
                    fullName: pax.fullName,
                    discrepancies,
                    umrahCompany: nusukRecord.umrahCompanyName,
                    eaName: nusukRecord.eaName,
                  },
                  resolved: false,
                }
              });
              mismatchesCreated++;
            }
          }
        }
      }
    } catch (mismatchErr: any) {
      console.warn('[NUSUK SYNC] Error calculating travel mismatches:', mismatchErr.message);
    }

    // 5. Recalculate Sub-Agent compliance metrics
    await this.recalculateCompliance().catch(() => {});

    return {
      mutamersCount: upsertedCount,
      over85DaysCount,
      consulateReviewCount,
      mismatchesCount: mismatchesCreated,
      syncedAt: now,
    };
  }

  /**
   * Query Mutamers with filtering by:
   * - State ID (11: Consulate Review, 9: Visa Not Issued, 10: Rejected, 6: Visa Printed, 4: Over Stay)
   * - Umrah Company Name
   * - External Agent Name / Code
   * - Sub Agent Name
   * - Over 85 Days in KSA flag
   * - Global search (Passport, Name, MOFA, Visa, Group)
   */
  static async getMutamers(params: {
    page?: number;
    limit?: number;
    stateId?: number | string;
    umrahCompany?: string;
    eaCode?: number | string;
    subEAName?: string;
    isOver85Days?: boolean | string;
    search?: string;
  }) {
    const page = params.page ? parseInt(String(params.page), 10) : 1;
    const limit = params.limit ? parseInt(String(params.limit), 10) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.stateId !== undefined && params.stateId !== '' && params.stateId !== 'all') {
      where.mutamerStateId = parseInt(String(params.stateId), 10);
    }

    if (params.umrahCompany && params.umrahCompany !== 'all') {
      where.umrahCompanyName = { contains: params.umrahCompany };
    }

    if (params.eaCode && params.eaCode !== 'all') {
      where.eaCode = parseInt(String(params.eaCode), 10);
    }

    if (params.subEAName && params.subEAName !== 'all') {
      where.subEAName = { contains: params.subEAName };
    }

    if (params.isOver85Days === true || String(params.isOver85Days) === 'true') {
      where.isOver85Days = true;
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { passportNumber: { contains: q } },
        { fullName: { contains: q } },
        { visaNumber: { contains: q } },
        { mofaNumber: { contains: q } },
        { groupNumber: { contains: q } },
        { groupName: { contains: q } },
        { subEAName: { contains: q } },
        { umrahCompanyName: { contains: q } },
      ];
    }

    const [mutamers, total] = await Promise.all([
      prisma.nusukMutamerRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isOver85Days: 'desc' }, { syncedAt: 'desc' }, { mofaIssueDate: 'desc' }]
      }),
      prisma.nusukMutamerRecord.count({ where })
    ]);

    return {
      mutamers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      }
    };
  }

  /**
   * Get Pilgrims who have spent >= 85 days in KSA and are still inside KSA
   */
  static async getOverstay85Days(params: {
    page?: number;
    limit?: number;
    umrahCompany?: string;
    eaCode?: number | string;
    search?: string;
  }) {
    const page = params.page ? parseInt(String(params.page), 10) : 1;
    const limit = params.limit ? parseInt(String(params.limit), 10) : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      isOver85Days: true,
    };

    if (params.umrahCompany && params.umrahCompany !== 'all') {
      where.umrahCompanyName = { contains: params.umrahCompany };
    }

    if (params.eaCode && params.eaCode !== 'all') {
      where.eaCode = parseInt(String(params.eaCode), 10);
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { passportNumber: { contains: q } },
        { fullName: { contains: q } },
        { visaNumber: { contains: q } },
        { groupNumber: { contains: q } },
        { groupName: { contains: q } },
        { subEAName: { contains: q } },
        { umrahCompanyName: { contains: q } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.nusukMutamerRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ daysInKsa: 'desc' }, { remainingResidencyDays: 'asc' }]
      }),
      prisma.nusukMutamerRecord.count({ where })
    ]);

    return {
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      }
    };
  }

  /**
   * Get Consulate Review list (mutamerStateId = 11 or isConsulateReview = true)
   */
  static async getConsulateReview(params: {
    page?: number;
    limit?: number;
    partyId?: string;
    umrahCompany?: string;
    eaCode?: number | string;
    search?: string;
  }) {
    const page = params.page ? parseInt(String(params.page), 10) : 1;
    const limit = params.limit ? parseInt(String(params.limit), 10) : 20;
    const skip = (page - 1) * limit;

    // First check NusukMutamerRecord cache
    const where: any = {
      OR: [
        { mutamerStateId: { in: [9, 10, 11] } },
        { mutamerStateName: { in: ['Consulate Review', 'Visa Not Issued', 'Visa Rejected'] } },
      ]
    };

    if (params.umrahCompany && params.umrahCompany !== 'all') {
      where.umrahCompanyName = { contains: params.umrahCompany };
    }

    if (params.eaCode && params.eaCode !== 'all') {
      where.eaCode = parseInt(String(params.eaCode), 10);
    }

    if (params.search) {
      const q = params.search.trim();
      where.AND = [
        {
          OR: [
            { passportNumber: { contains: q } },
            { fullName: { contains: q } },
            { mofaNumber: { contains: q } },
            { groupNumber: { contains: q } },
            { groupName: { contains: q } },
            { subEAName: { contains: q } },
            { umrahCompanyName: { contains: q } },
          ]
        }
      ];
    }

    const [cachedRecords, total] = await Promise.all([
      prisma.nusukMutamerRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { mofaIssueDate: 'desc' }
      }),
      prisma.nusukMutamerRecord.count({ where })
    ]);

    if (cachedRecords.length > 0) {
      return {
        passengers: cachedRecords.map(r => ({
          id: r.id,
          fullName: r.fullName,
          passportNumber: r.passportNumber,
          nationality: r.nationalityName,
          mofaNumber: r.mofaNumber,
          mutamerStatus: r.mutamerStateName,
          visaNumber: r.visaNumber,
          groupNumber: r.groupNumber,
          groupName: r.groupName,
          umrahCompanyName: r.umrahCompanyName,
          eaName: r.eaName,
          subEAName: r.subEAName,
          mofaIssueDate: r.mofaIssueDate,
          age: r.mutamerAge,
          updatedAt: r.updatedAt.toISOString(),
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        }
      };
    }

    // Fallback to UmrahPassenger query if cache is empty
    const paxWhere: any = {
      isDeleted: false,
      OR: [
        { isConsulateReview: true },
        { mutamerStatus: 'Consulate Review' },
        { mutamerStatus: 'Visa Rejected' },
        { mutamerStatus: 'Visa Not Issued' },
      ]
    };

    if (params.search) {
      paxWhere.AND = [
        {
          OR: [
            { fullName: { contains: params.search } },
            { passportNumber: { contains: params.search } },
            { mofaNumber: { contains: params.search } },
          ]
        }
      ];
    }

    const [passengers, paxTotal] = await Promise.all([
      prisma.umrahPassenger.findMany({
        where: paxWhere,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          booking: {
            include: {
              party: true,
              umrahVisaProvider: true,
            }
          }
        }
      }),
      prisma.umrahPassenger.count({ where: paxWhere })
    ]);

    return {
      passengers: passengers.map(p => ({
        id: p.id,
        fullName: p.fullName,
        passportNumber: p.passportNumber,
        nationality: p.nationality,
        mofaNumber: p.mofaNumber,
        mutamerStatus: p.mutamerStatus,
        visaNumber: p.visaNumber,
        bookingId: p.booking?.id,
        bookingReference: p.booking?.bookingReference,
        groupNumber: p.booking?.groupNumber,
        groupName: p.booking?.groupName,
        partyId: p.booking?.party?.id,
        partyName: p.booking?.party?.partyName,
        umrahCompanyName: p.booking?.umrahVisaProvider?.partyName || 'N/A',
        updatedAt: p.updatedAt.toISOString(),
      })),
      pagination: {
        total: paxTotal,
        page,
        limit,
        totalPages: Math.ceil(paxTotal / limit) || 1,
      }
    };
  }

  // Get distinct filter values for dropdown filters (Umrah Companies, EAs, Sub EAs)
  static async getFilters() {
    const umrahCompaniesRaw = await prisma.nusukMutamerRecord.findMany({
      where: { umrahCompanyName: { not: null } },
      select: { umrahCompanyName: true },
      distinct: ['umrahCompanyName'],
      orderBy: { umrahCompanyName: 'asc' },
    });

    const externalAgentsRaw = await prisma.nusukMutamerRecord.findMany({
      where: { eaName: { not: null } },
      select: { eaName: true, eaCode: true },
      distinct: ['eaName'],
      orderBy: { eaName: 'asc' },
    });

    const subAgentsRaw = await prisma.nusukMutamerRecord.findMany({
      where: { subEAName: { not: null } },
      select: { subEAName: true, subEACode: true },
      distinct: ['subEAName'],
      orderBy: { subEAName: 'asc' },
    });

    return {
      umrahCompanies: umrahCompaniesRaw.map(c => c.umrahCompanyName).filter(Boolean),
      externalAgents: externalAgentsRaw.filter(e => e.eaName),
      subAgents: subAgentsRaw.filter(s => s.subEAName),
    };
  }

  // Get travel mismatches list with pagination and filters
  static async getMismatches(params: {
    resolved?: boolean;
    page: number;
    limit: number;
    mismatchType?: string;
    partyId?: string;
    search?: string;
  }) {
    const { resolved, page, limit, mismatchType, partyId, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (resolved !== undefined) {
      where.resolved = resolved;
    }

    if (mismatchType && mismatchType !== 'all') {
      where.mismatchType = mismatchType;
    }

    if (partyId && partyId !== 'all') {
      where.booking = { partyId };
    }

    if (search) {
      where.OR = [
        { booking: { bookingReference: { contains: search } } },
        { booking: { groupNumber: { contains: search } } },
        { passenger: { passportNumber: { contains: search } } },
        { passenger: { fullName: { contains: search } } },
      ];
    }

    const [mismatches, total] = await Promise.all([
      prisma.nusukMismatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: {
              party: true,
              umrahVisaProvider: true,
            }
          },
          passenger: true,
        }
      }),
      prisma.nusukMismatch.count({ where })
    ]);

    return {
      mismatches,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      }
    };
  }

  // Resolve a travel mismatch
  static async resolveMismatch(id: string) {
    return await prisma.nusukMismatch.update({
      where: { id },
      data: { resolved: true }
    });
  }

  // Get compliance network summary metrics
  static async getComplianceSummary() {
    const totalCount = await prisma.party.count({
      where: { isCustomer: true }
    });

    const metrics = await prisma.subAgentMetric.findMany();
    const redCount = metrics.filter(m => m.complianceStatus === 'RED').length;
    const yellowCount = metrics.filter(m => m.complianceStatus === 'YELLOW').length;

    let totalArrivalMismatches = 0;
    let totalDepartureMismatches = 0;
    for (const m of metrics) {
      totalArrivalMismatches += m.arrivalMismatches;
      totalDepartureMismatches += m.departureMismatches;
    }

    let primaryRiskFactor = 'None';
    if (totalArrivalMismatches > 0 || totalDepartureMismatches > 0) {
      primaryRiskFactor = totalArrivalMismatches >= totalDepartureMismatches 
        ? 'Arrival Port Mismatches' 
        : 'Departure Flights Deviation';
    }

    return {
      totalMonitoredAgents: totalCount,
      activeSuspensions: redCount,
      throttledAgents: yellowCount,
      primaryRiskFactor
    };
  }

  // Get active compliance registry list of sub-agents
  static async getComplianceAgents() {
    const parties = await prisma.party.findMany({
      where: { isCustomer: true },
      include: {
        complianceMetrics: true
      }
    });

    const registry = parties.map(p => {
      const metrics = p.complianceMetrics || {
        totalArrivals: 0,
        totalDepartures: 0,
        arrivalMismatches: 0,
        departureMismatches: 0,
        severeViolations: 0,
        weightedScore: 0.0,
        complianceStatus: 'GREEN'
      };

      let concernDetails = 'Mismatches within normal logistical tolerances.';
      if (metrics.complianceStatus === 'RED') {
        if (metrics.severeViolations > 0) {
          concernDetails = `Severe Overstay: ${metrics.severeViolations} pilgrims overstayed program duration.`;
        } else {
          concernDetails = `Critical flight deviations: Score index reached ${(Number(metrics.weightedScore)).toFixed(4)}.`;
        }
      } else if (metrics.complianceStatus === 'YELLOW') {
        concernDetails = `Warning threshold: ${metrics.arrivalMismatches} arrival delays and ${metrics.departureMismatches} departure mismatches.`;
      }

      return {
        id: p.id,
        partyName: p.partyName,
        partyCode: p.partyCode || 'N/A',
        totalArrivals: metrics.totalArrivals,
        totalDepartures: metrics.totalDepartures,
        arrivalMismatches: metrics.arrivalMismatches,
        departureMismatches: metrics.departureMismatches,
        severeViolations: metrics.severeViolations,
        weightedScore: Number(metrics.weightedScore),
        complianceStatus: metrics.complianceStatus,
        concernDetails
      };
    });

    const statusOrder = { RED: 0, YELLOW: 1, GREEN: 2 };
    return registry.sort((a, b) => {
      const orderA = statusOrder[a.complianceStatus as keyof typeof statusOrder];
      const orderB = statusOrder[b.complianceStatus as keyof typeof statusOrder];
      if (orderA !== orderB) return orderA - orderB;
      return b.weightedScore - a.weightedScore;
    });
  }

  // Get compliance audit log timeline for agent
  static async getComplianceAgentLogs(partyId: string) {
    return await prisma.complianceAuditLog.findMany({
      where: { subAgentId: partyId },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Force override an agent's compliance status
  static async overrideComplianceStatus(partyId: string, status: 'GREEN' | 'YELLOW' | 'RED', reason: string) {
    const existing = await prisma.subAgentMetric.findUnique({
      where: { subAgentId: partyId }
    });

    const previousStatus = existing ? existing.complianceStatus : 'GREEN';

    await prisma.subAgentMetric.upsert({
      where: { subAgentId: partyId },
      create: {
        subAgentId: partyId,
        totalArrivals: 0,
        totalDepartures: 0,
        arrivalMismatches: 0,
        departureMismatches: 0,
        severeViolations: status === 'RED' ? 1 : 0,
        weightedScore: status === 'RED' ? 0.06 : (status === 'YELLOW' ? 0.03 : 0.0),
        complianceStatus: status
      },
      update: {
        complianceStatus: status,
        severeViolations: status === 'RED' ? 1 : undefined,
        weightedScore: status === 'RED' ? 0.06 : (status === 'YELLOW' ? 0.03 : 0.0)
      }
    });

    if (previousStatus !== status) {
      await prisma.complianceAuditLog.create({
        data: {
          subAgentId: partyId,
          previousStatus: previousStatus as any,
          newStatus: status,
          reasonSummary: `Manual override by Admin: ${reason}`
        }
      });
    }
  }

  // Recalculate compliance metrics using local db data
  static async recalculateCompliance() {
    const windowDays = 30;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - windowDays);

    const parties = await prisma.party.findMany({
      where: { isCustomer: true }
    });

    let updatedCount = 0;

    for (const party of parties) {
      const bookings = await prisma.umrahVisaBooking.findMany({
        where: {
          partyId: party.id,
          isDeleted: false
        },
        include: {
          passengers: {
            where: { isDeleted: false },
            include: {
              nusukMismatches: {
                where: { resolved: false }
              }
            }
          }
        }
      });

      let totalArrivals = 0;
      let totalDepartures = 0;
      let arrivalMismatches = 0;
      let departureMismatches = 0;
      let severeViolations = 0;

      for (const booking of bookings) {
        for (const passenger of booking.passengers) {
          const entryDate = passenger.entryDate;
          const exitDate = passenger.exitDate;

          const isArrivalInWindow = entryDate && entryDate >= thirtyDaysAgo;
          const isDepartureInWindow = exitDate && exitDate >= thirtyDaysAgo;

          if (isArrivalInWindow) totalArrivals++;
          if (isDepartureInWindow) totalDepartures++;

          for (const mismatch of passenger.nusukMismatches) {
            const mType = mismatch.mismatchType;
            if (isArrivalInWindow && (mType === 'entry' || mType === 'both')) {
              arrivalMismatches++;
            }
            if (isDepartureInWindow && (mType === 'exit' || mType === 'both')) {
              departureMismatches++;
            }
          }

          const mutamerStatus = passenger.mutamerStatus || '';
          const isSevere = mutamerStatus === 'Program Duration Exceeded' || 
            mutamerStatus.toLowerCase().includes('runaway') || 
            mutamerStatus.toLowerCase().includes('overstay');

          if (isSevere && (isArrivalInWindow || isDepartureInWindow)) {
            severeViolations++;
          }
        }
      }

      const BUFFER_CONSTANT = 10;
      const ARRIVAL_WEIGHT = 1.0;
      const DEPARTURE_WEIGHT = 2.0;
      const YELLOW_THRESHOLD = 0.02;
      const RED_THRESHOLD = 0.05;

      const R_A = arrivalMismatches / (totalArrivals + BUFFER_CONSTANT);
      const R_D = departureMismatches / (totalDepartures + BUFFER_CONSTANT);
      
      const score = ((R_A * ARRIVAL_WEIGHT) + (R_D * DEPARTURE_WEIGHT)) / (ARRIVAL_WEIGHT + DEPARTURE_WEIGHT);

      let complianceStatus: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
      if (score >= RED_THRESHOLD || severeViolations > 0) {
        complianceStatus = 'RED';
      } else if (score >= YELLOW_THRESHOLD) {
        complianceStatus = 'YELLOW';
      }

      const existingMetric = await prisma.subAgentMetric.findUnique({
        where: { subAgentId: party.id }
      });

      const previousStatus = existingMetric ? existingMetric.complianceStatus : 'GREEN';

      await prisma.subAgentMetric.upsert({
        where: { subAgentId: party.id },
        create: {
          subAgentId: party.id,
          totalArrivals,
          totalDepartures,
          arrivalMismatches,
          departureMismatches,
          severeViolations,
          weightedScore: score,
          complianceStatus,
        },
        update: {
          totalArrivals,
          totalDepartures,
          arrivalMismatches,
          departureMismatches,
          severeViolations,
          weightedScore: score,
          complianceStatus,
        }
      });

      if (previousStatus !== complianceStatus) {
        await prisma.complianceAuditLog.create({
          data: {
            subAgentId: party.id,
            previousStatus: previousStatus as any,
            newStatus: complianceStatus,
            reasonSummary: `Automated nightly recalibration: Score index reached ${score.toFixed(4)} with ${severeViolations} severe violations.`
          }
        });
      }

      updatedCount++;
    }

    return {
      message: 'Compliance metrics recalculated successfully',
      updatedAgentsCount: updatedCount,
    };
  }

  private static dashboardCache: { data: any; timestamp: number } | null = null;
  private static readonly DASHBOARD_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

  static invalidateDashboardCache() {
    this.dashboardCache = null;
  }

  // Get compliance dashboard metrics
  static async getComplianceDashboard(role: string, partyId?: string) {
    const isParty = role === 'party' || role === 'customer';
    
    if (isParty && partyId) {
      const metric = await prisma.subAgentMetric.findUnique({
        where: { subAgentId: partyId }
      });
      const party = await prisma.party.findUnique({
        where: { id: partyId }
      });
      const logs = await prisma.complianceAuditLog.findMany({
        where: { subAgentId: partyId },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      return {
        isParty: true,
        partyName: party?.partyName || 'Your Agency',
        complianceStatus: metric?.complianceStatus || 'GREEN',
        weightedScore: Number(metric?.weightedScore || 0),
        totalArrivals: metric?.totalArrivals || 0,
        totalDepartures: metric?.totalDepartures || 0,
        arrivalMismatches: metric?.arrivalMismatches || 0,
        departureMismatches: metric?.departureMismatches || 0,
        severeViolations: metric?.severeViolations || 0,
        recentLogs: logs
      };
    }

    // Serve cached metrics for Admin/Staff if fresh (< 3 mins old)
    if (!isParty && this.dashboardCache && (Date.now() - this.dashboardCache.timestamp < this.DASHBOARD_CACHE_TTL)) {
      return this.dashboardCache.data;
    }

    const summary = await this.getComplianceSummary();
    const agents = await this.getComplianceAgents();
    const over85DaysCount = await prisma.nusukMutamerRecord.count({
      where: { isOver85Days: true }
    });
    const consulateReviewCount = await prisma.nusukMutamerRecord.count({
      where: {
        OR: [
          { mutamerStateId: { in: [9, 10, 11] } },
          { mutamerStateName: { in: ['Consulate Review', 'Visa Not Issued', 'Visa Rejected'] } }
        ]
      }
    });

    // 1. Visa Summary (System vs Nusuk metrics)
    const systemPassengersCount = await prisma.umrahPassenger.count({
      where: {
        isDeleted: false,
        booking: { isDeleted: false }
      }
    });

    const nusukPassengersCount = await prisma.nusukMutamerRecord.count();

    const visasIssuedCount = await prisma.nusukMutamerRecord.count({
      where: {
        visaNumber: { not: null, gt: '' }
      }
    });

    const passengersInKSACount = await prisma.nusukMutamerRecord.count({
      where: {
        entryDate: { not: null },
        exitDate: null
      }
    });

    const passengersToArriveCount = await prisma.nusukMutamerRecord.count({
      where: {
        entryDate: null,
        visaNumber: { not: null, gt: '' }
      }
    });

    // 2. Visa Applications Breakdown by Type
    const individualBookings = await prisma.umrahVisaBooking.findMany({
      where: {
        isDeleted: false,
        visaType: { not: 'group_visa' },
      },
      select: {
        id: true,
        passengerCount: true,
        sponsorIqamaDetails: { select: { id: true } },
        hotelBookings: { select: { id: true } },
      }
    });

    let indHotelBookings = 0;
    let indHotelPax = 0;
    let indIqamaBookings = 0;
    let indIqamaPax = 0;
    let indUnspecifiedBookings = 0;
    let indUnspecifiedPax = 0;

    for (const b of individualBookings) {
      const pax = b.passengerCount || 0;
      if (b.sponsorIqamaDetails && b.sponsorIqamaDetails.length > 0) {
        indIqamaBookings++;
        indIqamaPax += pax;
      } else if (b.hotelBookings && b.hotelBookings.length > 0) {
        indHotelBookings++;
        indHotelPax += pax;
      } else {
        indUnspecifiedBookings++;
        indUnspecifiedPax += pax;
      }
    }

    const groupBookings = await prisma.umrahVisaBooking.findMany({
      where: {
        isDeleted: false,
        visaType: 'group_visa',
      },
      select: {
        passengerCount: true,
      }
    });

    const groupBookingsCount = groupBookings.length;
    const groupPaxCount = groupBookings.reduce((sum, b) => sum + (b.passengerCount || 0), 0);

    // 3. Mismatch metrics (Today, Yesterday, Recent)
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

    const todayCount = await prisma.nusukMismatch.count({
      where: {
        resolved: false,
        createdAt: { gte: startOfToday }
      }
    });

    const yesterdayCount = await prisma.nusukMismatch.count({
      where: {
        resolved: false,
        createdAt: { gte: startOfYesterday, lt: startOfToday }
      }
    });

    const mismatches = await prisma.nusukMismatch.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        booking: {
          select: {
            bookingReference: true,
            party: { select: { partyName: true } }
          }
        },
        passenger: {
          select: { fullName: true }
        }
      }
    });

    const recentMismatches = mismatches.map(m => ({
      id: m.id,
      bookingReference: m.booking?.bookingReference || 'N/A',
      partyName: m.booking?.party?.partyName || 'N/A',
      mismatchType: m.mismatchType as 'entry' | 'exit' | 'both' | 'pax_count',
      mutamerName: m.passenger?.fullName || 'N/A',
      createdAt: m.createdAt.toISOString(),
    }));

    const result = {
      isParty: false,
      summary: {
        ...summary,
        over85DaysCount,
        consulateReviewCount,
      },
      topRiskAgents: agents.slice(0, 5),
      visaSummary: {
        systemPassengers: systemPassengersCount,
        nusukPassengers: nusukPassengersCount,
        visasIssued: visasIssuedCount,
        consulateReview: consulateReviewCount,
        passengersInKSA: passengersInKSACount,
        passengersToArrive: passengersToArriveCount,
      },
      visaBreakdown: {
        individual: {
          hotel: { bookings: indHotelBookings, passengers: indHotelPax },
          iqama: { bookings: indIqamaBookings, passengers: indIqamaPax },
          unspecified: { bookings: indUnspecifiedBookings, passengers: indUnspecifiedPax },
        },
        group: {
          bookings: groupBookingsCount,
          passengers: groupPaxCount,
        },
      },
      todayCount,
      yesterdayCount,
      recentMismatches,
    };

    this.dashboardCache = { data: result, timestamp: Date.now() };
    return result;
  }

  /**
   * Get list of Nusuk groups that are NOT found in the system bookings
   */
  static async getUnmatchedNusukGroups(params: {
    page?: number;
    limit?: number;
    search?: string;
    eaCode?: number | string;
    umrahCompany?: string;
  }) {
    const page = params.page ? parseInt(String(params.page), 10) : 1;
    const limit = params.limit ? parseInt(String(params.limit), 10) : 20;
    const skip = (page - 1) * limit;

    // 1. Gather all group numbers registered in system bookings
    const systemBookings = await prisma.umrahVisaBooking.findMany({
      where: { isDeleted: false },
      select: { groupNumber: true, multipleGroupDetails: true }
    });

    const registeredGroupSet = new Set<string>();
    for (const b of systemBookings) {
      if (b.groupNumber) {
        b.groupNumber.split(',').forEach(g => {
          const clean = g.trim();
          if (clean) registeredGroupSet.add(clean);
        });
      }
      if (b.multipleGroupDetails && Array.isArray(b.multipleGroupDetails)) {
        for (const mg of b.multipleGroupDetails as any[]) {
          if (mg.groupNumber) {
            const clean = String(mg.groupNumber).trim();
            if (clean) registeredGroupSet.add(clean);
          }
        }
      }
    }

    // 2. Query all distinct group numbers in nusuk_mutamer_records
    const where: any = {
      groupNumber: { not: null }
    };
    if (params.umrahCompany && params.umrahCompany !== 'all') {
      where.umrahCompanyName = { contains: params.umrahCompany };
    }
    if (params.eaCode && params.eaCode !== 'all') {
      where.eaCode = parseInt(String(params.eaCode), 10);
    }
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { groupNumber: { contains: q } },
        { groupName: { contains: q } },
        { eaName: { contains: q } },
        { subEAName: { contains: q } },
        { umrahCompanyName: { contains: q } },
      ];
    }

    const allNusukGroups = await prisma.nusukMutamerRecord.groupBy({
      by: ['groupNumber', 'groupName', 'eaName', 'eaCode', 'subEAName', 'subEACode', 'umrahCompanyName'],
      where,
      _count: { id: true },
      _min: { mofaIssueDate: true, entryDate: true },
    });

    // 3. Filter groups that are NOT in registeredGroupSet
    const unmatched = allNusukGroups.filter(g => g.groupNumber && !registeredGroupSet.has(g.groupNumber.trim()));

    const total = unmatched.length;
    const paginated = unmatched.slice(skip, skip + limit);

    // Get sample mutamers and statistics for each unmatched group in this page
    const groupDetails = await Promise.all(paginated.map(async (g) => {
      const groupNum = g.groupNumber!;
      const [visasIssued, inKsa, sampleMutamers] = await Promise.all([
        prisma.nusukMutamerRecord.count({
          where: { groupNumber: groupNum, visaNumber: { not: null, gt: '' } }
        }),
        prisma.nusukMutamerRecord.count({
          where: { groupNumber: groupNum, entryDate: { not: null }, exitDate: null }
        }),
        prisma.nusukMutamerRecord.findMany({
          where: { groupNumber: groupNum },
          take: 5,
          select: {
            fullName: true,
            passportNumber: true,
            visaNumber: true,
            mofaNumber: true,
            mutamerStateName: true,
            entryDate: true,
            exitDate: true,
          }
        })
      ]);

      return {
        groupNumber: g.groupNumber,
        groupName: g.groupName || 'N/A',
        eaName: g.eaName || 'N/A',
        eaCode: g.eaCode,
        subEAName: g.subEAName || 'N/A',
        subEACode: g.subEACode,
        umrahCompanyName: g.umrahCompanyName || 'N/A',
        totalPax: g._count.id,
        visasIssued,
        inKsa,
        firstDate: g._min.entryDate || g._min.mofaIssueDate,
        sampleMutamers,
      };
    }));

    return {
      unmatchedGroups: groupDetails,
      totalUnmatchedGroups: total,
      totalUnmatchedPax: unmatched.reduce((sum, g) => sum + g._count.id, 0),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      }
    };
  }

  // Search passengers globally by passport number
  static async searchPassengersByPassport(query: string, role?: string, partyId?: string) {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const isPartyUser = (role === 'customer' || role === 'party') && !!partyId;

    const where: any = {
      isDeleted: false,
      booking: {
        isDeleted: false,
        ...(isPartyUser ? { partyId } : {})
      },
      OR: [
        { passportNumber: { contains: trimmed } },
        { fullName: { contains: trimmed } },
        { visaNumber: { contains: trimmed } },
        { borderNumber: { contains: trimmed } },
        { mofaNumber: { contains: trimmed } },
        { phoneNumber: { contains: trimmed } },
        { booking: { bookingReference: { contains: trimmed } } },
        { booking: { groupNumber: { contains: trimmed } } },
      ]
    };

    const passengers = await prisma.umrahPassenger.findMany({
      where,
      take: 50,
      orderBy: { updatedAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true,
            bookingReference: true,
            groupNumber: true,
            status: true,
            submittedAt: true,
            createdAt: true,
            party: {
              select: {
                id: true,
                partyName: true,
                partyCode: true,
                contactNumber: true,
                whatsappNumber: true,
              }
            },
            umrahVisaProvider: {
              select: {
                id: true,
                partyName: true,
                partyCode: true,
              }
            },
            vouchers: {
              select: {
                id: true,
                voucherNumber: true,
                isQuickVoucher: true,
                reservationDate: true,
                transportCompany: {
                  select: {
                    partyName: true,
                    partyCode: true,
                  }
                }
              },
              take: 1
            },
            hotelBookings: {
              where: { isAlternate: false },
              include: {
                hotel: { select: { id: true, name: true, city: true } },
                city: { select: { id: true, name: true } }
              }
            },
            travelDetails: {
              where: { isAlternate: false },
              include: {
                arrivalAirport: { select: { id: true, name: true, code: true } },
                departureAirport: { select: { id: true, name: true, code: true } }
              }
            },
            sponsorIqamaDetails: {
              where: { isAlternate: false },
              select: {
                iqamaSponserName: true,
                iqamaNumber: true,
                sponserMobileNumber: true,
                sponserNationalShortAddress: true,
                makkahHotelName: true,
                madinahHotelName: true,
              }
            }
          }
        }
      }
    });

    return passengers.map((p: any) => {
      let makkaHotelName = '';
      let madinaHotelName = '';
      let makkahCheckIn: any = null;
      let makkahCheckOut: any = null;
      let madinahCheckIn: any = null;
      let madinahCheckOut: any = null;
      
      if (p.booking?.hotelBookings) {
        p.booking.hotelBookings.forEach((hb: any) => {
          const cityName = (hb.city?.name || hb.hotel?.city || '').toLowerCase();
          if (cityName.includes('makkah') || cityName.includes('makka') || cityName.includes('mcca') || cityName.includes('meca')) {
            makkaHotelName = hb.hotel?.name || makkaHotelName;
            makkahCheckIn = hb.checkInDate || makkahCheckIn;
            makkahCheckOut = hb.checkOutDate || makkahCheckOut;
          } else if (cityName.includes('madinah') || cityName.includes('madina') || cityName.includes('medina')) {
            madinaHotelName = hb.hotel?.name || madinaHotelName;
            madinahCheckIn = hb.checkInDate || madinahCheckIn;
            madinahCheckOut = hb.checkOutDate || madinahCheckOut;
          }
        });
      }

      const iqamaInfo = p.booking?.sponsorIqamaDetails?.[0] || null;
      if (!makkaHotelName && iqamaInfo?.makkahHotelName) {
        makkaHotelName = iqamaInfo.makkahHotelName;
      }
      if (!madinaHotelName && iqamaInfo?.madinahHotelName) {
        madinaHotelName = iqamaInfo.madinahHotelName;
      }

      const voucher = p.booking?.vouchers?.[0] || null;
      const travel = p.booking?.travelDetails?.[0] || null;

      let daysInKingdom: number | null = null;
      if (p.entryDate) {
        const entry = new Date(p.entryDate);
        const endDate = p.exitDate ? new Date(p.exitDate) : new Date();
        const diffTime = Math.abs(endDate.getTime() - entry.getTime());
        daysInKingdom = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        id: p.id,
        fullName: p.fullName,
        passportNumber: p.passportNumber,
        nationality: p.nationality,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth,
        passportExpiry: p.passportExpiry,
        phoneNumber: p.phoneNumber,
        visaNumber: p.visaNumber,
        mofaNumber: p.mofaNumber,
        borderNumber: p.borderNumber,
        visaIssueDate: p.visaIssueDate,
        mutamerStatus: p.mutamerStatus || 'N/A',
        currentlyInKingdom: p.currentlyInKingdom || 'No',
        isConsulateReview: p.isConsulateReview || false,
        isLeadPassenger: p.isLeadPassenger || false,
        entryDate: p.entryDate,
        exitDate: p.exitDate,
        daysInKingdom,
        booking: {
          id: p.booking?.id || '',
          bookingReference: p.booking?.bookingReference || 'N/A',
          groupNumber: p.booking?.groupNumber || 'N/A',
          status: p.booking?.status || 'N/A',
          submittedAt: p.booking?.submittedAt || null,
          createdAt: p.booking?.createdAt || null,
          party: {
            id: p.booking?.party?.id || '',
            partyName: p.booking?.party?.partyName || 'N/A',
            partyCode: p.booking?.party?.partyCode || '',
            contactNumber: p.booking?.party?.contactNumber || '',
            whatsappNumber: p.booking?.party?.whatsappNumber || '',
          },
          umrahCompany: p.booking?.umrahVisaProvider?.partyName || 'N/A',
          voucher: voucher ? {
            id: voucher.id,
            voucherNumber: voucher.voucherNumber,
            isQuickVoucher: voucher.isQuickVoucher,
            reservationDate: voucher.reservationDate,
            transportCompanyName: voucher.transportCompany?.partyName || 'N/A'
          } : null,
          makkaHotel: makkaHotelName || 'N/A',
          makkahCheckIn,
          makkahCheckOut,
          madinaHotel: madinaHotelName || 'N/A',
          madinahCheckIn,
          madinahCheckOut,
          travel: travel ? {
            arrivalFlightNumber: travel.arrivalFlightNumber,
            arrivalDateTime: travel.arrivalDateTime,
            arrivalAirport: travel.arrivalAirport?.name || travel.arrivalAirport?.code || 'N/A',
            departureFlightNumber: travel.departureFlightNumber,
            departureDateTime: travel.departureDateTime,
            departureAirport: travel.departureAirport?.name || travel.departureAirport?.code || 'N/A',
          } : null,
          iqama: iqamaInfo ? {
            hostName: iqamaInfo.iqamaSponserName,
            iqamaNumber: iqamaInfo.iqamaNumber,
            phoneNumber: iqamaInfo.sponserMobileNumber,
            address: iqamaInfo.sponserNationalShortAddress,
          } : null
        }
      };
    });
  }
}
