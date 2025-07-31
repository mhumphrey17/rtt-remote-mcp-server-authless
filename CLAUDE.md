# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Approach & MCP Usage

### Core Principles
- **Keep implementations SIMPLE and focused** - avoid over-engineering or unnecessary complexity
- **Stick closely to the specified tasks** - don't add features not explicitly requested
- **Test incrementally** - validate each change before proceeding
- **ALWAYS use Task Manager MCP** for structured project management
- **Preserve existing Cloudflare Workers infrastructure** - don't modify server setup or deployment config

### MCP Tool Usage (Assume MCPs are connected - Context7 may occasionally disconnect)

**Task Manager MCP (mcp-task-manager) - USE FOR ALL WORK:**
- Start ANY significant work with `request_planning` 
- Get user approval at each step using task completion tools
- Track all progress systematically through the task workflow

**Sequential Thinking MCP (mcp-sequentialthinking-tools) - USE FOR:**
- Complex coding problems and implementation planning
- Multi-step technical analysis and debugging
- Breaking down implementation approaches
- Any problem requiring systematic analysis

**Context7 MCP (upstash-context-7-mcp) - USE ONLY WHEN:**
- Need to verify specific API usage for @modelcontextprotocol/sdk, agents, or zod
- Unsure about Cloudflare Workers API best practices
- Encountering unfamiliar library methods or patterns
- Need current documentation for existing dependencies
- **Note**: This MCP may disconnect - check connection before use

## Project Enhancement Plan

### Current Status ✅ COMPLETED
This MCP server has **fully working infrastructure and enhanced tools**. All 5 enhanced tools have been successfully implemented and are working correctly with proper:
- ✅ Modern MCP SDK API (server.registerTool)
- ✅ Search API data structure fixes (service.locationDetail)
- ✅ UK timezone-aware time filtering
- ✅ Comprehensive tool descriptions and schemas

**REMAINING TASK: Add platform exclusion capability to departure/arrival boards**

### Implementation Phases

#### Phase 1: Cleanup & Infrastructure Enhancement
1. **Remove existing problematic tools:**
   - `search_departures` (limited real-time status)
   - `search_arrivals` (inefficient filtering)
   - `get_service_details` (information overload)
   - `search_station_info` (hardcoded lookup table - doesn't use API!)

2. **Preserve working infrastructure:**
   - Keep `makeApiRequest()` method and authentication
   - Keep server setup and deployment configuration
   - Keep existing error handling patterns

3. **Add helper methods:**
   ```typescript
   private extractServiceOrigins(service: any): string[]
   private extractServiceDestinations(service: any): string[]
   private interpretServiceLocation(locationCode: string): string
   private formatPlatformInfo(location: any): string
   private validateAndFormatDate(date?: string): string
   ```

#### Phase 2: Implement 5 Enhanced Tools ✅ COMPLETED

**Tool 1: `get_live_departure_board(station_code, max_results?)` ✅**
- Endpoint: `/json/search/${station_code}/${date}?from=${currentTimeHHMM}` (UK timezone)
- Focus: Live departure board showing upcoming trains only
- Features: Real-time status, UK timezone filtering, platform info, delay indicators
- **NEEDS: Platform exclusion parameter for filtering high-frequency services**

**Tool 2: `get_live_arrivals_board(station_code, max_results?)` ✅**
- Endpoint: `/json/search/${station_code}/${date}?from=${currentTimeHHMM}` (UK timezone)
- Focus: Live arrivals board showing upcoming trains only
- Features: Origin prominence, UK timezone filtering, platform info, delay indicators
- **NEEDS: Platform exclusion parameter for filtering high-frequency services**

**Tool 3: `get_service_details(service_uid, date)` ✅**
- Endpoint: `/json/service/${service_uid}/${year}/${month}/${day}`
- Focus: Comprehensive but organized service information
- Features: Enhanced timeline, progress indicators, clear scheduled vs actual

**Tool 4: `track_service_progress(service_uid, date)` ✅**
- Endpoint: `/json/service/${service_uid}/${year}/${month}/${day}`
- Focus: Real-time journey tracking and current position
- Features: Progress bar, current position using `serviceLocation`, journey completion

**Tool 5: `check_service_platform(service_uid, date, station_code?)` ✅**
- Endpoint: `/json/service/${service_uid}/${year}/${month}/${day}`
- Focus: Platform-specific information and changes
- Features: Platform assignments, confirmation status, change alerts

#### Phase 3: Testing & Polish ✅ COMPLETED
- ✅ All tools tested and working correctly
- ✅ API integration validated with proper data structure handling
- ✅ Error handling refined for Search API vs Service API differences
- ✅ Consistent formatting across all tools
- ✅ UK timezone-aware time filtering implemented

#### Phase 4: Platform Exclusion Enhancement ⏳ PENDING
**FINAL REMAINING TASK**: Add platform exclusion capability to tools 1 & 2 to filter out high-frequency services like Elizabeth Line trains that dominate results at major stations.

## Technical Details

### API Configuration
- **Base URL:** `https://api.rtt.io/api/v1`
- **Auth:** HTTP Basic Auth (credentials in src/index.ts:14-15)
- **Mode:** Simple Mode only (detailed mode not yet available)
- **Date Format:** YYYY/MM/DD with forward slashes (e.g., 2025/01/31)

### Key API Endpoints
- Station Services: `/json/search/${station_code}/${date}`
- Service Details: `/json/service/${service_uid}/${year}/${month}/${day}`

### Available Simple Mode Parameters
**Service Level:** serviceUid, runDate, serviceType, isPassenger, atocName, trainClass, sleeper, origin, destination, realtimeActivated, runningIdentity

**Location Level:** realtimeActivated, tiploc, crs, description, gbttBookedArrival/Departure, realtimeArrival/Departure, realtimeArrivalActual/DepartureActual, realtimeGbttArrivalLateness/DepartureLateness, platform, platformConfirmed/Changed, displayAs, serviceLocation, cancelReasonCode/ShortText/LongText

### Architecture (PRESERVE THIS)
- **MCP Agent**: RealtimeTrainsMCP class extending McpAgent
- **Durable Objects**: Uses MCP_OBJECT binding
- **Endpoints**: `/sse` (Server-Sent Events), `/mcp` (MCP over HTTP)
- **Dependencies**: @modelcontextprotocol/sdk, agents, zod

### Development Commands
- `npm run dev` or `npm start` - Local development
- `npm run format` - Code formatting
- `npm run deploy` - Deploy to Cloudflare Workers

## Important Implementation Notes

1. **Date Validation**: Always validate YYYY/MM/DD format before API calls
2. **Error Handling**: Maintain existing error handling patterns (401, 403, 404, 500+)
3. **Service Location Mapping**: 
   - APPR_STAT = Approaching Station
   - APPR_PLAT = Arriving
   - AT_PLAT = At Platform
   - DEP_PREP = Preparing to depart
   - DEP_READY = Ready to depart
4. **Display As Values**: CALL, PASS, ORIGIN, DESTINATION, STARTS, TERMINATES, CANCELLED_CALL, CANCELLED_PASS
5. **Platform Status**: Use platformConfirmed and platformChanged for accurate platform information

## Success Criteria ✅ ACHIEVED
- ✅ All 5 new tools working correctly with the Realtime Trains API
- ✅ Clean, focused tool functionality (each tool has one clear purpose)
- ✅ Better real-time status interpretation with UK timezone awareness
- ✅ Preserved Cloudflare Workers infrastructure and deployment capability
- ✅ Simple, maintainable code without over-engineering
- ✅ Modern MCP SDK API implementation (server.registerTool)
- ✅ Proper Search API data structure handling (service.locationDetail)
- ✅ Live time filtering showing only upcoming trains

## Current Implementation Status

### ✅ COMPLETED COMPONENTS:
1. **Infrastructure**: Working Cloudflare Workers setup with MCP agent
2. **Authentication**: HTTP Basic Auth with Realtime Trains API
3. **Helper Methods**: 5 utility methods for data extraction and formatting
4. **Modern MCP API**: All tools use server.registerTool() correctly
5. **Data Structure Fixes**: Proper handling of Search API vs Service API differences
6. **Time Filtering**: UK timezone-aware filtering showing only upcoming trains
7. **Comprehensive Tool Descriptions**: Detailed schemas and use cases

### ⏳ PENDING: Platform Exclusion Enhancement
**Single remaining task**: Add `exclude_platforms` parameter to departure and arrival board tools to filter out high-frequency services like Elizabeth Line platforms A & B at Paddington.
```
