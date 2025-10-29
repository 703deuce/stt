/**
 * Centralized SSE Connection Manager
 * This manages all SSE connections in a single instance
 */

type SSEController = ReadableStreamDefaultController;

class SSEManager {
  private connections: Map<string, SSEController[]> = new Map();

  /**
   * Add a connection for a user
   */
  addConnection(userId: string, controller: SSEController): void {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, []);
    }
    this.connections.get(userId)!.push(controller);
    console.log(`✅ SSE connection added for ${userId}. Total: ${this.connections.get(userId)!.length}`);
  }

  /**
   * Remove a connection for a user
   */
  removeConnection(userId: string, controller: SSEController): void {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const index = userConnections.indexOf(controller);
      if (index > -1) {
        userConnections.splice(index, 1);
        console.log(`❌ SSE connection removed for ${userId}. Remaining: ${userConnections.length}`);
        if (userConnections.length === 0) {
          this.connections.delete(userId);
        }
      }
    }
  }

  /**
   * Get all connections for a user
   */
  getConnections(userId: string): SSEController[] {
    return this.connections.get(userId) || [];
  }

  /**
   * Send update to all connections for a user
   */
  sendUpdate(userId: string, data: any): void {
    const userConnections = this.getConnections(userId);
    console.log(`📡 Sending update to ${userId}: ${userConnections.length} connections`);
    
    if (userConnections.length === 0) {
      console.log(`⚠️ No connections found for ${userId}`);
      console.log(`📊 Total users with connections: ${this.connections.size}`);
      console.log(`📊 User IDs: ${Array.from(this.connections.keys()).join(', ')}`);
      return;
    }

    const message = `data: ${JSON.stringify(data)}\n\n`;
    
    userConnections.forEach((controller, index) => {
      try {
        controller.enqueue(message);
        console.log(`✅ Update sent to connection ${index + 1} for ${userId}`);
      } catch (error) {
        console.error(`❌ Failed to send to connection ${index + 1} for ${userId}:`, error);
        this.removeConnection(userId, controller);
      }
    });
  }

  /**
   * Get connection count for debugging
   */
  getStats() {
    return {
      totalUsers: this.connections.size,
      totalConnections: Array.from(this.connections.values()).reduce((sum, conns) => sum + conns.length, 0),
      users: Array.from(this.connections.keys()),
      userConnections: Object.fromEntries(
        Array.from(this.connections.entries()).map(([userId, conns]) => [userId, conns.length])
      )
    };
  }
}

// Singleton instance
export const sseManager = new SSEManager();

