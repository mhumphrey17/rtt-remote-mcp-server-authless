import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Realtime Trains MCP Server - Consolidated Edition
 *
 * 6 powerful tools covering all free-tier functionality:
 * 1. get_station_board - Departures/arrivals with extensive filtering
 * 2. get_service_info - Detailed train service information
 * 3. search_journeys - Journey planning between stations
 * 4. check_connection - Connection viability checking
 * 5. analyze_route - Route performance analysis
 * 6. lookup_station - Station code lookup utility
 */
export class RealtimeTrainsMCP extends McpAgent {
	server = new McpServer({
		name: "Realtime Trains API",
		version: "2.0.0",
	});

	// API Configuration
	private readonly API_BASE_URL = 'https://api.rtt.io/api/v1';
	private readonly API_USERNAME = 'rttapi_Mhumphrey';
	private readonly API_PASSWORD = '93e4de518180a28a130c0af8c0250d3e23307bac';

	// Common UK station codes for lookup
	private readonly STATION_CODES: { [key: string]: string } = {
		// London Terminals
		'london kings cross': 'KGX', 'kings cross': 'KGX', 'king\'s cross': 'KGX',
		'london paddington': 'PAD', 'paddington': 'PAD',
		'london euston': 'EUS', 'euston': 'EUS',
		'london waterloo': 'WAT', 'waterloo': 'WAT',
		'london victoria': 'VIC', 'victoria': 'VIC',
		'london liverpool street': 'LST', 'liverpool street': 'LST',
		'london bridge': 'LBG',
		'london st pancras': 'STP', 'st pancras': 'STP', 'st pancras international': 'STP',
		'london charing cross': 'CHX', 'charing cross': 'CHX',
		'london cannon street': 'CST', 'cannon street': 'CST',
		'london fenchurch street': 'FST', 'fenchurch street': 'FST',
		'london marylebone': 'MYB', 'marylebone': 'MYB',
		// Major Cities
		'birmingham new street': 'BHM', 'birmingham': 'BHM',
		'manchester piccadilly': 'MAN', 'manchester': 'MAN',
		'edinburgh waverley': 'EDB', 'edinburgh': 'EDB',
		'glasgow central': 'GLC', 'glasgow': 'GLC',
		'leeds': 'LDS',
		'bristol temple meads': 'BRI', 'bristol': 'BRI',
		'bath spa': 'BTH', 'bath': 'BTH',
		'reading': 'RDG',
		'oxford': 'OXF',
		'cambridge': 'CBG',
		'york': 'YRK',
		'newcastle': 'NCL',
		'cardiff central': 'CDF', 'cardiff': 'CDF',
		'liverpool lime street': 'LIV', 'liverpool': 'LIV',
		'sheffield': 'SHF',
		'nottingham': 'NOT',
		'brighton': 'BTN',
		'southampton central': 'SOU', 'southampton': 'SOU',
		'bournemouth': 'BMH',
		'exeter st davids': 'EXD', 'exeter': 'EXD',
		'plymouth': 'PLY',
		'penzance': 'PNZ',
		'norwich': 'NRW',
		'ipswich': 'IPS',
		'peterborough': 'PBO',
		'coventry': 'COV',
		'milton keynes central': 'MKC', 'milton keynes': 'MKC',
		'swindon': 'SWI',
		'gloucester': 'GCR',
		'cheltenham spa': 'CNM', 'cheltenham': 'CNM',
		'worcester': 'WOS',
		'newport': 'NWP',
		'swansea': 'SWA',
		'crewe': 'CRE',
		'preston': 'PRE',
		'lancaster': 'LAN',
		'carlisle': 'CAR',
		'darlington': 'DAR',
		'durham': 'DHM',
		'doncaster': 'DON',
		'wakefield westgate': 'WKF', 'wakefield': 'WKF',
		'huddersfield': 'HUD',
		'bradford': 'BDI',
		'hull': 'HUL',
		'scarborough': 'SCA',
		'harrogate': 'HGT',
		'stockport': 'SPT',
		'warrington': 'WBQ',
		'wigan': 'WGN',
		'blackpool': 'BPN',
		'southport': 'SOP',
		'chester': 'CTR',
		'shrewsbury': 'SHR',
		'wolverhampton': 'WVH',
		'stoke on trent': 'SOT', 'stoke': 'SOT',
		'derby': 'DBY',
		'leicester': 'LEI',
		'northampton': 'NMP',
		'luton': 'LUT',
		'st albans': 'SAC',
		'watford junction': 'WFJ', 'watford': 'WFJ',
		'guildford': 'GLD',
		'woking': 'WOK',
		'basingstoke': 'BSK',
		'winchester': 'WIN',
		'portsmouth': 'PMS',
		'chichester': 'CCH',
		'worthing': 'WRH',
		'eastbourne': 'EBN',
		'hastings': 'HGS',
		'tunbridge wells': 'TBW',
		'maidstone': 'MDE',
		'canterbury': 'CBW',
		'dover': 'DVP',
		'folkestone': 'FKC',
		'ashford international': 'AFK', 'ashford': 'AFK',
		'sevenoaks': 'SEV',
		'orpington': 'ORP',
		'bromley south': 'BMS', 'bromley': 'BMS',
		'croydon': 'ECR',
		'clapham junction': 'CLJ',
		'wimbledon': 'WIM',
		'richmond': 'RMD',
		'ealing broadway': 'EAL', 'ealing': 'EAL',
		'slough': 'SLO',
		'maidenhead': 'MAI',
		'high wycombe': 'HWY',
		'aylesbury': 'AYS',
		'banbury': 'BAN',
		'leamington spa': 'LMS', 'leamington': 'LMS',
		'stratford upon avon': 'SAV', 'stratford-upon-avon': 'SAV',
		'hereford': 'HFD',
		'aberystwyth': 'AYW',
		'llandudno': 'LLD',
		'holyhead': 'HHD',
		'inverness': 'INV',
		'aberdeen': 'ABD',
		'dundee': 'DEE',
		'perth': 'PTH',
		'stirling': 'STG',
		'falkirk': 'FKK',
		'motherwell': 'MTH',
		'ayr': 'AYR',
		'kilmarnock': 'KMK',
		'dumfries': 'DMF',
		'montpelier': 'MTP',
	};

	/**
	 * Make authenticated request to Realtime Trains API
	 */
	private async makeApiRequest(endpoint: string): Promise<any> {
		const url = `${this.API_BASE_URL}${endpoint}`;
		const credentials = btoa(`${this.API_USERNAME}:${this.API_PASSWORD}`);

		const response = await fetch(url, {
			headers: {
				'Authorization': `Basic ${credentials}`,
				'Accept': 'application/json',
				'User-Agent': 'RealtimeTrains-MCP/2.0'
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				throw new Error(`Not found: ${endpoint}`);
			} else if (response.status === 401) {
				throw new Error('Authentication failed');
			} else if (response.status === 403) {
				throw new Error('Access forbidden');
			} else if (response.status >= 500) {
				throw new Error(`Server error (${response.status})`);
			}
			throw new Error(`API error: ${response.status}`);
		}

		return response.json();
	}

	/**
	 * Get current UK time
	 */
	private getUKTime(): Date {
		const now = new Date();
		return new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
	}

	/**
	 * Format date to YYYY/MM/DD
	 */
	private formatDateForApi(date?: string): string {
		if (date) {
			// Accept YYYY-MM-DD and convert to YYYY/MM/DD
			if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
				return date.replace(/-/g, '/');
			}
			if (/^\d{4}\/\d{2}\/\d{2}$/.test(date)) {
				return date;
			}
			throw new Error('Date must be YYYY-MM-DD or YYYY/MM/DD format');
		}
		const uk = this.getUKTime();
		return `${uk.getFullYear()}/${String(uk.getMonth() + 1).padStart(2, '0')}/${String(uk.getDate()).padStart(2, '0')}`;
	}

	/**
	 * Format time HHMM to HH:MM
	 */
	private formatTime(time?: string): string {
		if (!time) return '--:--';
		if (time.length === 4) return `${time.slice(0, 2)}:${time.slice(2)}`;
		if (time.length === 6) return `${time.slice(0, 2)}:${time.slice(2, 4)}`;
		return time;
	}

	/**
	 * Normalize time from HH:MM or H:MM format to HHMM format
	 * Ensures leading zeros and removes colons for API calls and comparisons
	 */
	private normalizeTimeToHHMM(time: string): string {
		// Try to parse HH:MM or H:MM format
		const match = time.match(/^(\d{1,2}):(\d{2})$/);
		if (match) {
			const hours = match[1].padStart(2, '0');
			const minutes = match[2];
			return hours + minutes;
		}

		// If already 4 digits without colon, validate and return
		const cleaned = time.replace(/:/g, '');
		if (cleaned.length === 4 && /^\d{4}$/.test(cleaned)) {
			return cleaned;
		}

		// If 3 digits (e.g., "930" from malformed "9:30"), pad to 4
		if (cleaned.length === 3 && /^\d{3}$/.test(cleaned)) {
			return '0' + cleaned;
		}

		// Invalid format - throw error
		throw new Error(`Invalid time format: ${time}. Expected HH:MM format (e.g., 09:30 or 14:00)`);
	}

	/**
	 * Calculate delay in minutes
	 */
	private calculateDelay(scheduled?: string, actual?: string): number {
		if (!scheduled || !actual) return 0;
		const schedMins = parseInt(scheduled.slice(0, 2)) * 60 + parseInt(scheduled.slice(2, 4));
		const actMins = parseInt(actual.slice(0, 2)) * 60 + parseInt(actual.slice(2, 4));
		return actMins - schedMins;
	}

	/**
	 * Extract origins from service
	 */
	private getOrigins(service: any): string[] {
		const origins: string[] = [];

		// Search API format
		if (service.locationDetail?.origin) {
			for (const o of service.locationDetail.origin) {
				if (o.description) origins.push(o.description);
			}
		}
		// Service API format
		if (origins.length === 0 && service.origin) {
			for (const o of service.origin) {
				if (o.description) origins.push(o.description);
			}
		}

		return origins.length > 0 ? origins : ['Unknown'];
	}

	/**
	 * Extract destinations from service
	 */
	private getDestinations(service: any): string[] {
		const destinations: string[] = [];

		// Search API format
		if (service.locationDetail?.destination) {
			for (const d of service.locationDetail.destination) {
				if (d.description) destinations.push(d.description);
			}
		}
		// Service API format
		if (destinations.length === 0 && service.destination) {
			for (const d of service.destination) {
				if (d.description) destinations.push(d.description);
			}
		}

		return destinations.length > 0 ? destinations : ['Unknown'];
	}

	/**
	 * Get status text for a service at a location
	 */
	private getStatus(loc: any, type: 'arrival' | 'departure'): { status: string; delay: number } {
		const scheduled = type === 'arrival' ? loc.gbttBookedArrival : loc.gbttBookedDeparture;
		const realtime = type === 'arrival' ? loc.realtimeArrival : loc.realtimeDeparture;
		const isActual = type === 'arrival' ? loc.realtimeArrivalActual : loc.realtimeDepartureActual;

		if (loc.cancelReasonShortText) {
			return { status: 'CANCELLED', delay: 0 };
		}

		if (isActual) {
			return { status: type === 'arrival' ? 'Arrived' : 'Departed', delay: 0 };
		}

		if (realtime && scheduled) {
			const delay = this.calculateDelay(scheduled, realtime);
			if (delay > 0) return { status: `${delay}m late`, delay };
			if (delay < 0) return { status: `${Math.abs(delay)}m early`, delay };
		}

		// Check service location
		if (loc.serviceLocation) {
			const posMap: { [k: string]: string } = {
				'APPR_STAT': 'Approaching',
				'APPR_PLAT': 'Arriving',
				'AT_PLAT': 'At platform',
				'DEP_PREP': 'Preparing',
				'DEP_READY': 'Ready'
			};
			if (posMap[loc.serviceLocation]) {
				return { status: posMap[loc.serviceLocation], delay: 0 };
			}
		}

		return { status: 'On time', delay: 0 };
	}

	/**
	 * Get platform info string
	 */
	private getPlatformStr(loc: any): string {
		if (!loc.platform) return '-';
		let str = loc.platform;
		if (loc.platformChanged) str += '!';
		else if (!loc.platformConfirmed) str += '?';
		return str;
	}

	/**
	 * Lookup station code from name
	 * Returns verified flag to indicate if code was found in our database
	 */
	private lookupStationCode(query: string): Array<{ name: string; code: string; verified: boolean }> {
		const q = query.toLowerCase().trim();
		const results: Array<{ name: string; code: string; verified: boolean }> = [];

		// Check if already a valid 3-letter code
		if (/^[A-Z]{3}$/i.test(q)) {
			// Verify it exists in our lookup by checking values
			const upperQ = q.toUpperCase();
			for (const [name, code] of Object.entries(this.STATION_CODES)) {
				if (code === upperQ) {
					results.push({
						name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
						code,
						verified: true
					});
					break;
				}
			}
			if (results.length === 0) {
				// Return as-is, might be valid but unverified
				results.push({ name: query.toUpperCase(), code: q.toUpperCase(), verified: false });
			}
			return results;
		}

		// Search by name
		for (const [name, code] of Object.entries(this.STATION_CODES)) {
			if (name.includes(q) || q.includes(name)) {
				const displayName = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
				// Avoid duplicates
				if (!results.find(r => r.code === code)) {
					results.push({ name: displayName, code, verified: true });
				}
			}
		}

		return results;
	}

	async init() {
		// ===== TOOL 1: GET STATION BOARD =====
		this.server.registerTool(
			"get_station_board",
			{
				title: "Station Board",
				description: `Get live departures or arrivals at any UK station with extensive filtering options.

USAGE: View departures/arrivals, filter by destination/origin, operator, platform, time, status.

PARAMETERS:
- station: 3-letter CRS code (e.g., PAD, KGX, BHM) or station name
- type: "departures" or "arrivals" (default: departures)
- to_station: Filter departures to trains calling at this station
- from_station: Filter arrivals to trains from this station
- operator: Filter by operator code (e.g., GW, VT, XC)
- platform: Filter by platform number
- time_from: HH:MM - show services from this time
- time_to: HH:MM - show services until this time
- date: YYYY-MM-DD for historical data (up to 14 days back)
- status_filter: "all", "delayed", "cancelled", "on_time"
- min_delay_mins: Minimum delay threshold for delayed filter
- limit: Max results (default 15, max 30)
- include_summary: Add station health stats

RETURNS: Formatted board with times, destinations/origins, platforms, status, delays, service UIDs.`,
				inputSchema: {
					station: z.string().describe("Station CRS code (e.g., PAD) or name (e.g., Paddington)"),
					type: z.enum(["departures", "arrivals"]).optional().describe("Board type"),
					to_station: z.string().optional().describe("Filter to trains calling at this destination"),
					from_station: z.string().optional().describe("Filter to trains from this origin"),
					operator: z.string().optional().describe("Filter by operator code (e.g., GW, VT)"),
					platform: z.string().optional().describe("Filter by platform number"),
					time_from: z.string().optional().describe("Show services from HH:MM"),
					time_to: z.string().optional().describe("Show services until HH:MM"),
					date: z.string().optional().describe("Date YYYY-MM-DD (default: today)"),
					status_filter: z.enum(["all", "delayed", "cancelled", "on_time"]).optional().describe("Filter by status"),
					min_delay_mins: z.number().optional().describe("Minimum delay minutes for 'delayed' filter"),
					limit: z.number().optional().describe("Max results (default 15, max 30)"),
					include_summary: z.boolean().optional().describe("Include station health summary")
				}
			},
			async (params: {
				station: string;
				type?: "departures" | "arrivals";
				to_station?: string;
				from_station?: string;
				operator?: string;
				platform?: string;
				time_from?: string;
				time_to?: string;
				date?: string;
				status_filter?: "all" | "delayed" | "cancelled" | "on_time";
				min_delay_mins?: number;
				limit?: number;
				include_summary?: boolean;
			}) => {
				try {
					const {
						station,
						type = "departures",
						to_station,
						from_station,
						operator,
						platform,
						time_from,
						time_to,
						date,
						status_filter = "all",
						min_delay_mins = 5,
						limit = 15,
						include_summary = false
					} = params;

					// Resolve station code
					const stationLookup = this.lookupStationCode(station);
					if (stationLookup.length === 0) {
						return { content: [{ type: "text", text: `Unknown station: ${station}` }] };
					}
					const stationCode = stationLookup[0].code;
					const stationVerified = stationLookup[0].verified;

					// Build endpoint
					const apiDate = this.formatDateForApi(date);
					let endpoint: string;

					// Add destination filter if provided (must use /to/ format before date)
					if (to_station && type === "departures") {
						const destLookup = this.lookupStationCode(to_station);
						if (destLookup.length > 0) {
							endpoint = `/json/search/${stationCode}/to/${destLookup[0].code}/${apiDate}`;
						} else {
							endpoint = `/json/search/${stationCode}/${apiDate}`;
						}
					} else {
						endpoint = `/json/search/${stationCode}/${apiDate}`;
					}

					// Add time filter
					const ukTime = this.getUKTime();
					let timeFilter: string;
					if (time_from) {
						try {
							timeFilter = this.normalizeTimeToHHMM(time_from);
						} catch (error: any) {
							return { content: [{ type: "text", text: `Error in time_from parameter: ${error.message}` }] };
						}
					} else {
						timeFilter = `${String(ukTime.getHours()).padStart(2, '0')}${String(ukTime.getMinutes()).padStart(2, '0')}`;
					}
					endpoint += `?from=${timeFilter}`;

					const data = await this.makeApiRequest(endpoint);
					const services = data.services || [];
					// Prefer our station name lookup over API response
					const stationName = stationLookup[0].name || data.location?.name || stationCode;

					// Warn if using unverified station code
					let warningMsg = '';
					if (!stationVerified) {
						warningMsg = `WARNING: Station code "${stationCode}" not found in database.\n` +
							`This may be a valid CRS code, but if results are unexpected, verify with lookup_station tool.\n\n`;
					}
					// Validate we got meaningful results
					if (services.length === 0 && !stationVerified) {
						return {
							content: [{
								type: "text",
								text: `${warningMsg}No services found for station code "${stationCode}".\n\n` +
									`This code may not be valid. Use lookup_station to find the correct CRS code.`
							}]
						};
					}

					// Process and filter services
					let processed: Array<{
						time: string;
						destination: string;
						origin: string;
						platform: string;
						status: string;
						delay: number;
						uid: string;
						operator: string;
						cancelled: boolean;
					}> = [];

					for (const svc of services) {
						const loc = svc.locationDetail;
						if (!loc) continue;

						const isArrival = type === "arrivals";
						const timeField = isArrival ? loc.gbttBookedArrival : loc.gbttBookedDeparture;
						if (!timeField) continue;

						// Time range filter
						if (time_to) {
							let timeToHHMM: string;
							try {
								timeToHHMM = this.normalizeTimeToHHMM(time_to);
							} catch (error: any) {
								return { content: [{ type: "text", text: `Error in time_to parameter: ${error.message}` }] };
							}
							const timeToNum = parseInt(timeToHHMM);
							const svcTimeNum = parseInt(timeField);
							if (svcTimeNum > timeToNum) continue;
						}

						// Platform filter
						if (platform && loc.platform !== platform) continue;

						// Operator filter
						if (operator && svc.atocCode?.toUpperCase() !== operator.toUpperCase()) continue;

						// Origin filter for arrivals
						if (from_station && type === "arrivals") {
							const origins = this.getOrigins(svc);
							const fromLookup = this.lookupStationCode(from_station);
							if (fromLookup.length > 0) {
								const fromName = fromLookup[0].name.toLowerCase();
								if (!origins.some(o => o.toLowerCase().includes(fromName))) continue;
							}
						}

						const statusInfo = this.getStatus(loc, isArrival ? 'arrival' : 'departure');
						const isCancelled = !!loc.cancelReasonShortText;

						// Status filter
						if (status_filter === "delayed" && (statusInfo.delay < min_delay_mins || isCancelled)) continue;
						if (status_filter === "cancelled" && !isCancelled) continue;
						if (status_filter === "on_time" && (statusInfo.delay !== 0 || isCancelled)) continue;

						processed.push({
							time: timeField,
							destination: this.getDestinations(svc)[0],
							origin: this.getOrigins(svc)[0],
							platform: this.getPlatformStr(loc),
							status: statusInfo.status,
							delay: statusInfo.delay,
							uid: svc.serviceUid || '',
							operator: svc.atocCode || '',
							cancelled: isCancelled
						});
					}

					// Sort by time
					processed.sort((a, b) => a.time.localeCompare(b.time));

					// Apply limit
					const maxLimit = Math.min(limit, 30);
					processed = processed.slice(0, maxLimit);

					// Build output
					const header = type === "departures" ? "DEPARTURES" : "ARRIVALS";
					const result: string[] = [];

					// Add warning if present
					if (warningMsg) {
						result.push(warningMsg.trim());
					}

					result.push(
						`${header} - ${stationName}`,
						`${ukTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} | ${apiDate}`,
						''
					);

					// Summary stats if requested
					if (include_summary && services.length > 0) {
						let onTime = 0, delayed = 0, cancelled = 0;
						for (const svc of services) {
							const loc = svc.locationDetail;
							if (!loc) continue;
							if (loc.cancelReasonShortText) { cancelled++; continue; }
							const isArr = type === "arrivals";
							const statusInfo = this.getStatus(loc, isArr ? 'arrival' : 'departure');
							if (statusInfo.delay >= 5) delayed++;
							else onTime++;
						}
						const total = onTime + delayed + cancelled;
						result.push(`SUMMARY: ${Math.round(onTime/total*100)}% on-time | ${delayed} delayed | ${cancelled} cancelled`);
						result.push('');
					}

					if (processed.length === 0) {
						result.push('No services found matching criteria');
					} else {
						// Table header
						const showCol = type === "departures" ? "Destination" : "Origin";
						result.push(`Time  | ${showCol.padEnd(22)} | Plat | Status       | UID`);
						result.push('-'.repeat(70));

						for (const svc of processed) {
							const time = this.formatTime(svc.time);
							const dest = type === "departures" ? svc.destination : svc.origin;
							const destStr = dest.length > 20 ? dest.slice(0, 18) + '..' : dest.padEnd(20);
							const platStr = svc.platform.padEnd(4);
							const statusStr = svc.status.slice(0, 12).padEnd(12);
							result.push(`${time} | ${destStr} | ${platStr} | ${statusStr} | ${svc.uid}`);
						}
					}

					return { content: [{ type: "text", text: result.join('\n') }] };

				} catch (error: any) {
					return { content: [{ type: "text", text: `Error: ${error.message}` }] };
				}
			}
		);

		// ===== TOOL 2: GET SERVICE INFO =====
		this.server.registerTool(
			"get_service_info",
			{
				title: "Service Info",
				description: `Get detailed information about a specific train service.

USAGE: View complete journey details, all calling points, live tracking, platform changes.

PARAMETERS:
- service_uid: 6-character service ID from station board (e.g., W72419)
- date: YYYY-MM-DD (must match when service runs)
- check_stops_at: Optional CRS code - check if train stops at this station
- include_live_tracking: Show current position and progress (default: true)

RETURNS: Full journey timeline with all stops, scheduled vs actual times, platforms, delays, current position, operator info.`,
				inputSchema: {
					service_uid: z.string().describe("Service UID (e.g., W72419)"),
					date: z.string().describe("Date YYYY-MM-DD"),
					check_stops_at: z.string().optional().describe("Check if stops at this station (CRS code)"),
					include_live_tracking: z.boolean().optional().describe("Include live position tracking")
				}
			},
			async (params: {
				service_uid: string;
				date: string;
				check_stops_at?: string;
				include_live_tracking?: boolean;
			}) => {
				try {
					const { service_uid, date, check_stops_at, include_live_tracking = true } = params;

					const apiDate = this.formatDateForApi(date);
					const [year, month, day] = apiDate.split('/');
					const endpoint = `/json/service/${service_uid.toUpperCase()}/${year}/${month}/${day}`;

					const data = await this.makeApiRequest(endpoint);
					const locations = data.locations || [];

					// Header
					const origins = this.getOrigins(data);
					const destinations = this.getDestinations(data);

					const result: string[] = [
						`SERVICE ${data.serviceUid} - ${apiDate}`,
						`${origins[0]} -> ${destinations[0]}`,
						`Operator: ${data.atocName || 'Unknown'} | Train ID: ${data.trainIdentity || '-'}`,
						`Real-time: ${data.realtimeActivated ? 'Active' : 'Not available'}`,
						''
					];

					// Check if stops at specific station
					if (check_stops_at) {
						const stationLookup = this.lookupStationCode(check_stops_at);
						const checkCode = stationLookup.length > 0 ? stationLookup[0].code : check_stops_at.toUpperCase();
						const stop = locations.find((loc: any) => loc.crs?.toUpperCase() === checkCode);

						if (stop) {
							result.push(`STOPS AT ${checkCode}: YES`);
							if (stop.gbttBookedArrival) result.push(`  Arrives: ${this.formatTime(stop.gbttBookedArrival)}`);
							if (stop.gbttBookedDeparture) result.push(`  Departs: ${this.formatTime(stop.gbttBookedDeparture)}`);
							if (stop.platform) result.push(`  Platform: ${this.getPlatformStr(stop)}`);
							result.push('');
						} else {
							result.push(`STOPS AT ${checkCode}: NO - this train does not call at this station`);
							result.push('');
						}
					}

					// Live tracking
					if (include_live_tracking && data.realtimeActivated) {
						let currentPos = null;
						let completedStops = 0;

						for (const loc of locations) {
							if (loc.serviceLocation) {
								const posMap: { [k: string]: string } = {
									'APPR_STAT': 'Approaching',
									'APPR_PLAT': 'Arriving at',
									'AT_PLAT': 'At',
									'DEP_PREP': 'Preparing to depart',
									'DEP_READY': 'Ready to depart from'
								};
								currentPos = `${posMap[loc.serviceLocation] || loc.serviceLocation} ${loc.description || 'Unknown'}`;
							}
							if (loc.realtimeDepartureActual) completedStops++;
						}

						const progress = Math.round((completedStops / locations.length) * 100);
						result.push(`LIVE STATUS`);
						result.push(`Progress: ${progress}% (${completedStops}/${locations.length} stops)`);
						if (currentPos) result.push(`Position: ${currentPos}`);
						result.push('');
					}

					// Journey timeline
					result.push('CALLING POINTS');
					result.push('-'.repeat(70));

					for (const loc of locations) {
						const station = loc.description || 'Unknown';
						const arr = loc.gbttBookedArrival;
						const dep = loc.gbttBookedDeparture;
						const realArr = loc.realtimeArrival;
						const realDep = loc.realtimeDeparture;
						const plat = this.getPlatformStr(loc);

						let line = station.padEnd(25);

						// Times
						const times: string[] = [];
						if (arr) {
							let arrStr = `Arr ${this.formatTime(arr)}`;
							if (realArr && realArr !== arr) {
								arrStr += `->${this.formatTime(realArr)}`;
								if (loc.realtimeArrivalActual) arrStr += '*';
							}
							times.push(arrStr);
						}
						if (dep) {
							let depStr = `Dep ${this.formatTime(dep)}`;
							if (realDep && realDep !== dep) {
								depStr += `->${this.formatTime(realDep)}`;
								if (loc.realtimeDepartureActual) depStr += '*';
							}
							times.push(depStr);
						}

						line += times.join(' | ').padEnd(30);
						if (plat !== '-') line += ` [${plat}]`;

						// Status markers
						if (loc.cancelReasonShortText) line += ' CANCELLED';
						if (loc.serviceLocation) line += ' <-- HERE';

						result.push(line);
					}

					result.push('');
					result.push('* = actual time recorded');

					return { content: [{ type: "text", text: result.join('\n') }] };

				} catch (error: any) {
					return { content: [{ type: "text", text: `Error: ${error.message}` }] };
				}
			}
		);

		// ===== TOOL 3: SEARCH JOURNEYS =====
		this.server.registerTool(
			"search_journeys",
			{
				title: "Search Journeys",
				description: `Find train journeys between two stations.

USAGE: Journey planning, find next train, first/last train of day.

PARAMETERS:
- from_station: Origin station (CRS code or name)
- to_station: Destination station (CRS code or name)
- date: YYYY-MM-DD (default: today)
- depart_after: HH:MM - find trains departing after this time
- arrive_by: HH:MM - find trains arriving before this time
- direct_only: Only show direct trains (no changes required)
- limit: Max results (default 5)

RETURNS: Matching journeys with departure/arrival times, duration, delays, platforms.`,
				inputSchema: {
					from_station: z.string().describe("Origin station"),
					to_station: z.string().describe("Destination station"),
					date: z.string().optional().describe("Date YYYY-MM-DD"),
					depart_after: z.string().optional().describe("Depart after HH:MM"),
					arrive_by: z.string().optional().describe("Arrive by HH:MM"),
					direct_only: z.boolean().optional().describe("Direct trains only"),
					limit: z.number().optional().describe("Max results (default 5)")
				}
			},
			async (params: {
				from_station: string;
				to_station: string;
				date?: string;
				depart_after?: string;
				arrive_by?: string;
				direct_only?: boolean;
				limit?: number;
			}) => {
				try {
					const { from_station, to_station, date, depart_after, arrive_by, direct_only = false, limit = 5 } = params;

					// Resolve station codes
					const fromLookup = this.lookupStationCode(from_station);
					const toLookup = this.lookupStationCode(to_station);

					if (fromLookup.length === 0) {
						return { content: [{ type: "text", text: `Unknown origin station: ${from_station}` }] };
					}
					if (toLookup.length === 0) {
						return { content: [{ type: "text", text: `Unknown destination station: ${to_station}` }] };
					}

					const fromCode = fromLookup[0].code;
					const toCode = toLookup[0].code;
					const fromName = fromLookup[0].name;
					const toName = toLookup[0].name;

					// Build endpoint with destination filter (must use /to/ format before date)
					const apiDate = this.formatDateForApi(date);
					let endpoint = `/json/search/${fromCode}/to/${toCode}/${apiDate}`;

					// Add time filter
					const ukTime = this.getUKTime();
					let timeFilter: string;
					if (depart_after) {
						try {
							timeFilter = this.normalizeTimeToHHMM(depart_after);
						} catch (error: any) {
							return { content: [{ type: "text", text: `Error in depart_after parameter: ${error.message}` }] };
						}
					} else {
						timeFilter = `${String(ukTime.getHours()).padStart(2, '0')}${String(ukTime.getMinutes()).padStart(2, '0')}`;
					}
					endpoint += `?from=${timeFilter}`;

					const data = await this.makeApiRequest(endpoint);
					const services = data.services || [];

					// Process journeys
					let journeys: Array<{
						uid: string;
						depTime: string;
						arrTime: string;
						duration: number;
						depPlatform: string;
						status: string;
						delay: number;
						operator: string;
						direct: boolean;
					}> = [];

					for (const svc of services) {
						const loc = svc.locationDetail;
						if (!loc) continue;

						// We need to fetch full service to get arrival time at destination
						// For now, use the destination info from search results
						const depTime = loc.gbttBookedDeparture;
						if (!depTime) continue;

						// Get arrival time at destination (from service destination info)
						let arrTime = '';
						const destInfo = loc.destination;
						if (destInfo && destInfo.length > 0) {
							// The search API doesn't give us arrival times directly
							// We'd need to fetch the full service for that
							// For now, estimate or leave blank
							arrTime = '??:??';
						}

						const statusInfo = this.getStatus(loc, 'departure');

						// arrive_by filter - skip if we know arrival would be too late
						// (Would need full service fetch for accurate filtering)

						journeys.push({
							uid: svc.serviceUid || '',
							depTime,
							arrTime,
							duration: 0, // Would need full service for this
							depPlatform: this.getPlatformStr(loc),
							status: statusInfo.status,
							delay: statusInfo.delay,
							operator: svc.atocCode || '',
							direct: true // Search with /to/ filter only returns direct trains
						});
					}

					// Sort by departure time
					journeys.sort((a, b) => a.depTime.localeCompare(b.depTime));

					// Apply limit
					journeys = journeys.slice(0, Math.min(limit, 10));

					// Build output
					const result: string[] = [
						`JOURNEYS: ${fromName} -> ${toName}`,
						`Date: ${apiDate}`,
						''
					];

					if (journeys.length === 0) {
						result.push('No direct trains found for this route and time');
						result.push('');
						result.push('Tips:');
						result.push('- Try a different time with depart_after parameter');
						result.push('- Check station codes are correct with lookup_station');
					} else {
						result.push(`Depart | Platform | Status       | Operator | Service UID`);
						result.push('-'.repeat(65));

						for (const j of journeys) {
							const depStr = this.formatTime(j.depTime);
							const platStr = j.depPlatform.padEnd(8);
							const statusStr = j.status.slice(0, 12).padEnd(12);
							const opStr = j.operator.padEnd(8);
							result.push(`${depStr}  | ${platStr} | ${statusStr} | ${opStr} | ${j.uid}`);
						}

						result.push('');
						result.push('Use get_service_info with a service UID for full journey details');
					}

					return { content: [{ type: "text", text: result.join('\n') }] };

				} catch (error: any) {
					return { content: [{ type: "text", text: `Error: ${error.message}` }] };
				}
			}
		);

		// ===== TOOL 4: CHECK CONNECTION =====
		this.server.registerTool(
			"check_connection",
			{
				title: "Check Connection",
				description: `Check if a connection between two trains is viable.

USAGE: Verify you can make a connection when changing trains.

PARAMETERS:
- arriving_uid: Service UID of the train you're arriving on
- departing_uid: Service UID of the train you want to catch
- connection_station: Station where you're changing (CRS code or name)
- date: YYYY-MM-DD

RETURNS: Connection viability with arrival/departure times, transfer time, platform info, risk assessment.`,
				inputSchema: {
					arriving_uid: z.string().describe("Arriving service UID"),
					departing_uid: z.string().describe("Departing service UID"),
					connection_station: z.string().describe("Connection station"),
					date: z.string().describe("Date YYYY-MM-DD")
				}
			},
			async (params: {
				arriving_uid: string;
				departing_uid: string;
				connection_station: string;
				date: string;
			}) => {
				try {
					const { arriving_uid, departing_uid, connection_station, date } = params;

					// Resolve station
					const stationLookup = this.lookupStationCode(connection_station);
					if (stationLookup.length === 0) {
						return { content: [{ type: "text", text: `Unknown station: ${connection_station}` }] };
					}
					const stationCode = stationLookup[0].code;
					const stationName = stationLookup[0].name;
					const stationVerified = stationLookup[0].verified;

					const apiDate = this.formatDateForApi(date);
					const [year, month, day] = apiDate.split('/');

					// Fetch both services
					const [arrivingData, departingData] = await Promise.all([
						this.makeApiRequest(`/json/service/${arriving_uid.toUpperCase()}/${year}/${month}/${day}`),
						this.makeApiRequest(`/json/service/${departing_uid.toUpperCase()}/${year}/${month}/${day}`)
					]);

					// Find station in arriving service
					const arrivalStop = arrivingData.locations?.find((loc: any) =>
						loc.crs?.toUpperCase() === stationCode
					);

					if (!arrivalStop) {
						return { content: [{ type: "text", text: `Service ${arriving_uid} does not call at ${stationName}` }] };
					}

					// Find station in departing service
					const departureStop = departingData.locations?.find((loc: any) =>
						loc.crs?.toUpperCase() === stationCode
					);

					if (!departureStop) {
						return { content: [{ type: "text", text: `Service ${departing_uid} does not call at ${stationName}` }] };
					}

					// Get times - handle origin/destination edge cases
					// For arriving service: use arrival time if available, otherwise departure time (if it's the origin)
					// For departing service: use departure time if available, otherwise arrival time (if it's the destination)
					const scheduledArr = arrivalStop.gbttBookedArrival || arrivalStop.gbttBookedDeparture;
					const scheduledDep = departureStop.gbttBookedDeparture || departureStop.gbttBookedArrival;
					const realtimeArr = arrivalStop.realtimeArrival || arrivalStop.realtimeDeparture || scheduledArr;
					const realtimeDep = departureStop.realtimeDeparture || departureStop.realtimeArrival || scheduledDep;

					if (!scheduledArr || !scheduledDep) {
						const missing: string[] = [];
						if (!scheduledArr) missing.push(`arriving service ${arriving_uid} has no arrival or departure time at ${stationName}`);
						if (!scheduledDep) missing.push(`departing service ${departing_uid} has no departure or arrival time at ${stationName}`);
						return { content: [{ type: "text", text: `Unable to determine connection times: ${missing.join('; ')}` }] };
					}

					// Calculate connection time
					const arrMins = parseInt(realtimeArr.slice(0, 2)) * 60 + parseInt(realtimeArr.slice(2, 4));
					const depMins = parseInt(realtimeDep.slice(0, 2)) * 60 + parseInt(realtimeDep.slice(2, 4));
					const connectionMins = depMins - arrMins;

					// Platform info
					const arrPlatform = this.getPlatformStr(arrivalStop);
					const depPlatform = this.getPlatformStr(departureStop);
					const platformChange = arrPlatform !== '-' && depPlatform !== '-' && arrPlatform !== depPlatform;

					// Risk assessment
					let risk: string;
					let riskEmoji: string;
					if (connectionMins < 0) {
						risk = 'MISSED - Departure is before arrival';
						riskEmoji = 'X';
					} else if (connectionMins < 3) {
						risk = 'IMPOSSIBLE - Not enough time';
						riskEmoji = 'X';
					} else if (connectionMins < 5) {
						risk = 'VERY HIGH RISK - Only ' + connectionMins + ' mins';
						riskEmoji = '!';
					} else if (connectionMins < 10) {
						risk = 'HIGH RISK - Tight connection';
						riskEmoji = '!';
					} else if (connectionMins < 15) {
						risk = 'MODERATE - Should be OK if on time';
						riskEmoji = '~';
					} else {
						risk = 'SAFE - Comfortable connection time';
						riskEmoji = 'OK';
					}

					// Check for delays
					const arrDelay = this.calculateDelay(scheduledArr, realtimeArr);
					const depDelay = this.calculateDelay(scheduledDep, realtimeDep);

					// Build output
					const result: string[] = [];

					// Add warning if station code is unverified
					if (!stationVerified) {
						result.push(`WARNING: Station code "${stationCode}" not found in database.`);
						result.push(`This may be a valid CRS code, but verify with lookup_station if results are unexpected.`);
						result.push('');
					}

					result.push(
						`CONNECTION CHECK at ${stationName}`,
						`Date: ${apiDate}`,
						'',
						`[${riskEmoji}] ${risk}`,
						'',
						'ARRIVING SERVICE',
						`  ${arriving_uid}: ${this.getOrigins(arrivingData)[0]} -> ${this.getDestinations(arrivingData)[0]}`,
						`  Scheduled arrival: ${this.formatTime(scheduledArr)}`,
						`  Expected arrival:  ${this.formatTime(realtimeArr)}${arrDelay > 0 ? ` (+${arrDelay}m)` : ''}`,
						`  Platform: ${arrPlatform}`,
						'',
						'DEPARTING SERVICE',
						`  ${departing_uid}: ${this.getOrigins(departingData)[0]} -> ${this.getDestinations(departingData)[0]}`,
						`  Scheduled departure: ${this.formatTime(scheduledDep)}`,
						`  Expected departure:  ${this.formatTime(realtimeDep)}${depDelay > 0 ? ` (+${depDelay}m)` : ''}`,
						`  Platform: ${depPlatform}`,
						'',
						`CONNECTION TIME: ${connectionMins} minutes`,
						platformChange ? `PLATFORM CHANGE: Yes (${arrPlatform} -> ${depPlatform})` : 'PLATFORM CHANGE: No / Unknown'
					);

					if (arrDelay > 0 && connectionMins < 10) {
						result.push('');
						result.push(`WARNING: Arriving train is ${arrDelay}m late, connection may be at risk`);
					}

					return { content: [{ type: "text", text: result.join('\n') }] };

				} catch (error: any) {
					return { content: [{ type: "text", text: `Error: ${error.message}` }] };
				}
			}
		);

		// ===== TOOL 5: ANALYZE ROUTE =====
		this.server.registerTool(
			"analyze_route",
			{
				title: "Analyze Route",
				description: `Analyze performance and disruptions on a route between two stations.

USAGE: Check route health, delay statistics, operator performance.

PARAMETERS:
- from_station: Origin station (CRS code or name)
- to_station: Destination station (CRS code or name)
- date: YYYY-MM-DD (default: today)
- operator: Filter to specific operator

RETURNS: Route health summary with % on-time, delay stats, cancellations, operator breakdown.`,
				inputSchema: {
					from_station: z.string().describe("Origin station"),
					to_station: z.string().describe("Destination station"),
					date: z.string().optional().describe("Date YYYY-MM-DD"),
					operator: z.string().optional().describe("Filter by operator code")
				}
			},
			async (params: {
				from_station: string;
				to_station: string;
				date?: string;
				operator?: string;
			}) => {
				try {
					const { from_station, to_station, date, operator } = params;

					// Resolve station codes
					const fromLookup = this.lookupStationCode(from_station);
					const toLookup = this.lookupStationCode(to_station);

					if (fromLookup.length === 0) {
						return { content: [{ type: "text", text: `Unknown origin station: ${from_station}` }] };
					}
					if (toLookup.length === 0) {
						return { content: [{ type: "text", text: `Unknown destination station: ${to_station}` }] };
					}

					const fromCode = fromLookup[0].code;
					const toCode = toLookup[0].code;
					const fromName = fromLookup[0].name;
					const toName = toLookup[0].name;

					const apiDate = this.formatDateForApi(date);
					// Must use /to/ format before date for destination filtering
					const endpoint = `/json/search/${fromCode}/to/${toCode}/${apiDate}`;

					const data = await this.makeApiRequest(endpoint);
					const services = data.services || [];

					// Analyze services
					let total = 0;
					let onTime = 0;
					let delayed = 0;
					let cancelled = 0;
					let totalDelay = 0;
					let maxDelay = 0;
					const operators: { [key: string]: { total: number; delayed: number; cancelled: number } } = {};
					const delayReasons: { [key: string]: number } = {};

					for (const svc of services) {
						const loc = svc.locationDetail;
						if (!loc) continue;

						// Operator filter
						const opCode = svc.atocCode || 'Unknown';
						if (operator && opCode.toUpperCase() !== operator.toUpperCase()) continue;

						total++;

						// Initialize operator stats
						if (!operators[opCode]) {
							operators[opCode] = { total: 0, delayed: 0, cancelled: 0 };
						}
						operators[opCode].total++;

						// Check cancellation
						if (loc.cancelReasonShortText) {
							cancelled++;
							operators[opCode].cancelled++;
							const reason = loc.cancelReasonShortText;
							delayReasons[reason] = (delayReasons[reason] || 0) + 1;
							continue;
						}

						// Check delay
						const statusInfo = this.getStatus(loc, 'departure');
						if (statusInfo.delay >= 5) {
							delayed++;
							operators[opCode].delayed++;
							totalDelay += statusInfo.delay;
							maxDelay = Math.max(maxDelay, statusInfo.delay);
						} else {
							onTime++;
						}
					}

					// Build output
					const result: string[] = [
						`ROUTE ANALYSIS: ${fromName} -> ${toName}`,
						`Date: ${apiDate}`,
						''
					];

					if (total === 0) {
						result.push('No services found for this route');
					} else {
						const onTimePercent = Math.round((onTime / total) * 100);
						const delayedPercent = Math.round((delayed / total) * 100);
						const cancelledPercent = Math.round((cancelled / total) * 100);
						const avgDelay = delayed > 0 ? Math.round(totalDelay / delayed) : 0;

						result.push('OVERALL PERFORMANCE');
						result.push(`  Total services: ${total}`);
						result.push(`  On time (<5m): ${onTime} (${onTimePercent}%)`);
						result.push(`  Delayed (5m+): ${delayed} (${delayedPercent}%)`);
						result.push(`  Cancelled: ${cancelled} (${cancelledPercent}%)`);

						if (delayed > 0) {
							result.push(`  Average delay: ${avgDelay} mins`);
							result.push(`  Maximum delay: ${maxDelay} mins`);
						}

						// Health indicator
						result.push('');
						if (onTimePercent >= 80 && cancelledPercent < 5) {
							result.push('ROUTE STATUS: GOOD - Services running well');
						} else if (onTimePercent >= 60 && cancelledPercent < 10) {
							result.push('ROUTE STATUS: FAIR - Some disruption');
						} else {
							result.push('ROUTE STATUS: POOR - Significant disruption');
						}

						// Operator breakdown
						if (Object.keys(operators).length > 1 || !operator) {
							result.push('');
							result.push('BY OPERATOR');
							for (const [op, stats] of Object.entries(operators)) {
								const opOnTime = stats.total - stats.delayed - stats.cancelled;
								const opPercent = Math.round((opOnTime / stats.total) * 100);
								result.push(`  ${op}: ${stats.total} services, ${opPercent}% on-time, ${stats.cancelled} cancelled`);
							}
						}

						// Delay reasons
						if (Object.keys(delayReasons).length > 0) {
							result.push('');
							result.push('DISRUPTION REASONS');
							const sortedReasons = Object.entries(delayReasons).sort((a, b) => b[1] - a[1]).slice(0, 5);
							for (const [reason, count] of sortedReasons) {
								result.push(`  ${reason}: ${count}`);
							}
						}
					}

					return { content: [{ type: "text", text: result.join('\n') }] };

				} catch (error: any) {
					return { content: [{ type: "text", text: `Error: ${error.message}` }] };
				}
			}
		);

		// ===== TOOL 6: LOOKUP STATION =====
		this.server.registerTool(
			"lookup_station",
			{
				title: "Lookup Station",
				description: `Look up station CRS codes from station names.

USAGE: Find the 3-letter CRS code for any UK station.

PARAMETERS:
- query: Station name to search (e.g., "Paddington", "Kings Cross")

RETURNS: Matching stations with their CRS codes.

COMMON CODES:
- London: KGX (King's Cross), PAD (Paddington), EUS (Euston), WAT (Waterloo), VIC (Victoria), LST (Liverpool St)
- Major: BHM (Birmingham), MAN (Manchester), EDB (Edinburgh), GLC (Glasgow), LDS (Leeds), BRI (Bristol)`,
				inputSchema: {
					query: z.string().describe("Station name to search")
				}
			},
			async (params: { query: string }) => {
				try {
					const { query } = params;
					const results = this.lookupStationCode(query);

					if (results.length === 0) {
						return { content: [{ type: "text", text: `No stations found matching: ${query}\n\nTry a partial name or check spelling.` }] };
					}

					const lines = [`STATION LOOKUP: "${query}"`, ''];

					for (const r of results.slice(0, 10)) {
						const verifiedMarker = r.verified ? '' : ' (unverified - may not exist)';
						lines.push(`${r.code} - ${r.name}${verifiedMarker}`);
					}

					if (results.length > 10) {
						lines.push(`... and ${results.length - 10} more`);
					}

					lines.push('');
					lines.push('Use the 3-letter code with other tools (e.g., get_station_board)');

					// If any results are unverified, add a note
					if (results.some(r => !r.verified)) {
						lines.push('');
						lines.push('Note: Unverified codes were not found in our database.');
						lines.push('They may still be valid CRS codes - check API results to confirm.');
					}

					return { content: [{ type: "text", text: lines.join('\n') }] };

				} catch (error: any) {
					return { content: [{ type: "text", text: `Error: ${error.message}` }] };
				}
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return RealtimeTrainsMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return RealtimeTrainsMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response(`Realtime Trains MCP Server v2.0

Endpoints:
  /sse - Server-Sent Events (MCP clients)
  /mcp - MCP over HTTP

Tools (6 consolidated):
  1. get_station_board  - Departures/arrivals with filtering
  2. get_service_info   - Detailed train service info
  3. search_journeys    - Journey planning A to B
  4. check_connection   - Connection viability check
  5. analyze_route      - Route performance analysis
  6. lookup_station     - Station code lookup

Connect: ${url.origin}/sse`, {
			headers: { 'Content-Type': 'text/plain' }
		});
	},
};
