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
		
		try {
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
				} else if (response.status === 403) {
					throw new Error('Access forbidden - check API permissions');
				} else if (response.status >= 500) {
					throw new Error(`Server error (${response.status}) - please try again later`);
				} else {
					throw new Error(`API request failed: ${response.status} ${response.statusText}`);
				}
			}

			const data = await response.json();
			
			// Validate response structure
			if (!data || typeof data !== 'object') {
				throw new Error('Invalid response format from API');
			}
			
			return data;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			} else {
				throw new Error(`Network error: Unable to connect to Realtime Trains API`);
			}
		}
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

	/**
	 * Extract service origins from service object
	 */
	private extractServiceOrigins(service: any): string[] {
		const origins: string[] = [];
		
		// Try service.origin array first
		const serviceOrigins = service.origin || [];
		for (const origin of serviceOrigins) {
			const name = origin.description || origin.publicName || origin.tiploc;
			if (name && name !== 'Unknown') {
				origins.push(name);
			}
		}
		
		// Fallback to locations array
		if (origins.length === 0) {
			const locations = service.locations || [];
			const originLocation = locations.find((loc: any) => loc.displayAs === 'ORIGIN');
			if (originLocation) {
				const name = originLocation.description || originLocation.tiploc;
				if (name) {
					origins.push(name);
				}
			}
		}
		
		return origins.length > 0 ? origins : ['Unknown Origin'];
	}

	/**
	 * Extract service destinations from service object
	 */
	private extractServiceDestinations(service: any): string[] {
		const destinations: string[] = [];
		
		// Try service.destination array first
		const serviceDestinations = service.destination || [];
		for (const destination of serviceDestinations) {
			const name = destination.description || destination.publicName || destination.tiploc;
			if (name && name !== 'Unknown') {
				destinations.push(name);
			}
		}
		
		// Fallback to locations array
		if (destinations.length === 0) {
			const locations = service.locations || [];
			const destLocation = locations.find((loc: any) => loc.displayAs === 'DESTINATION');
			if (destLocation) {
				const name = destLocation.description || destLocation.tiploc;
				if (name) {
					destinations.push(name);
				}
			}
		}
		
		return destinations.length > 0 ? destinations : ['Unknown Destination'];
	}

	/**
	 * Interpret service location code into human-readable status
	 */
	private interpretServiceLocation(locationCode: string): string {
		const locationMap: { [key: string]: string } = {
			'APPR_STAT': 'Approaching Station',
			'APPR_PLAT': 'Arriving',
			'AT_PLAT': 'At Platform',
			'DEP_PREP': 'Preparing to depart',
			'DEP_READY': 'Ready to depart'
		};
		
		return locationMap[locationCode] || locationCode;
	}

	/**
	 * Format platform information with confirmation status
	 */
	private formatPlatformInfo(location: any): string {
		if (!location.platform) {
			return '';
		}
		
		const platform = location.platform;
		const confirmed = location.platformConfirmed || false;
		const changed = location.platformChanged || false;
		
		let platformInfo = `Platform ${platform}`;
		
		if (changed) {
			platformInfo += ' (CHANGED)';
		} else if (!confirmed) {
			platformInfo += ' (Not confirmed)';
		}
		
		return platformInfo;
	}

	/**
	 * Validate and format date string to YYYY/MM/DD format
	 */
	private validateAndFormatDate(date?: string): string {
		if (!date) {
			const now = new Date();
			return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
		}
		
		// Validate date format
		if (!/^\d{4}\/\d{2}\/\d{2}$/.test(date)) {
			throw new Error('Date must be in YYYY/MM/DD format (e.g., 2025/01/31)');
		}
		
		return date;
	}

	async init() {
		// Tool 1: Live Departure Board - Clean departure board like station displays
		this.server.tool(
			"get_live_departure_board",
			{
				station_code: z.string().describe("3-letter CRS station code (e.g., BTH=Bath Spa, PAD=London Paddington, BRI=Bristol Temple Meads, MTP=Montpelier, RDG=Reading). Use this exact format."),
				max_results: z.number().optional().describe("Maximum number of departures to show (default: 10, max: 20)")
			},
			"Get a live departure board for a station showing trains leaving in the next few hours, like a real station display board. Use this when users want to see 'what trains are leaving from [station]' or need departure information to catch a train. Returns a formatted departure board with scheduled and real-time departure times, destinations, platforms, delays, and current status (approaching, departed, delayed, on time). Shows most recent departures first. Service UIDs in results can be used with get_service_details, track_service_progress, or check_service_platform for more information about specific trains.",
			async ({ station_code, max_results = 10 }: { station_code: string; max_results?: number }) => {
				try {
					const date = this.validateAndFormatDate();
					const endpoint = `/json/search/${station_code.toUpperCase()}/${date}`;
					const data = await this.makeApiRequest(endpoint);
					
					const services = data.services || [];
					if (services.length === 0) {
						return {
							content: [{ type: "text", text: `No departures found for ${station_code.toUpperCase()} on ${date}` }]
						};
					}
					
					const stationName = data.location?.name || station_code.toUpperCase();
					const limit = Math.min(Math.max(max_results, 1), 20);
					
					const result = [
						`🚂 LIVE DEPARTURES - ${stationName}`,
						`${new Date().toLocaleTimeString()} | ${date}`,
						'─'.repeat(60),
						'Time    | Destination           | Plat | Status'
					];
					
					for (let i = 0; i < Math.min(services.length, limit); i++) {
						const service = services[i];
						const locations = service.locations || [];
						
						// Find departure location at this station
						const depLocation = locations.find((loc: any) => 
							loc.crs?.toUpperCase() === station_code.toUpperCase() && 
							['ORIGIN', 'CALL'].includes(loc.displayAs)
						);
						
						if (!depLocation) continue;
						
						// Get scheduled departure time
						const scheduledTime = depLocation.gbttBookedDeparture;
						if (!scheduledTime) continue;
						
						// Get destination
						const destinations = this.extractServiceDestinations(service);
						const destination = destinations[0].length > 18 ? 
							destinations[0].substring(0, 15) + '...' : 
							destinations[0].padEnd(18);
						
						// Get platform info
						const platformInfo = this.formatPlatformInfo(depLocation);
						const platform = platformInfo ? platformInfo.replace('Platform ', '').substring(0, 4).padEnd(4) : '    ';
						
						// Get real-time status
						let status = 'On time';
						const realtimeDep = depLocation.realtimeDeparture;
						
						if (depLocation.cancelReasonShortText) {
							status = 'CANCELLED';
						} else if (realtimeDep) {
							const isActual = depLocation.realtimeDepartureActual;
							if (isActual) {
								status = 'Departed';
							} else {
								// Calculate delay
								const scheduledMinutes = parseInt(scheduledTime.substring(0, 2)) * 60 + parseInt(scheduledTime.substring(2, 4));
								const realtimeMinutes = parseInt(realtimeDep.substring(0, 2)) * 60 + parseInt(realtimeDep.substring(2, 4));
								const delayMinutes = realtimeMinutes - scheduledMinutes;
								
								if (delayMinutes > 0) {
									status = `${delayMinutes}m late`;
								} else if (delayMinutes < 0) {
									status = `${Math.abs(delayMinutes)}m early`;
								}
							}
						}
						
						// Current position indicator
						if (depLocation.serviceLocation) {
							const position = this.interpretServiceLocation(depLocation.serviceLocation);
							if (position.includes('Approaching') || position.includes('At Platform')) {
								status = position;
							}
						}
						
						const timeStr = this.formatTime(scheduledTime);
						result.push(`${timeStr.padEnd(8)}| ${destination} | ${platform} | ${status}`);
					}
					
					if (result.length === 4) {
						result.push('No departures found');
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

		// Tool 2: Live Arrivals Board - Better arrival filtering with origin prominence
		this.server.tool(
			"get_live_arrivals_board",
			{
				station_code: z.string().describe("3-letter CRS station code (e.g., BTH=Bath Spa, PAD=London Paddington, BRI=Bristol Temple Meads, MTP=Montpelier, RDG=Reading). Use this exact format."),
				max_results: z.number().optional().describe("Maximum number of arrivals to show (default: 10, max: 20)")
			},
			"Get a live arrivals board for a station showing trains arriving in the next few hours. Use this when users want to see 'what trains are arriving at [station]' or need to meet someone arriving by train. Returns a formatted arrivals board with scheduled and real-time arrival times, origins (where trains are coming FROM), platforms, delays, and current status (approaching, arrived, delayed, on time). Emphasizes origin stations since this is for meeting passengers. Service UIDs in results can be used with get_service_details, track_service_progress, or check_service_platform for detailed information about specific trains.",
			async ({ station_code, max_results = 10 }: { station_code: string; max_results?: number }) => {
				try {
					const date = this.validateAndFormatDate();
					const endpoint = `/json/search/${station_code.toUpperCase()}/${date}`;
					const data = await this.makeApiRequest(endpoint);
					
					const services = data.services || [];
					if (services.length === 0) {
						return {
							content: [{ type: "text", text: `No arrivals found for ${station_code.toUpperCase()} on ${date}` }]
						};
					}
					
					const stationName = data.location?.name || station_code.toUpperCase();
					const limit = Math.min(Math.max(max_results, 1), 20);
					
					// Filter for services that arrive at this station
					const arrivingServices: Array<{ service: any; arrivalLocation: any }> = [];
					for (const service of services) {
						const locations = service.locations || [];
						const arrivalLocation = locations.find((loc: any) => 
							loc.crs?.toUpperCase() === station_code.toUpperCase() && 
							['DESTINATION', 'CALL'].includes(loc.displayAs) &&
							loc.gbttBookedArrival // Must have scheduled arrival
						);
						if (arrivalLocation) {
							arrivingServices.push({ service, arrivalLocation });
						}
					}
					
					if (arrivingServices.length === 0) {
						return {
							content: [{ type: "text", text: `No arrivals found for ${station_code.toUpperCase()} on ${date}` }]
						};
					}
					
					// Sort by scheduled arrival time
					arrivingServices.sort((a, b) => {
						const timeA = a.arrivalLocation.gbttBookedArrival || '9999';
						const timeB = b.arrivalLocation.gbttBookedArrival || '9999';
						return timeA.localeCompare(timeB);
					});
					
					const result = [
						`🚊 LIVE ARRIVALS - ${stationName}`,
						`${new Date().toLocaleTimeString()} | ${date}`,
						'─'.repeat(60),
						'Time    | From                  | Plat | Status'
					];
					
					for (let i = 0; i < Math.min(arrivingServices.length, limit); i++) {
						const { service, arrivalLocation } = arrivingServices[i];
						
						// Get scheduled arrival time
						const scheduledTime = arrivalLocation.gbttBookedArrival;
						
						// Get origin (prominence for arrivals)
						const origins = this.extractServiceOrigins(service);
						const origin = origins[0].length > 18 ? 
							origins[0].substring(0, 15) + '...' : 
							origins[0].padEnd(18);
						
						// Get platform info
						const platformInfo = this.formatPlatformInfo(arrivalLocation);
						const platform = platformInfo ? platformInfo.replace('Platform ', '').substring(0, 4).padEnd(4) : '    ';
						
						// Get real-time status
						let status = 'On time';
						const realtimeArr = arrivalLocation.realtimeArrival;
						
						if (arrivalLocation.cancelReasonShortText) {
							status = 'CANCELLED';
						} else if (realtimeArr) {
							const isActual = arrivalLocation.realtimeArrivalActual;
							if (isActual) {
								status = 'Arrived';
							} else {
								// Calculate delay
								const scheduledMinutes = parseInt(scheduledTime.substring(0, 2)) * 60 + parseInt(scheduledTime.substring(2, 4));
								const realtimeMinutes = parseInt(realtimeArr.substring(0, 2)) * 60 + parseInt(realtimeArr.substring(2, 4));
								const delayMinutes = realtimeMinutes - scheduledMinutes;
								
								if (delayMinutes > 0) {
									status = `${delayMinutes}m late`;
								} else if (delayMinutes < 0) {
									status = `${Math.abs(delayMinutes)}m early`;
								}
							}
						}
						
						// Current position indicator for approaching trains
						if (arrivalLocation.serviceLocation) {
							const position = this.interpretServiceLocation(arrivalLocation.serviceLocation);
							if (position.includes('Approaching') || position.includes('Arriving')) {
								status = position;
							}
						}
						
						const timeStr = this.formatTime(scheduledTime);
						result.push(`${timeStr.padEnd(8)}| ${origin} | ${platform} | ${status}`);
					}
					
					if (result.length === 4) {
						result.push('No arrivals found');
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

		// Tool 3: Enhanced Service Details - Organized service information with better timeline
		this.server.tool(
			"get_service_details",
			{
				service_uid: z.string().describe("6-character service identifier found in departure/arrival board results (e.g., W72419, C12345, S98765). Always exactly 6 characters."),
				date: z.string().optional().describe("Date in YYYY/MM/DD format with forward slashes (e.g., 2025/01/31). Must match the date when the service UID was found. Defaults to today if omitted.")
			},
			"Get comprehensive details about a specific train service including complete journey timeline, all station stops, scheduled vs actual times, platforms, delays, and real-time status. Use this when users want complete information about a specific train service, or when they have a service UID from departure/arrival boards and want full journey details. Returns detailed journey information organized into departure, journey stops, and arrival sections with scheduled→actual time comparisons, platform information, current position, and any disruptions. Essential for understanding a train's complete journey and current status.",
			async ({ service_uid, date }: { service_uid: string; date?: string }) => {
				try {
					const validatedDate = this.validateAndFormatDate(date);
					const dateMatch = validatedDate.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
					if (!dateMatch) {
						return {
							content: [{ type: "text", text: 'Error: Invalid date format' }]
						};
					}
					
					const [, year, month, day] = dateMatch;
					const endpoint = `/json/service/${service_uid.toUpperCase()}/${year}/${month}/${day}`;
					const data = await this.makeApiRequest(endpoint);
					
					// Service Header
					const origins = this.extractServiceOrigins(data);
					const destinations = this.extractServiceDestinations(data);
					
					const result = [
						`🚂 SERVICE ${data.serviceUid || 'Unknown'} - ${data.runDate || validatedDate}`,
						`${origins[0]} → ${destinations[0]}`,
						'═'.repeat(60),
						`🏢 Operator: ${data.atocName || 'Unknown'}`,
						`🚊 Train ID: ${data.trainIdentity || 'Unknown'}`,
						`👥 Passenger Service: ${data.isPassenger ? 'Yes' : 'No'}`,
						`📡 Real-time: ${data.realtimeActivated ? 'Active' : 'Not available'}`
					];
					
					if (data.runningIdentity && data.runningIdentity !== data.trainIdentity) {
						result.push(`🔄 Running as: ${data.runningIdentity}`);
					}
					
					result.push('', '🛤️  JOURNEY TIMELINE', '─'.repeat(60));
					
					// Enhanced timeline with better organization
					const locations = data.locations || [];
					let currentSection = '';
					
					for (let i = 0; i < locations.length; i++) {
						const location = locations[i];
						const displayAs = location.displayAs || 'CALL';
						
						// Section headers for better organization
						if (displayAs === 'ORIGIN' && currentSection !== 'ORIGIN') {
							result.push('🚀 DEPARTURE');
							currentSection = 'ORIGIN';
						} else if (displayAs === 'CALL' && currentSection !== 'JOURNEY') {
							result.push('', '🚉 JOURNEY STOPS');
							currentSection = 'JOURNEY';
						} else if (displayAs === 'DESTINATION' && currentSection !== 'DESTINATION') {
							result.push('', '🏁 ARRIVAL');
							currentSection = 'DESTINATION';
						}
						
						// Station line
						const stationName = location.description || 'Unknown Station';
						const stationLine = [`  ${stationName}`];
						
						// Times with clear scheduled vs actual
						const times = [];
						
						if (location.gbttBookedArrival) {
							const scheduledArr = this.formatTime(location.gbttBookedArrival);
							const realArr = location.realtimeArrival;
							
							if (realArr) {
								const realArrFormatted = this.formatTime(realArr);
								const isActual = location.realtimeArrivalActual;
								const status = isActual ? 'Arrived' : 'Expected';
								times.push(`Arr: ${scheduledArr} → ${realArrFormatted} (${status})`);
							} else {
								times.push(`Arr: ${scheduledArr}`);
							}
						}
						
						if (location.gbttBookedDeparture) {
							const scheduledDep = this.formatTime(location.gbttBookedDeparture);
							const realDep = location.realtimeDeparture;
							
							if (realDep) {
								const realDepFormatted = this.formatTime(realDep);
								const isActual = location.realtimeDepartureActual;
								const status = isActual ? 'Departed' : 'Expected';
								times.push(`Dep: ${scheduledDep} → ${realDepFormatted} (${status})`);
							} else {
								times.push(`Dep: ${scheduledDep}`);
							}
						}
						
						if (times.length > 0) {
							stationLine.push(`    ⏰ ${times.join(' | ')}`);
						}
						
						// Platform with clear status
						const platformInfo = this.formatPlatformInfo(location);
						if (platformInfo) {
							stationLine.push(`    🚉 ${platformInfo}`);
						}
						
						// Current position with clear indicator
						if (location.serviceLocation) {
							const position = this.interpretServiceLocation(location.serviceLocation);
							stationLine.push(`    📍 ${position}`);
						}
						
						// Cancellation with reason
						if (location.cancelReasonShortText) {
							stationLine.push(`    ❌ CANCELLED: ${location.cancelReasonShortText}`);
							if (location.cancelReasonLongText && location.cancelReasonLongText !== location.cancelReasonShortText) {
								stationLine.push(`       ${location.cancelReasonLongText}`);
							}
						}
						
						result.push(stationLine.join('\n'));
					}
					
					// Service summary
					if (data.realtimeActivated) {
						result.push('', '📊 SERVICE STATUS: Live tracking active');
					} else {
						result.push('', '📊 SERVICE STATUS: Schedule only (no live tracking)');
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

		// Tool 4: Track Service Progress - Real-time journey tracking and current position
		this.server.tool(
			"track_service_progress",
			{
				service_uid: z.string().describe("6-character service identifier found in departure/arrival board results (e.g., W72419, C12345, S98765). Must have real-time tracking activated."),
				date: z.string().optional().describe("Date in YYYY/MM/DD format with forward slashes (e.g., 2025/01/31). Must match the date when the service UID was found. Defaults to today if omitted.")
			},
			"Track the real-time progress of a specific train service showing current location, journey completion percentage, completed stops, and upcoming schedule. Use this when users want to know 'where is train [service_uid] right now' or track a train's live journey progress. Returns current position with progress bar, list of completed/pending stops with status icons, next stops preview, and live update timestamp. Only works with services that have real-time tracking activated - will return an error for schedule-only services. Perfect for monitoring a specific train's journey in real-time.",
			async ({ service_uid, date }: { service_uid: string; date?: string }) => {
				try {
					const validatedDate = this.validateAndFormatDate(date);
					const dateMatch = validatedDate.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
					if (!dateMatch) {
						return {
							content: [{ type: "text", text: 'Error: Invalid date format' }]
						};
					}
					
					const [, year, month, day] = dateMatch;
					const endpoint = `/json/service/${service_uid.toUpperCase()}/${year}/${month}/${day}`;
					const data = await this.makeApiRequest(endpoint);
					
					if (!data.realtimeActivated) {
						return {
							content: [{ type: "text", text: `Service ${service_uid.toUpperCase()} does not have real-time tracking activated. Use get_service_details for schedule information.` }]
						};
					}
					
					// Service Header
					const origins = this.extractServiceOrigins(data);
					const destinations = this.extractServiceDestinations(data);
					
					const result = [
						`🚂 TRACKING ${service_uid.toUpperCase()} - ${data.runDate || validatedDate}`,
						`${origins[0]} → ${destinations[0]}`,
						`🏢 ${data.atocName || 'Unknown'} | 🚊 ${data.runningIdentity || data.trainIdentity || 'Unknown'}`,
						'═'.repeat(60)
					];
					
					// Find current position and progress
					const locations = data.locations || [];
					let currentPosition = null;
					let currentLocationIndex = -1;
					let completedStops = 0;
					let totalStops = locations.length;
					
					// Analyze progress through journey
					for (let i = 0; i < locations.length; i++) {
						const location = locations[i];
						
						// Check if train has departed this location
						const hasDeparted = location.realtimeDepartureActual || 
							(location.realtimeDeparture && location.displayAs === 'ORIGIN');
						
						// Check if train has arrived at this location
						const hasArrived = location.realtimeArrivalActual ||
							(location.realtimeArrival && ['DESTINATION', 'CALL'].includes(location.displayAs));
						
						if (location.serviceLocation) {
							currentPosition = {
								location: location,
								index: i,
								status: this.interpretServiceLocation(location.serviceLocation)
							};
							currentLocationIndex = i;
						}
						
						if (hasDeparted || (hasArrived && location.displayAs === 'DESTINATION')) {
							completedStops++;
						}
					}
					
					// Progress indicator
					const progressPercent = Math.round((completedStops / totalStops) * 100);
					const progressBar = '█'.repeat(Math.floor(progressPercent / 5)) + '░'.repeat(20 - Math.floor(progressPercent / 5));
					result.push(`📊 PROGRESS: ${progressPercent}% [${progressBar}] ${completedStops}/${totalStops} stops`);
					
					// Current position
					if (currentPosition) {
						const loc = currentPosition.location;
						result.push('', `📍 CURRENT POSITION: ${currentPosition.status}`);
						result.push(`🚉 ${loc.description || 'Unknown Station'}`);
						
						// Current timing info
						const times = [];
						if (loc.realtimeArrival) {
							const arrTime = this.formatTime(loc.realtimeArrival);
							const status = loc.realtimeArrivalActual ? 'Arrived' : 'Expected';
							times.push(`Arr: ${arrTime} (${status})`);
						}
						if (loc.realtimeDeparture) {
							const depTime = this.formatTime(loc.realtimeDeparture);
							const status = loc.realtimeDepartureActual ? 'Departed' : 'Expected';
							times.push(`Dep: ${depTime} (${status})`);
						}
						if (times.length > 0) {
							result.push(`⏰ ${times.join(' | ')}`);
						}
						
						// Platform info
						const platformInfo = this.formatPlatformInfo(loc);
						if (platformInfo) {
							result.push(`🚉 ${platformInfo}`);
						}
					} else {
						result.push('', '📍 CURRENT POSITION: Location data not available');
					}
					
					result.push('', '🛤️  JOURNEY PROGRESS', '─'.repeat(60));
					
					// Compact journey overview showing status of each stop
					for (let i = 0; i < locations.length; i++) {
						const location = locations[i];
						const stationName = location.description || 'Unknown';
						
						let statusIcon = '';
						let statusText = '';
						
						// Determine status
						if (location.realtimeDepartureActual || 
							(location.realtimeArrivalActual && location.displayAs === 'DESTINATION')) {
							statusIcon = '✅';
							statusText = 'Completed';
						} else if (location.serviceLocation) {
							statusIcon = '🚂';
							statusText = this.interpretServiceLocation(location.serviceLocation);
						} else if (location.realtimeArrival || location.realtimeDeparture) {
							statusIcon = '🕐';
							statusText = 'Scheduled';
						} else {
							statusIcon = '⏳';
							statusText = 'Pending';
						}
						
						// Time info
						let timeInfo = '';
						if (location.displayAs === 'ORIGIN' && location.gbttBookedDeparture) {
							timeInfo = `Dep: ${this.formatTime(location.gbttBookedDeparture)}`;
						} else if (location.displayAs === 'DESTINATION' && location.gbttBookedArrival) {
							timeInfo = `Arr: ${this.formatTime(location.gbttBookedArrival)}`;
						} else if (location.gbttBookedArrival && location.gbttBookedDeparture) {
							timeInfo = `${this.formatTime(location.gbttBookedArrival)}-${this.formatTime(location.gbttBookedDeparture)}`;
						}
						
						result.push(`${statusIcon} ${stationName.padEnd(25)} ${timeInfo.padEnd(15)} ${statusText}`);
					}
					
					// Next stops
					const nextStops = locations.slice(currentLocationIndex + 1, currentLocationIndex + 4)
						.filter(loc => !loc.realtimeDepartureActual);
					
					if (nextStops.length > 0) {
						result.push('', '⏭️  NEXT STOPS');
						for (const stop of nextStops) {
							const stationName = stop.description || 'Unknown';
							let timeInfo = '';
							
							if (stop.gbttBookedArrival) {
								timeInfo = `Arr: ${this.formatTime(stop.gbttBookedArrival)}`;
							}
							if (stop.gbttBookedDeparture) {
								timeInfo += timeInfo ? ` | Dep: ${this.formatTime(stop.gbttBookedDeparture)}` 
									: `Dep: ${this.formatTime(stop.gbttBookedDeparture)}`;
							}
							
							result.push(`  🔜 ${stationName} - ${timeInfo}`);
						}
					}
					
					// Summary
					const now = new Date().toLocaleTimeString();
					result.push('', `🕐 Last updated: ${now}`);
					
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

		// Tool 5: Check Service Platform - Platform-specific information and change alerts
		this.server.tool(
			"check_service_platform",
			{
				service_uid: z.string().describe("6-character service identifier found in departure/arrival board results (e.g., W72419, C12345, S98765). Always exactly 6 characters."),
				date: z.string().optional().describe("Date in YYYY/MM/DD format with forward slashes (e.g., 2025/01/31). Must match the date when the service UID was found. Defaults to today if omitted."),
				station_code: z.string().optional().describe("3-letter CRS station code to focus on specific station (e.g., BTH=Bath Spa, PAD=London Paddington). If omitted, shows platform information for all stations on the service route.")
			},
			"Check platform information for a specific train service, with optional focus on a particular station. Shows platform assignments, confirmation status, and any platform changes with clear alerts. Use this when users need platform information for a specific train ('what platform is train [service_uid] using?'), either across its whole journey or at a particular station. Returns platform numbers with confirmation status (confirmed/not confirmed/changed), timing context, and prominent alerts for any platform changes. Essential for passengers who need to know exactly which platform to use and whether there have been any last-minute changes.",
			async ({ service_uid, date, station_code }: { service_uid: string; date?: string; station_code?: string }) => {
				try {
					const validatedDate = this.validateAndFormatDate(date);
					const dateMatch = validatedDate.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
					if (!dateMatch) {
						return {
							content: [{ type: "text", text: 'Error: Invalid date format' }]
						};
					}
					
					const [, year, month, day] = dateMatch;
					const endpoint = `/json/service/${service_uid.toUpperCase()}/${year}/${month}/${day}`;
					const data = await this.makeApiRequest(endpoint);
					
					// Service Header
					const origins = this.extractServiceOrigins(data);
					const destinations = this.extractServiceDestinations(data);
					
					const result = [
						`🚉 PLATFORM CHECK - Service ${service_uid.toUpperCase()}`,
						`${origins[0]} → ${destinations[0]}`,
						`🏢 ${data.atocName || 'Unknown'} | 📅 ${data.runDate || validatedDate}`,
						'═'.repeat(60)
					];
					
					const locations = data.locations || [];
					let platformChanges = 0;
					let unconfirmedPlatforms = 0;
					let totalPlatforms = 0;
					
					// Filter locations if specific station requested
					let locationsToCheck = locations;
					if (station_code) {
						locationsToCheck = locations.filter(loc => 
							loc.crs?.toUpperCase() === station_code.toUpperCase()
						);
						
						if (locationsToCheck.length === 0) {
							return {
								content: [{ type: "text", text: `Service ${service_uid.toUpperCase()} does not call at station ${station_code.toUpperCase()} on ${validatedDate}` }]
							};
						}
						
						result[0] = `🚉 PLATFORM CHECK - ${station_code.toUpperCase()} Station`;
						result.push(`Service ${service_uid.toUpperCase()}: ${origins[0]} → ${destinations[0]}`);
					}
					
					// Analyze platform information
					const platformData = [];
					
					for (const location of locationsToCheck) {
						if (!location.platform) continue;
						
						totalPlatforms++;
						const stationName = location.description || 'Unknown Station';
						const platform = location.platform;
						const confirmed = location.platformConfirmed || false;
						const changed = location.platformChanged || false;
						
						if (changed) platformChanges++;
						if (!confirmed) unconfirmedPlatforms++;
						
						// Platform status
						let platformStatus = '';
						let alertIcon = '🚉';
						
						if (changed) {
							platformStatus = 'CHANGED';
							alertIcon = '⚠️';
						} else if (!confirmed) {
							platformStatus = 'Not confirmed';
							alertIcon = '❓';
						} else {
							platformStatus = 'Confirmed';
							alertIcon = '✅';
						}
						
						// Times for context
						const times = [];
						if (location.gbttBookedArrival) {
							times.push(`Arr: ${this.formatTime(location.gbttBookedArrival)}`);
						}
						if (location.gbttBookedDeparture) {
							times.push(`Dep: ${this.formatTime(location.gbttBookedDeparture)}`);
						}
						const timeStr = times.length > 0 ? ` | ${times.join(' - ')}` : '';
						
						// Real-time platform updates
						let realtimeInfo = '';
						if (location.realtimeArrival || location.realtimeDeparture) {
							const realTimes = [];
							if (location.realtimeArrival) {
								const status = location.realtimeArrivalActual ? 'Arrived' : 'Expected';
								realTimes.push(`${status} ${this.formatTime(location.realtimeArrival)}`);
							}
							if (location.realtimeDeparture) {
								const status = location.realtimeDepartureActual ? 'Departed' : 'Expected';
								realTimes.push(`${status} ${this.formatTime(location.realtimeDeparture)}`);
							}
							if (realTimes.length > 0) {
								realtimeInfo = ` | ${realTimes.join(' | ')}`;
							}
						}
						
						platformData.push({
							station: stationName,
							platform: platform,
							status: platformStatus,
							icon: alertIcon,
							timeStr: timeStr,
							realtimeInfo: realtimeInfo,
							displayAs: location.displayAs,
							changed: changed,
							confirmed: confirmed
						});
					}
					
					// Summary
					if (totalPlatforms === 0) {
						result.push('ℹ️  No platform information available for this service');
					} else {
						result.push(`📊 PLATFORM SUMMARY: ${totalPlatforms} platforms assigned`);
						
						if (platformChanges > 0) {
							result.push(`⚠️  ALERTS: ${platformChanges} platform change(s) detected`);
						}
						
						if (unconfirmedPlatforms > 0) {
							result.push(`❓ ${unconfirmedPlatforms} platform(s) not yet confirmed`);
						}
						
						if (platformChanges === 0 && unconfirmedPlatforms === 0) {
							result.push('✅ All platforms confirmed with no changes');
						}
					}
					
					result.push('', '🚉 PLATFORM DETAILS', '─'.repeat(60));
					
					// Show platform details
					if (platformData.length === 0) {
						result.push('No platform assignments found');
					} else {
						// Sort by changed platforms first, then by time
						platformData.sort((a, b) => {
							if (a.changed && !b.changed) return -1;
							if (!a.changed && b.changed) return 1;
							return 0;
						});
						
						for (const data of platformData) {
							result.push(`${data.icon} ${data.station}`);
							result.push(`   Platform ${data.platform} - ${data.status}${data.timeStr}${data.realtimeInfo}`);
							
							// Add context for display type
							let contextInfo = '';
							if (data.displayAs === 'ORIGIN') {
								contextInfo = 'Departure platform';
							} else if (data.displayAs === 'DESTINATION') {
								contextInfo = 'Arrival platform';
							} else {
								contextInfo = 'Calling platform';
							}
							result.push(`   ${contextInfo}`);
							
							result.push('');
						}
					}
					
					// Quick reference for platform changes
					const changedPlatforms = platformData.filter(p => p.changed);
					if (changedPlatforms.length > 0) {
						result.push('⚠️  PLATFORM CHANGES ALERT');
						for (const change of changedPlatforms) {
							result.push(`   ${change.station}: Platform ${change.platform} (CHANGED)`);
						}
						result.push('');
					}
					
					// Update timestamp
					const now = new Date().toLocaleTimeString();
					result.push(`🕐 Platform information updated: ${now}`);
					
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

Enhanced tools available:
• get_live_departure_board - Clean departure board with real-time status
• get_live_arrivals_board - Arrivals with origin prominence
• get_service_details - Organized service timeline with progress indicators
• track_service_progress - Real-time journey tracking with position
• check_service_platform - Platform information and change alerts

Example: Connect to ${url.origin}/sse with an MCP client`, { 
			headers: { 'Content-Type': 'text/plain' }
		});
	},
};
