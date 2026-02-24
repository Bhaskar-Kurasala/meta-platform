/**
 * Agent 30 - Legal
 *
 * Specialized agent for legal review, compliance, and privacy.
 *
 * @module Agent30Legal
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

export interface ContractReviewRequest {
  request_id: string;
  type: 'contract_review' | 'compliance_check' | 'privacy_review' | 'risk_assessment';
  document_type: string;
  parties?: string[];
  key_terms?: Record<string, string>;
  review_scope?: string[];
}

export interface LegalRisk {
  risk_id: string;
  category: 'liability' | 'compliance' | 'privacy' | 'intellectual_property' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  clause?: string;
  recommendation: string;
  requires_escalation: boolean;
}

export interface ReviewSummary {
  review_id: string;
  document_type: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'needs_revision';
  summary: {
    total_clauses: number;
    standard_clauses: number;
    non_standard_clauses: number;
  };
  risks: LegalRisk[];
  compliance_checks: ComplianceCheck[];
  approval_required_from: string[];
  next_steps: string[];
}

export interface ComplianceCheck {
  area: string;
  status: 'compliant' | 'needs_review' | 'non_compliant';
  notes?: string;
}

export interface ComplianceReport {
  report_id: string;
  framework: string;
  overall_status: 'compliant' | 'partial_compliance' | 'non_compliant';
  findings: {
    requirement: string;
    status: 'compliant' | 'needs_improvement' | 'non_compliant';
    notes?: string;
  }[];
  recommendations: string[];
}

// ============================================================================
// Configuration
// ============================================================================

export interface LegalConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class LegalAgent {
  private config: LegalConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: LegalConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Legal] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'contract_review';

      let result: {
        review?: ReviewSummary;
        compliance?: ComplianceReport;
        risk?: LegalRisk;
      };

      if (taskType === 'contract_review') {
        result = await this.performContractReview(inputs);
      } else if (taskType === 'compliance_check') {
        result = await this.performComplianceCheck(inputs);
      } else if (taskType === 'privacy_review') {
        result = await this.performPrivacyReview(inputs);
      } else if (taskType === 'risk_assessment') {
        result = await this.performRiskAssessment(inputs);
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'legal-output',
          summary: `Legal: ${taskType}`,
          content: JSON.stringify(result, null, 2),
          produced_by: 'agent-30-legal',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'legal_action',
          reason: `Executed ${taskType} task - requires human approval`,
          confidence: 0.85,
          inputs: { task_type: taskType, requires_hitl: true },
        },
      ];

      // Publish relevant events
      if ((result as any).review) {
        await this.config.eventPublisher.publish('agent.30.review-complete', {
          review_id: (result as any).review.review_id,
          status: (result as any).review.status,
          timestamp: new Date().toISOString(),
        });

        // Check for high-risk items
        const risks = (result as any).review.risks || [];
        const highRiskItems = risks.filter((r: LegalRisk) => r.severity === 'high' || r.severity === 'critical');
        if (highRiskItems.length > 0) {
          await this.config.eventPublisher.publish('agent.30.risk-identified', {
            review_id: (result as any).review.review_id,
            risk_count: highRiskItems.length,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Always require approval
      await this.config.eventPublisher.publish('agent.30.approval-required', {
        task_id: taskId,
        type: taskType,
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
          actionsExecuted: 1,
        },
      };
    } catch (error) {
      console.error(`[Legal] Task ${taskId} failed:`, error);

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
          code: 'LEGAL_TASK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async performContractReview(inputs: Record<string, unknown>): Promise<{
    review: ReviewSummary;
  }> {
    const documentType = inputs.document_type as string || 'vendor_agreement';

    // Identify risks based on document type
    const risks: LegalRisk[] = [];

    if (documentType === 'vendor_agreement') {
      risks.push({
        risk_id: this.generateId(),
        category: 'liability',
        severity: 'high',
        description: 'Unlimited liability exposure in standard terms',
        clause: 'Section 5.2',
        recommendation: 'Negotiate liability cap to match contract value',
        requires_escalation: false,
      });
      risks.push({
        risk_id: this.generateId(),
        category: 'privacy',
        severity: 'medium',
        description: 'Data processing terms not fully defined',
        clause: 'Section 8.1',
        recommendation: 'Add data processing exhibit',
        requires_escalation: false,
      });
    }

    const complianceChecks: ComplianceCheck[] = [
      { area: 'GDPR', status: 'needs_review', notes: 'Data processing terms need attention' },
      { area: ' Indemnification', status: 'compliant' },
      { area: 'Termination', status: 'compliant' },
    ];

    const review: ReviewSummary = {
      review_id: this.generateId(),
      document_type: documentType,
      status: 'pending_approval',
      summary: {
        total_clauses: 25,
        standard_clauses: 18,
        non_standard_clauses: risks.length,
      },
      risks,
      compliance_checks: complianceChecks,
      approval_required_from: ['legal-counsel'],
      next_steps: [
        'Review identified risks with attorney',
        'Negotiate liability cap',
        'Add data processing exhibit',
        'Obtain signatures',
      ],
    };

    return { review };
  }

  private async performComplianceCheck(inputs: Record<string, unknown>): Promise<{
    compliance: ComplianceReport;
  }> {
    const framework = inputs.framework as string || 'GDPR';

    const findings = [
      { requirement: 'Data Processing Agreement', status: 'compliant' as const },
      { requirement: 'Privacy Policy', status: 'compliant' as const },
      { requirement: 'Consent Mechanism', status: 'needs_improvement' as const, notes: 'Marketing consent not granular enough' },
      { requirement: 'Data Subject Rights', status: 'compliant' as const },
      { requirement: 'Data Retention', status: 'needs_improvement' as const, notes: 'Retention periods not defined for all data types' },
    ];

    const report: ComplianceReport = {
      report_id: this.generateId(),
      framework,
      overall_status: 'partial_compliance',
      findings,
      recommendations: [
        'Update consent mechanism for marketing emails to be granular',
        'Define data retention periods by data type',
        'Document data retention policy',
        'Conduct annual privacy training',
      ],
    };

    return { compliance: report };
  }

  private async performPrivacyReview(inputs: Record<string, unknown>): Promise<{
    review: ReviewSummary;
  }> {
    const risks: LegalRisk[] = [
      {
        risk_id: this.generateId(),
        category: 'privacy',
        severity: 'medium',
        description: 'Data retention policy not documented',
        recommendation: 'Implement data retention policy',
        requires_escalation: false,
      },
    ];

    const review: ReviewSummary = {
      review_id: this.generateId(),
      document_type: 'privacy_review',
      status: 'pending_approval',
      summary: {
        total_clauses: 15,
        standard_clauses: 12,
        non_standard_clauses: 3,
      },
      risks,
      compliance_checks: [
        { area: 'GDPR Article 13', status: 'compliant' },
        { area: 'GDPR Article 14', status: 'needs_review' },
      ],
      approval_required_from: ['dpo', 'legal-counsel'],
      next_steps: [
        'Review privacy notice completeness',
        'Update data subject rights process',
      ],
    };

    return { review };
  }

  private async performRiskAssessment(inputs: Record<string, unknown>): Promise<{
    risk: LegalRisk;
  }> {
    const category = inputs.category as LegalRisk['category'] || 'liability';
    const description = inputs.description as string || 'Legal risk identified';

    const risk: LegalRisk = {
      risk_id: this.generateId(),
      category,
      severity: inputs.severity as LegalRisk['severity'] || 'medium',
      description,
      recommendation: inputs.recommendation as string || 'Review with legal counsel',
      requires_escalation: (inputs.severity as string) === 'critical',
    };

    return { risk };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createLegalAgent(config: LegalConfig): LegalAgent {
  return new LegalAgent(config);
}

async function main() {
  const agent = createLegalAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  // Test contract review
  const reviewResult = await agent.executeTask({
    taskId: 'test-review',
    agentId: 'agent-30-legal',
    goal: 'Review vendor agreement',
    inputs: {
      type: 'contract_review',
      document_type: 'vendor_agreement',
      parties: ['Company Inc', 'Cloud Services LLC'],
      key_terms: { value: '$100,000', duration: '2 years' },
      review_scope: ['liability', 'compliance', 'data_processing'],
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Contract Review Result:', JSON.stringify(reviewResult, null, 2));

  // Test compliance check
  const complianceResult = await agent.executeTask({
    taskId: 'test-compliance',
    agentId: 'agent-30-legal',
    goal: 'Check GDPR compliance',
    inputs: {
      type: 'compliance_check',
      framework: 'GDPR',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Compliance Check Result:', JSON.stringify(complianceResult, null, 2));
}

if (require.main === module) {
  main().catch(console.error);
}

export default LegalAgent;
