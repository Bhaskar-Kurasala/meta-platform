/**
 * Identity & Auth Component
 *
 * Manages unique agent identity, scoped permissions, and short-lived tokens
 * with automatic rotation (15-minute interval).
 *
 * @module IdentityAuth
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AgentIdentity,
  AgentManifest,
  AgentPermission,
  ChassisError,
  AuthenticationError,
  TokenRotationConfig,
  TokenInfo,
} from '../types';

/**
 * Configuration for identity management
 */
export interface IdentityConfig {
  rotationIntervalMs: number;      // Default: 15 minutes (900000ms)
  refreshBufferMs: number;         // Refresh buffer before expiry
  maxRotationRetries: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: IdentityConfig = {
  rotationIntervalMs: 900000,      // 15 minutes
  refreshBufferMs: 60000,          // 1 minute buffer
  maxRotationRetries: 3,
};

/**
 * Identity & Auth Manager
 *
 * Responsibilities:
 * - Generate and manage unique agent identities
 * - Maintain scoped permissions from manifest
 * - Handle token lifecycle (issuance, rotation, validation)
 * - Enforce permission boundaries
 */
export class IdentityAuth {
  private identity: AgentIdentity | null = null;
  private manifest: AgentManifest | null = null;
  private config: IdentityConfig;
  private rotationTimer: NodeJS.Timeout | null = null;
  private rotationRetryCount = 0;
  private tokenCallback: (() => Promise<string>) | null = null;

  /**
   * Create a new IdentityAuth instance
   */
  constructor(config: Partial<IdentityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize identity from agent manifest
   *
   * @param manifest Agent manifest containing identity and permissions
   * @param tokenCallback Callback function to obtain new tokens
   */
  async initialize(
    manifest: AgentManifest,
    tokenCallback: () => Promise<string>
  ): Promise<AgentIdentity> {
    this.manifest = manifest;
    this.tokenCallback = tokenCallback;

    // Generate initial token
    const token = await this.obtainNewToken();

    this.identity = {
      agentId: manifest.id,
      agentName: manifest.name,
      role: manifest.role,
      scopedPermissions: manifest.permissions,
      workloadToken: token,
      tokenExpiresAt: new Date(Date.now() + this.config.rotationIntervalMs),
    };

    // Start token rotation timer
    this.startTokenRotation();

    return this.identity;
  }

  /**
   * Get current agent identity
   */
  getIdentity(): AgentIdentity {
    if (!this.identity) {
      throw new AuthenticationError('Agent identity not initialized');
    }
    return this.identity;
  }

  /**
   * Get current agent ID
   */
  getAgentId(): string {
    return this.identity?.agentId ?? '';
  }

  /**
   * Get current role
   */
  getRole(): string {
    return this.identity?.role ?? '';
  }

  /**
   * Get current permissions
   */
  getPermissions(): AgentPermission[] {
    return this.identity?.scopedPermissions ?? [];
  }

  /**
   * Get current valid token
   */
  getToken(): string {
    if (!this.identity) {
      throw new AuthenticationError('Agent identity not initialized');
    }
    return this.identity.workloadToken;
  }

  /**
   * Check if token is valid and not about to expire
   */
  isTokenValid(): boolean {
    if (!this.identity) return false;

    const now = new Date();
    const bufferExpiry = new Date(
      this.identity.tokenExpiresAt.getTime() - this.config.refreshBufferMs
    );

    return now < bufferExpiry;
  }

  /**
   * Get token info
   */
  getTokenInfo(): TokenInfo {
    if (!this.identity) {
      throw new AuthenticationError('Agent identity not initialized');
    }

    return {
      token: this.identity.workloadToken,
      issuedAt: new Date(this.identity.tokenExpiresAt.getTime() - this.config.rotationIntervalMs),
      expiresAt: this.identity.tokenExpiresAt,
      isValid: this.isTokenValid(),
    };
  }

  /**
   * Check if agent has specific permission
   */
  hasPermission(resource: string, action: AgentPermission['actions'][number]): boolean {
    const permissions = this.getPermissions();

    return permissions.some(p => {
      // Check for exact match or wildcard
      const resourceMatch = p.resource === '*' || p.resource === resource;
      const actionMatch = p.actions.includes('*' as any) || p.actions.includes(action);

      return resourceMatch && actionMatch;
    });
  }

  /**
   * Check if agent can access specific tool
   */
  canAccessTool(toolName: string): boolean {
    return this.hasPermission(`tool:${toolName}`, 'execute');
  }

  /**
   * Manually trigger token rotation
   */
  async rotateToken(): Promise<void> {
    try {
      const newToken = await this.obtainNewToken();

      if (this.identity) {
        this.identity.workloadToken = newToken;
        this.identity.tokenExpiresAt = new Date(Date.now() + this.config.rotationIntervalMs);
      }

      this.rotationRetryCount = 0;
    } catch (error) {
      this.rotationRetryCount++;

      if (this.rotationRetryCount >= this.config.maxRotationRetries) {
        throw new AuthenticationError(
          `Token rotation failed after ${this.rotationRetryCount} attempts`
        );
      }

      // Retry after a short delay
      await new Promise(resolve => setTimeout(resolve, 1000 * this.rotationRetryCount));
      return this.rotateToken();
    }
  }

  /**
   * Obtain a new token from the auth service
   */
  private async obtainNewToken(): Promise<string> {
    if (!this.tokenCallback) {
      // For testing/mock purposes, generate a mock token
      return `mock_token_${uuidv4()}_${Date.now()}`;
    }

    return this.tokenCallback();
  }

  /**
   * Start automatic token rotation timer
   */
  private startTokenRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    // Schedule rotation before expiry
    const rotationTime = this.config.rotationIntervalMs - this.config.refreshBufferMs;

    this.rotationTimer = setInterval(async () => {
      try {
        await this.rotateToken();
      } catch (error) {
        console.error('Token rotation failed:', error);
      }
    }, rotationTime);
  }

  /**
   * Stop token rotation
   */
  stopRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  /**
   * Shutdown - clean up resources
   */
  async shutdown(): Promise<void> {
    this.stopRotation();
    this.identity = null;
    this.manifest = null;
    this.tokenCallback = null;
  }
}

/**
 * Factory function to create IdentityAuth instance
 */
export function createIdentityAuth(config?: Partial<IdentityConfig>): IdentityAuth {
  return new IdentityAuth(config);
}
