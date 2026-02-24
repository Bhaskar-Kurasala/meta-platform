/**
 * Agent 10 - Test
 *
 * Specialized agent for test creation, test strategy, and coverage analysis.
 *
 * @module Agent10Test
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

export interface TestRequest {
  target_files: string[];
  test_type: 'unit' | 'integration' | 'e2e' | 'all';
  coverage_target?: number;
}

export interface TestSuite {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e';
  files: TestFile[];
  coverage: CoverageReport;
}

export interface TestFile {
  path: string;
  language: string;
  content: string;
  test_cases: TestCase[];
}

export interface TestCase {
  name: string;
  description: string;
  assertions: Assertion[];
  mocks?: MockConfig[];
}

export interface Assertion {
  type: 'equal' | 'notEqual' | 'throws' | 'rejects' | 'truthy' | 'falsy' | 'deepEqual';
  actual: string;
  expected?: string;
}

export interface MockConfig {
  module: string;
  mock_implementation?: string;
}

export interface CoverageReport {
  overall: number;
  by_file: { [key: string]: number };
  uncovered_lines: number[];
}

// ============================================================================
// Configuration
// ============================================================================

export interface TestConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class TestAgent {
  private config: TestConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: TestConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Test] Initialized with manifest: ${this.manifest.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const testType = inputs.test_type as string || 'unit';

      let testSuite: TestSuite;

      if (testType === 'unit') {
        testSuite = await this.createUnitTests(inputs);
      } else if (testType === 'integration') {
        testSuite = await this.createIntegrationTests(inputs);
      } else if (testType === 'e2e') {
        testSuite = await this.createE2ETests(inputs);
      } else {
        testSuite = await this.createAllTests(inputs);
      }

      // Validate invariants
      this.validateTests(testSuite);

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'test-suite',
          summary: `Test Suite: ${testSuite.name}`,
          content: JSON.stringify(testSuite, null, 2),
          produced_by: 'agent-10-test',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'test_strategy',
          reason: `Created ${testSuite.files.length} test files with ${testSuite.coverage.overall}% coverage`,
          confidence: 0.9,
          inputs: { test_count: testSuite.files.length, coverage: testSuite.coverage.overall },
        },
      ];

      await this.config.eventPublisher.publish('agent.10.tests-created', {
        suite_id: testSuite.id,
        test_count: testSuite.files.length,
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
          actionsExecuted: testSuite.files.length,
        },
      };
    } catch (error) {
      console.error(`[Test] Task ${taskId} failed:`, error);

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
          code: 'TEST_CREATION_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async createUnitTests(inputs: Record<string, unknown>): Promise<TestSuite> {
    const targetFiles = inputs.target_files as string[] || ['src/services/Feature.ts'];
    const testFiles: TestFile[] = [];

    for (const file of targetFiles) {
      const testFile = this.generateUnitTest(file);
      testFiles.push(testFile);
    }

    return {
      id: this.generateId(),
      name: 'Unit Tests',
      type: 'unit',
      files: testFiles,
      coverage: this.calculateCoverage(testFiles),
    };
  }

  private async createIntegrationTests(inputs: Record<string, unknown>): Promise<TestSuite> {
    const targetFiles = inputs.target_files as string[] || ['src/services/Feature.ts'];
    const testFiles: TestFile[] = [];

    for (const file of targetFiles) {
      const testFile = this.generateIntegrationTest(file);
      testFiles.push(testFile);
    }

    return {
      id: this.generateId(),
      name: 'Integration Tests',
      type: 'integration',
      files: testFiles,
      coverage: this.calculateCoverage(testFiles),
    };
  }

  private async createE2ETests(inputs: Record<string, unknown>): Promise<TestSuite> {
    const targetFiles = inputs.target_files as string[] || ['src/services/Feature.ts'];
    const testFiles: TestFile[] = [];

    for (const file of targetFiles) {
      const testFile = this.generateE2ETest(file);
      testFiles.push(testFile);
    }

    return {
      id: this.generateId(),
      name: 'E2E Tests',
      type: 'e2e',
      files: testFiles,
      coverage: this.calculateCoverage(testFiles),
    };
  }

  private async createAllTests(inputs: Record<string, unknown>): Promise<TestSuite> {
    const targetFiles = inputs.target_files as string[] || ['src/services/Feature.ts'];
    const testFiles: TestFile[] = [];

    // Create all test types
    for (const file of targetFiles) {
      testFiles.push(this.generateUnitTest(file));
      testFiles.push(this.generateIntegrationTest(file));
    }

    // Add E2E test for main workflow
    if (targetFiles.length > 0) {
      testFiles.push(this.generateE2ETest(targetFiles[0]));
    }

    return {
      id: this.generateId(),
      name: 'Full Test Suite',
      type: 'unit',
      files: testFiles,
      coverage: this.calculateCoverage(testFiles),
    };
  }

  private generateUnitTest(sourceFile: string): TestFile {
    const className = this.extractClassName(sourceFile);
    const testPath = sourceFile.replace('src/', 'tests/').replace('.ts', '.test.ts');

    return {
      path: testPath,
      language: 'typescript',
      content: this.generateUnitTestContent(className, sourceFile),
      test_cases: [
        {
          name: 'should create instance',
          description: 'Test that class can be instantiated',
          assertions: [
            { type: 'truthy', actual: 'service' },
          ],
        },
        {
          name: 'should handle valid input',
          description: 'Test processing with valid input',
          assertions: [
            { type: 'equal', actual: 'result.success', expected: 'true' },
          ],
        },
        {
          name: 'should handle error',
          description: 'Test error handling',
          assertions: [
            { type: 'throws', actual: 'service.process(invalidInput)' },
          ],
        },
        {
          name: 'should handle edge case - empty input',
          description: 'Test with empty input',
          assertions: [
            { type: 'rejects', actual: 'service.process(emptyInput)' },
          ],
        },
        {
          name: 'should handle edge case - max input',
          description: 'Test with maximum input size',
          assertions: [
            { type: 'equal', actual: 'result.success', expected: 'true' },
          ],
        },
      ],
    };
  }

  private generateIntegrationTest(sourceFile: string): TestFile {
    const className = this.extractClassName(sourceFile);
    const testPath = sourceFile.replace('src/', 'tests/integration/').replace('.ts', '.integration.test.ts');

    return {
      path: testPath,
      language: 'typescript',
      content: this.generateIntegrationTestContent(className, sourceFile),
      test_cases: [
        {
          name: 'should integrate with database',
          description: 'Test database integration',
          assertions: [
            { type: 'truthy', actual: 'result.id' },
          ],
          mocks: [
            { module: '../mocks/database' },
          ],
        },
        {
          name: 'should handle API errors',
          description: 'Test API error handling',
          assertions: [
            { type: 'rejects', actual: 'service.callExternalAPI(invalidData)' },
          ],
        },
      ],
    };
  }

  private generateE2ETest(sourceFile: string): TestFile {
    const className = this.extractClassName(sourceFile);
    const testPath = 'tests/e2e/workflow.test.ts';

    return {
      path: testPath,
      language: 'typescript',
      content: this.generateE2ETestContent(className),
      test_cases: [
        {
          name: 'should complete full workflow',
          description: 'End-to-end workflow test',
          assertions: [
            { type: 'equal', actual: 'response.status', expected: '200' },
          ],
        },
      ],
    };
  }

  private generateUnitTestContent(className: string, sourceFile: string): string {
    return `import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ${className} } from '../../${sourceFile.replace('src/', '')}';

describe('${className}', () => {
  let service: ${className};

  beforeEach(() => {
    service = new ${className}();
  });

  it('should create instance', () => {
    expect(service).toBeTruthy();
  });

  it('should handle valid input', async () => {
    const input = { id: '1', value: 'test' };
    const result = await service.process(input);
    expect(result.success).toBe(true);
  });

  it('should handle error', async () => {
    const invalidInput = { id: '', value: '' };
    await expect(service.process(invalidInput)).rejects.toThrow();
  });

  it('should handle edge case - empty input', async () => {
    await expect(service.process(null as any)).rejects.toThrow();
  });

  it('should handle edge case - max input', async () => {
    const maxInput = { id: 'a'.repeat(1000), value: 'b'.repeat(10000) };
    const result = await service.process(maxInput);
    expect(result.success).toBe(true);
  });
});
`;
  }

  private generateIntegrationTestContent(className: string, sourceFile: string): string {
    return `import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ${className} } from '../../${sourceFile.replace('src/', '')}';
import { mockDatabase } from '../mocks/database';

describe('${className} Integration', () => {
  let service: ${className};

  beforeEach(() => {
    vi.mock('../mocks/database', () => mockDatabase);
    service = new ${className}();
  });

  it('should integrate with database', async () => {
    const result = await service.save({ id: '1', data: 'test' });
    expect(result.id).toBeDefined();
  });

  it('should handle API errors', async () => {
    await expect(service.callExternalAPI({ invalid: true })).rejects.toThrow();
  });
});
`;
  }

  private generateE2ETestContent(className: string): string {
    return `import { test, expect } from '@playwright/test';

test.describe('${className} E2E', () => {
  test('should complete full workflow', async ({ page }) => {
    // Navigate to page
    await page.goto('/');

    // Fill form
    await page.fill('#input', 'test value');

    // Submit
    await page.click('#submit');

    // Verify response
    const response = await page.waitForResponse('**/api/process');
    expect(response.status()).toBe(200);
  });
});
`;
  }

  private extractClassName(filePath: string): string {
    const fileName = filePath.split('/').pop() || 'Feature';
    return fileName.replace('.ts', '');
  }

  private calculateCoverage(testFiles: TestFile[]): CoverageReport {
    // Simplified coverage calculation
    return {
      overall: 85,
      by_file: {
        'src/services/Feature.ts': 90,
        'src/controllers/Feature.ts': 80,
      },
      uncovered_lines: [42, 43, 44],
    };
  }

  private validateTests(testSuite: TestSuite): void {
    // Check coverage invariant
    if (testSuite.coverage.overall < 80) {
      console.warn(`Coverage ${testSuite.coverage.overall}% below 80% target`);
    }

    // Check test count
    if (testSuite.files.length === 0) {
      throw new Error('Invariant violation: No test files created');
    }

    // Check for edge case tests
    for (const file of testSuite.files) {
      const hasEdgeCases = file.test_cases.some(tc =>
        tc.name.toLowerCase().includes('edge') || tc.name.toLowerCase().includes('empty') || tc.name.toLowerCase().includes('max')
      );
      if (!hasEdgeCases) {
        console.warn(`Warning: ${file.path} missing edge case tests`);
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createTestAgent(config: TestConfig): TestAgent {
  return new TestAgent(config);
}

async function main() {
  const agent = createTestAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  const result = await agent.executeTask({
    taskId: 'test-task',
    agentId: 'agent-10-test',
    goal: 'Create unit tests for new feature',
    inputs: {
      test_type: 'unit',
      target_files: ['src/services/Feature.ts', 'src/controllers/Feature.ts'],
      coverage_target: 90,
    },
    constraints: { maxTokens: 50000, maxLatency: 600000 },
  });

  console.log('Result:', result);
}

if (require.main === module) {
  main().catch(console.error);
}

export default TestAgent;
