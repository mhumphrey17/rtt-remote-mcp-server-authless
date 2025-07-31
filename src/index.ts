import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define our Realtime Trains MCP agent
export class RealtimeTrainsMCP extends McpAgent {
	server = new McpServer({
		name: "Realtime Trains API",
		version: "1.0.0",
	});

	// API Configuration
	private readonly API_BASE_URL = 'https://api.rtt.io/api/v1';
	private readonly API_USERNAME = 'rttapi_Mhumphrey';
	private readonly API_PASSWORD = '93e4de518180a28a130c0af8c0250d3e23307bac';

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
				'User-Agent': 'RealtimeTrains-MCP/1.0'
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				throw new Error(`Service or station not found: ${endpoint}`);
			} else if (response.status === 401) {
				throw new Error('Authentication failed - check API credentials');
			} else {
				throw new Error(`API request failed: ${response.status}`);
			}
		}

		return await response.json();
	}

	/**
	 * Format time string for display
	 */
	private formatTime(timeStr?: string): string {
		if (!timeStr) return 'N/A';
		if (timeStr.length === 4) {  // HHMM format
			return `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
		} else if (timeStr.length === 6) {  // HHMMSS format
			return `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4)}`;
		}
		return timeStr;
	}

	async init() {
		// Search train departures from a station
		this.server.tool(
			"search_departures",
			{ 
				station_code: z.string().describe("3-letter CRS station code (e.g., PAD for London Paddington, BHM for Birmingham)"),
				date: z.string().optional().describe("Date in YYYY/MM/DD format (optional, defaults to today)")
			},
			async ({ station_code, date }) => {
				try {
					if (!date) {
						const now = new Date();
						date = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
					}
					
					// Validate date format
					if (!/^\d{4}\/\d{2}\/\d{2}$/.test(date)) {
						return {
							content: [{ type: "text", text: 'Error: Date must be in YYYY/MM/DD format (e.g., 2025/01/15)' }]
						};
					}
					
					const endpoint = `/json/search/${station_code.toUpperCase()}/${date}`;
					const data = await this.makeApiRequest(endpoint);
					
					const services = data.services || [];
					if (services.length === 0) {
						return {
							content: [{ type: "text", text: `No services found for station ${station_code.toUpperCase()} on ${date}` }]
						};
					}
					
					const stationName = data.location?.name || station_code.toUpperCase();
					
					const result = [
						`🚂 Departures from ${stationName} on ${date}:`,
						'=' + '='.repeat(50)
					];
					
					for (let i = 0; i < Math.min(services.length, 10); i++) {
						const service = services[i];
						const serviceId = service.serviceUid || 'Unknown';
						const operator = service.atocName || 'Unknown operator';
						
						// Format origin and destination
						const origins = service.origin || [];
						const destinations = service.destination || [];
						
						const originNames = origins.map((o: any) => o.description || 'Unknown');
						const destNames = destinations.map((d: any) => d.description || 'Unknown');
						
						const originStr = originNames.join(' & ');
						const destStr = destNames.join(' & ');
						
						// Get scheduled times
						const scheduledDep = origins[0]?.publicTime ? this.formatTime(origins[0].publicTime) : '';
						const scheduledArr = destinations[0]?.publicTime ? this.formatTime(destinations[0].publicTime) : '';
						
						let summary = `${serviceId} (${operator}): ${originStr} (${scheduledDep}) → ${destStr} (${scheduledArr})`;
						
						// Add platform information if available
						const locations = service.locations || [];
						const departureLocation = locations.find((loc: any) => loc.displayAs === 'ORIGIN');
						if (departureLocation?.platform) {
							summary += ` | Platform ${departureLocation.platform}`;
						}
						
						// Add real-time information
						if (departureLocation) {
							const realtimeDep = departureLocation.realtimeDeparture;
							if (realtimeDep) {
								const isActual = departureLocation.realtimeDepartureActual || false;
								const status = isActual ? 'Actual' : 'Expected';
								summary += ` | ${status}: ${this.formatTime(realtimeDep)}`;
							}
						}
						
						result.push(summary);
					}
					
					return {
						content: [{ type: "text", text: result.join('\n') }]
					};
					
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }]
					};
				}
			}
		);

		// Search train arrivals at a station
		this.server.tool(
			"search_arrivals",
			{ 
				station_code: z.string().describe("3-letter CRS station code (e.g., PAD for London Paddington, WAT for London Waterloo)"),
				date: z.string().optional().describe("Date in YYYY/MM/DD format (optional, defaults to today)")
			},
			async ({ station_code, date }) => {
				try {
					if (!date) {
						const now = new Date();
						date = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
					}
					
					// Validate date format
					if (!/^\d{4}\/\d{2}\/\d{2}$/.test(date)) {
						return {
							content: [{ type: "text", text: 'Error: Date must be in YYYY/MM/DD format (e.g., 2025/01/15)' }]
						};
					}
					
					const endpoint = `/json/search/${station_code.toUpperCase()}/${date}`;
					const data = await this.makeApiRequest(endpoint);
					
					const services = data.services || [];
					if (services.length === 0) {
						return {
							content: [{ type: "text", text: `No services found for station ${station_code.toUpperCase()} on ${date}` }]
						};
					}
					
					const stationName = data.location?.name || station_code.toUpperCase();
					
					// Filter for services that arrive at this station
					const arrivingServices: Array<{ service: any; arrivalLocation: any }> = [];
					for (const service of services) {
						const locations = service.locations || [];
						const arrivalLocation = locations.find((loc: any) => 
							loc.crs?.toUpperCase() === station_code.toUpperCase() && 
							['DESTINATION', 'CALL'].includes(loc.displayAs)
						);
						if (arrivalLocation) {
							arrivingServices.push({ service, arrivalLocation });
						}
					}
					
					if (arrivingServices.length === 0) {
						return {
							content: [{ type: "text", text: `No arriving services found for station ${station_code.toUpperCase()} on ${date}` }]
						};
					}
					
					const result = [
						`🚂 Arrivals at ${stationName} on ${date}:`,
						'='.repeat(50)
					];
					
					for (let i = 0; i < Math.min(arrivingServices.length, 10); i++) {
						const { service, arrivalLocation } = arrivingServices[i];
						const serviceId = service.serviceUid || 'Unknown';
						const operator = service.atocName || 'Unknown operator';
						
						// Format origin and destination
						const origins = service.origin || [];
						const destinations = service.destination || [];
						
						const originNames = origins.map((o: any) => o.description || 'Unknown');
						const destNames = destinations.map((d: any) => d.description || 'Unknown');
						
						const originStr = originNames.join(' & ');
						const destStr = destNames.join(' & ');
						
						let summary = `${serviceId} (${operator}): ${originStr} → ${destStr}`;
						
						// Add platform information if available
						if (arrivalLocation.platform) {
							summary += ` | Platform ${arrivalLocation.platform}`;
						}
						
						// Add real-time arrival information
						const realtimeArr = arrivalLocation.realtimeArrival;
						if (realtimeArr) {
							const isActual = arrivalLocation.realtimeArrivalActual || false;
							const status = isActual ? 'Actual' : 'Expected';
							summary += ` | ${status}: ${this.formatTime(realtimeArr)}`;
						}
						
						result.push(summary);
					}
					
					return {
						content: [{ type: "text", text: result.join('\n') }]
					};
					
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }]
					};
				}
			}
		);

		// Get detailed service information
		this.server.tool(
			"get_service_details",
			{ 
				service_uid: z.string().describe("Service UID (6-character code like 'W72419')"),
				date: z.string().optional().describe("Date in YYYY/MM/DD format (optional, defaults to today)")
			},
			async ({ service_uid, date }) => {
				try {
					if (!date) {
						const now = new Date();
						date = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
					}
					
					// Validate date format and convert to URL format
					const dateMatch = date.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
					if (!dateMatch) {
						return {
							content: [{ type: "text", text: 'Error: Date must be in YYYY/MM/DD format (e.g., 2025/01/15)' }]
						};
					}
					
					const [, year, month, day] = dateMatch;
					const endpoint = `/json/service/${service_uid.toUpperCase()}/${year}/${month}/${day}`;
					const data = await this.makeApiRequest(endpoint);
					
					// Extract service information
					const serviceInfo = [
						`🚂 Service Details: ${data.serviceUid || 'Unknown'}`,
						'='.repeat(50),
						`Service Type: ${data.serviceType || 'Unknown'}`,
						`Operator: ${data.atocName || 'Unknown'}`,
						`Train Identity: ${data.trainIdentity || 'Unknown'}`,
						`Passenger Service: ${data.isPassenger ? 'Yes' : 'No'}`,
						`Run Date: ${data.runDate || 'Unknown'}`
					];
					
					if (data.realtimeActivated) {
						serviceInfo.push('Real-time Tracking: Active');
						if (data.runningIdentity) {
							serviceInfo.push(`Running Identity: ${data.runningIdentity}`);
						}
					} else {
						serviceInfo.push('Real-time Tracking: Not available');
					}
					
					serviceInfo.push('', '🚉 Station Stops:', '-'.repeat(30));
					
					// Process locations
					const locations = data.locations || [];
					for (const location of locations) {
						const stationLine = [];
						
						// Station name
						const stationName = location.description || 'Unknown Station';
						const displayAs = location.displayAs || 'CALL';
						
						if (displayAs === 'ORIGIN') {
							stationLine.push(`🚀 ${stationName}`);
						} else if (displayAs === 'DESTINATION') {
							stationLine.push(`🏁 ${stationName}`);
						} else {
							stationLine.push(`🚉 ${stationName}`);
						}
						
						// Times
						const times = [];
						if (location.gbttBookedArrival) {
							const arrTime = this.formatTime(location.gbttBookedArrival);
							const realArr = location.realtimeArrival;
							if (realArr) {
								const realArrFormatted = this.formatTime(realArr);
								const isActual = location.realtimeArrivalActual || false;
								const status = isActual ? 'Actual' : 'Expected';
								times.push(`Arr: ${arrTime} (${status}: ${realArrFormatted})`);
							} else {
								times.push(`Arr: ${arrTime}`);
							}
						}
						
						if (location.gbttBookedDeparture) {
							const depTime = this.formatTime(location.gbttBookedDeparture);
							const realDep = location.realtimeDeparture;
							if (realDep) {
								const realDepFormatted = this.formatTime(realDep);
								const isActual = location.realtimeDepartureActual || false;
								const status = isActual ? 'Actual' : 'Expected';
								times.push(`Dep: ${depTime} (${status}: ${realDepFormatted})`);
							} else {
								times.push(`Dep: ${depTime}`);
							}
						}
						
						if (times.length > 0) {
							stationLine.push(' | ' + times.join(' | '));
						}
						
						// Platform
						if (location.platform) {
							const platform = location.platform;
							const confirmed = location.platformConfirmed || false;
							const changed = location.platformChanged || false;
							let platformInfo = `Platform ${platform}`;
							if (changed) {
								platformInfo += ' (CHANGED)';
							} else if (!confirmed) {
								platformInfo += ' (Not confirmed)';
							}
							stationLine.push(`| ${platformInfo}`);
						}
						
						// Service location (current position)
						if (location.serviceLocation) {
							const posMap: { [key: string]: string } = {
								'APPR_STAT': 'Approaching Station',
								'APPR_PLAT': 'Arriving',
								'AT_PLAT': 'At Platform',
								'DEP_PREP': 'Preparing to depart',
								'DEP_READY': 'Ready to depart'
							};
							const position = posMap[location.serviceLocation] || location.serviceLocation;
							stationLine.push(`| 📍 ${position}`);
						}
						
						// Cancellation info
						if (location.cancelReasonShortText) {
							stationLine.push(`| ❌ ${location.cancelReasonShortText}`);
						}
						
						serviceInfo.push(stationLine.join(' '));
					}
					
					return {
						content: [{ type: "text", text: serviceInfo.join('\n') }]
					};
					
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }]
					};
				}
			}
		);

		// Search for station information
		this.server.tool(
			"search_station_info",
			{ 
				query: z.string().describe("Station name or code to search for")
			},
			async ({ query }) => {
				const commonStations: { [key: string]: string } = {
					'PAD': 'London Paddington',
					'WAT': 'London Waterloo', 
					'VIC': 'London Victoria',
					'EUS': 'London Euston',
					'KGX': 'London Kings Cross',
					'LST': 'London Liverpool Street',
					'CHX': 'London Charing Cross',
					'LBG': 'London Bridge',
					'CLJ': 'Clapham Junction',
					'BHM': 'Birmingham New Street',
					'MAN': 'Manchester Piccadilly',
					'LDS': 'Leeds',
					'EDB': 'Edinburgh Waverley',
					'GLC': 'Glasgow Central',
					'GLQ': 'Glasgow Queen Street',
					'NCL': 'Newcastle',
					'BRI': 'Bristol Temple Meads',
					'BTN': 'Brighton',
					'OXF': 'Oxford',
					'CBG': 'Cambridge',
					'YRK': 'York'
				};
				
				const queryUpper = query.toUpperCase();
				
				// Try exact code match first
				if (commonStations[queryUpper]) {
					return {
						content: [{ type: "text", text: `Station Code: ${queryUpper} = ${commonStations[queryUpper]}` }]
					};
				}
				
				// Try partial name match
				const matches = [];
				for (const [code, name] of Object.entries(commonStations)) {
					if (name.toUpperCase().includes(query.toUpperCase())) {
						matches.push(`${code}: ${name}`);
					}
				}
				
				if (matches.length > 0) {
					const result = `Stations matching '${query}':\n${matches.join('\n')}`;
					return {
						content: [{ type: "text", text: result }]
					};
				} else {
					const result = `No common stations found for '${query}'.

Try searching with a 3-letter CRS code (e.g., PAD, WAT, BHM) or check:
- National Rail website for station codes
- The query might need to be more specific

Some popular station codes:
PAD - London Paddington, WAT - London Waterloo, VIC - London Victoria
BHM - Birmingham New Street, MAN - Manchester Piccadilly, LDS - Leeds`;
					
					return {
						content: [{ type: "text", text: result }]
					};
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
		return new Response(`🚂 Realtime Trains MCP Server

Available endpoints:
• /sse - Server-Sent Events (for MCP clients)
• /mcp - MCP over HTTP

Tools available:
• search_departures - Get train departures from a station
• search_arrivals - Get train arrivals at a station  
• get_service_details - Get detailed service information
• search_station_info - Find station codes

Example: Connect to ${url.origin}/sse with an MCP client`, { 
			headers: { 'Content-Type': 'text/plain' }
		});
	},
};
