/**
 * Agent 06 - UX Designer
 *
 * Specialized agent for user experience design, wireframes, and usability.
 *
 * @module Agent06UX
 */

import {
  AgentManifest,
  TaskEnvelope,
  AgentResult,
  EventPublisher,
  Artifact,
  Decision,
} from '@dap/agent-runtime-common';
import * as fs from 'fs';
import * as yaml from 'yaml';

// ============================================================================
// Types
// ============================================================================

export interface UserJourney {
  id: string;
  name: string;
  steps: JourneyStep[];
}

export interface JourneyStep {
  order: number;
  action: string;
  screen: string;
  goal: string;
  pain_points?: string[];
}

export interface Wireframe {
  id: string;
  name: string;
  description: string;
  layout: LayoutElement[];
  annotations: string[];
}

export interface LayoutElement {
  id: string;
  type: 'header' | 'sidebar' | 'content' | 'footer' | 'modal' | 'button' | 'input' | 'card';
  position: { x: number; y: number };
  size: { width: number; height: number };
  label?: string;
  description?: string;
}

export interface DesignSpec {
  id: string;
  title: string;
  user_journeys: UserJourney[];
  wireframes: Wireframe[];
  components: ComponentSpec[];
  accessibility_notes: string[];
}

export interface ComponentSpec {
  name: string;
  type: string;
  states: string[];
  accessibility: {
    role: string;
    label: string;
    keyboard: string[];
  };
}

// ============================================================================
// Configuration
// ============================================================================

export interface UXConfig {
  eventPublisher: EventPublisher;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class UXDesignerAgent {
  private config: UXConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: UXConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[UXDesigner] Initialized with manifest: ${this.manifest.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};

      // Phase 1: Map user journeys
      const journeys = await this.mapUserJourneys(inputs);

      // Phase 2: Create wireframes
      const wireframes = await this.createWireframes(journeys, inputs);

      // Phase 3: Define component specs
      const components = await this.defineComponents(wireframes);

      // Phase 4: Document accessibility
      const accessibilityNotes = await this.documentAccessibility(components);

      const spec: DesignSpec = {
        id: this.generateId(),
        title: inputs.feature_name as string || 'UX Design',
        user_journeys: journeys,
        wireframes,
        components,
        accessibility_notes: accessibilityNotes,
      };

      // Validate
      this.validateDesign(spec);

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'ux-design',
          summary: `UX design: ${spec.title}`,
          content: JSON.stringify(spec, null, 2),
          produced_by: 'agent-06-ux',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'design_approach',
          reason: 'User-centered design approach',
          confidence: 0.85,
          inputs: { journeys_count: journeys.length },
        },
      ];

      await this.config.eventPublisher.publish('agent.06.design-complete', {
        spec_id: spec.id,
        timestamp: new Date().toISOString(),
      });

      return {
        taskId,
        status: 'success',
        artifacts,
        decisions,
        telemetry: {
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          cost: 0,
          errors: 0,
          actionsExecuted: 4,
        },
      };
    } catch (error) {
      console.error(`[UXDesigner] Task ${taskId} failed:`, error);

      return {
        taskId,
        status: 'failure',
        artifacts: [],
        decisions: [],
        telemetry: {
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          cost: 0,
          errors: 1,
          actionsExecuted: 0,
        },
        error: {
          code: 'UX_TASK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async mapUserJourneys(inputs: Record<string, unknown>): Promise<UserJourney[]> {
    return [
      {
        id: this.generateId(),
        name: 'Dashboard Access Journey',
        steps: [
          { order: 1, action: 'Login', screen: 'Login Screen', goal: 'Authenticate user' },
          { order: 2, action: 'View Dashboard', screen: 'Dashboard', goal: 'See overview' },
          { order: 3, action: 'Navigate', screen: 'Navigation', goal: 'Find features' },
        ],
      },
    ];
  }

  private async createWireframes(journeys: UserJourney[], inputs: Record<string, unknown>): Promise<Wireframe[]> {
    return journeys.map(journey => ({
      id: this.generateId(),
      name: journey.name,
      description: `Wireframe for ${journey.name}`,
      layout: [
        {
          id: this.generateId(),
          type: 'header',
          position: { x: 0, y: 0 },
          size: { width: 1200, height: 60 },
          label: 'App Header',
        },
        {
          id: this.generateId(),
          type: 'content',
          position: { x: 0, y: 60 },
          size: { width: 1200, height: 540 },
          label: 'Main Content',
        },
        {
          id: this.generateId(),
          type: 'button',
          position: { x: 100, y: 100 },
          size: { width: 120, height: 40 },
          label: 'Primary Action',
        },
      ],
      annotations: [
        'Header contains logo, navigation, user menu',
        'Content area is scrollable',
        'Primary action button follows brand colors',
      ],
    }));
  }

  private async defineComponents(wireframes: Wireframe[]): Promise<ComponentSpec[]> {
    return [
      {
        name: 'PrimaryButton',
        type: 'button',
        states: ['default', 'hover', 'active', 'disabled'],
        accessibility: {
          role: 'button',
          label: 'Primary action button',
          keyboard: ['Enter', 'Space'],
        },
      },
      {
        name: 'InputField',
        type: 'input',
        states: ['default', 'focus', 'error', 'disabled'],
        accessibility: {
          role: 'textbox',
          label: 'Text input field',
          keyboard: [],
        },
      },
    ];
  }

  private async documentAccessibility(components: ComponentSpec[]): Promise<string[]> {
    return [
      'All buttons have ARIA labels',
      'Color contrast meets WCAG 2.1 AA (4.5:1)',
      'Keyboard navigation for all interactive elements',
      'Focus indicators visible',
      'Screen reader compatible',
    ];
  }

  private validateDesign(spec: DesignSpec): void {
    // Check accessibility notes
    if (spec.accessibility_notes.length === 0) {
      throw new Error('Invariant violation: No accessibility notes documented');
    }

    // Check wireframes have annotations
    for (const wf of spec.wireframes) {
      if (wf.annotations.length === 0) {
        throw new Error(`Invariant violation: Wireframe ${wf.id} has no annotations`);
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createUXDesignerAgent(config: UXConfig): UXDesignerAgent {
  return new UXDesignerAgent(config);
}

async function main() {
  const agent = createUXDesignerAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-06-ux',
    goal: 'Design UX for analytics dashboard',
    inputs: {
      feature_name: 'Analytics Dashboard',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default UXDesignerAgent;
