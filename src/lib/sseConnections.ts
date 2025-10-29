/**
 * Shared SSE connections store
 * This module is imported by both the SSE endpoint and the webhook
 * to ensure they share the same connection Map
 */

export const sseConnections = new Map<string, ReadableStreamDefaultController[]>();

