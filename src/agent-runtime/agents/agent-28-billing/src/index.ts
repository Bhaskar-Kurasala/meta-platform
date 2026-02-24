/**
 * Agent 28 - Billing
 *
 * Specialized agent for billing, subscriptions, and revenue management.
 *
 * @module Agent28Billing
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

export interface Subscription {
  subscription_id: string;
  customer_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
  current_period_start: string;
  current_period_end: string;
  next_billing_date: string;
  amount: number;
  payment_method: string;
}

export interface Invoice {
  invoice_id: string;
  subscription_id: string;
  customer_id: string;
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  due_date: string;
  items: InvoiceItem[];
  created_at: string;
}

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface Payment {
  payment_id: string;
  subscription_id: string;
  customer_id: string;
  amount: number;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  transaction_id?: string;
  timestamp: string;
}

export interface DunningAction {
  dunning_id: string;
  subscription_id: string;
  customer_id: string;
  attempt: number;
  max_attempts: number;
  action: 'retry_payment' | 'send_notification' | 'suspend_account' | 'cancel';
  scheduled_date: string;
  customer_notified: boolean;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churn_mrr: number;
  net_new_mrr: number;
  active_subscriptions: number;
  arpu: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface BillingConfig {
  eventPublisher: EventPublisher;
  projectRoot?: string;
}

// ============================================================================
// Main Agent Class
// ============================================================================

export class BillingAgent {
  private config: BillingConfig;
  private manifest: AgentManifest | null = null;

  constructor(config: BillingConfig) {
    this.config = config;
  }

  async initialize(manifestPath: string): Promise<void> {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    this.manifest = yaml.parse(manifestContent) as AgentManifest;
    console.log(`[Billing] Initialized with manifest: ${this.manifest?.id}`);
  }

  async executeTask(envelope: TaskEnvelope): Promise<AgentResult> {
    const startTime = Date.now();
    const taskId = envelope.taskId || this.generateId();

    try {
      const inputs = envelope.inputs || {};
      const taskType = inputs.type as string || 'manage';

      let result: {
        subscription?: Subscription;
        invoice?: Invoice;
        payment?: Payment;
        dunning?: DunningAction;
        revenue?: RevenueMetrics;
      };

      if (taskType === 'create-subscription') {
        result = await this.createSubscription(inputs);
      } else if (taskType === 'update-subscription') {
        result = await this.updateSubscription(inputs);
      } else if (taskType === 'create-invoice') {
        result = await this.createInvoice(inputs);
      } else if (taskType === 'process-payment') {
        result = await this.processPayment(inputs);
      } else if (taskType === 'handle-dunning') {
        result = await this.handleDunning(inputs);
      } else if (taskType === 'revenue-report') {
        result = await this.generateRevenueReport(inputs);
      } else {
        throw new Error(`Unknown task type: ${taskType}`);
      }

      const artifacts: Artifact[] = [
        {
          id: this.generateId(),
          type: 'billing-output',
          summary: `Billing: ${taskType}`,
          content: JSON.stringify(result, null, 2),
          produced_by: 'agent-28-billing',
          created_at: new Date().toISOString(),
        },
      ];

      const decisions: Decision[] = [
        {
          type: 'billing_action',
          reason: `Executed ${taskType} task`,
          confidence: 0.95,
          inputs: { task_type: taskType },
        },
      ];

      // Publish relevant events
      if ((result as any).subscription) {
        await this.config.eventPublisher.publish('agent.28.subscription-changed', {
          subscription_id: (result as any).subscription.subscription_id,
          status: (result as any).subscription.status,
          timestamp: new Date().toISOString(),
        });
      }

      if ((result as any).payment) {
        await this.config.eventPublisher.publish('agent.28.payment-processed', {
          payment_id: (result as any).payment.payment_id,
          status: (result as any).payment.status,
          timestamp: new Date().toISOString(),
        });
      }

      if ((result as any).invoice) {
        await this.config.eventPublisher.publish('agent.28.invoice-sent', {
          invoice_id: (result as any).invoice.invoice_id,
          customer_id: (result as any).invoice.customer_id,
          timestamp: new Date().toISOString(),
        });
      }

      if ((result as any).dunning) {
        await this.config.eventPublisher.publish('agent.28.dunning-started', {
          subscription_id: (result as any).dunning.subscription_id,
          attempt: (result as any).dunning.attempt,
          timestamp: new Date().toISOString(),
        });
      }

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
      console.error(`[Billing] Task ${taskId} failed:`, error);

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
          code: 'BILLING_TASK_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true,
        },
      };
    }
  }

  private async createSubscription(inputs: Record<string, unknown>): Promise<{
    subscription: Subscription;
    invoice: Invoice;
  }> {
    const customerId = inputs.customer_id as string || this.generateId();
    const planId = inputs.plan_id as string || 'starter-monthly';
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const planPrices: Record<string, number> = {
      'starter-monthly': 29,
      'pro-monthly': 99,
      'enterprise-monthly': 299,
    };

    const subscription: Subscription = {
      subscription_id: `sub-${this.generateId()}`,
      customer_id: customerId,
      plan_id: planId,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      next_billing_date: periodEnd.toISOString(),
      amount: planPrices[planId] || 29,
      payment_method: inputs.payment_method as string || 'card_****4242',
    };

    // Create initial invoice
    const invoice = this.createInvoiceForSubscription(subscription);

    return { subscription, invoice };
  }

  private createInvoiceForSubscription(subscription: Subscription): Invoice {
    const taxRate = 0.08; // 8% tax
    const tax = Math.round(subscription.amount * taxRate * 100) / 100;

    return {
      invoice_id: `inv-${this.generateId()}`,
      subscription_id: subscription.subscription_id,
      customer_id: subscription.customer_id,
      amount: subscription.amount,
      tax,
      total: subscription.amount + tax,
      status: 'open',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        { description: `${subscription.plan_id} subscription`, amount: subscription.amount },
      ],
      created_at: new Date().toISOString(),
    };
  }

  private async updateSubscription(inputs: Record<string, unknown>): Promise<{
    subscription: Subscription;
  }> {
    const subscriptionId = inputs.subscription_id as string || `sub-${this.generateId()}`;
    const newPlanId = inputs.new_plan_id as string || 'pro-monthly';

    const planPrices: Record<string, number> = {
      'starter-monthly': 29,
      'pro-monthly': 99,
      'enterprise-monthly': 299,
    };

    const subscription: Subscription = {
      subscription_id: subscriptionId,
      customer_id: inputs.customer_id as string || this.generateId(),
      plan_id: newPlanId,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      amount: planPrices[newPlanId] || 99,
      payment_method: inputs.payment_method as string || 'card_****4242',
    };

    return { subscription };
  }

  private async createInvoice(inputs: Record<string, unknown>): Promise<{
    invoice: Invoice;
  }> {
    const subscriptionId = inputs.subscription_id as string || `sub-${this.generateId()}`;
    const customerId = inputs.customer_id as string || this.generateId();
    const amount = inputs.amount as number || 99;

    const taxRate = 0.08;
    const tax = Math.round(amount * taxRate * 100) / 100;

    const invoice: Invoice = {
      invoice_id: `inv-${this.generateId()}`,
      subscription_id: subscriptionId,
      customer_id: customerId,
      amount,
      tax,
      total: amount + tax,
      status: 'open',
      due_date: inputs.due_date as string || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items: (inputs.items as InvoiceItem[]) || [
        { description: 'Subscription charge', amount },
      ],
      created_at: new Date().toISOString(),
    };

    return { invoice };
  }

  private async processPayment(inputs: Record<string, unknown>): Promise<{
    payment: Payment;
  }> {
    const subscriptionId = inputs.subscription_id as string || `sub-${this.generateId()}`;
    const customerId = inputs.customer_id as string || this.generateId();
    const amount = inputs.amount as number || 99;

    // Simulate payment processing
    const success = Math.random() > 0.1; // 90% success rate

    const payment: Payment = {
      payment_id: `pay-${this.generateId()}`,
      subscription_id: subscriptionId,
      customer_id: customerId,
      amount,
      status: success ? 'succeeded' : 'failed',
      transaction_id: success ? `txn_${this.generateId()}` : undefined,
      timestamp: new Date().toISOString(),
    };

    return { payment };
  }

  private async handleDunning(inputs: Record<string, unknown>): Promise<{
    dunning: DunningAction;
  }> {
    const subscriptionId = inputs.subscription_id as string || `sub-${this.generateId()}`;
    const customerId = inputs.customer_id as string || this.generateId();
    const attempt = inputs.attempt as number || 1;
    const maxAttempts = inputs.max_attempts as number || 3;

    let action: DunningAction['action'];
    if (attempt < maxAttempts) {
      action = 'retry_payment';
    } else if (attempt === maxAttempts) {
      action = 'suspend_account';
    } else {
      action = 'cancel';
    }

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + Math.pow(2, attempt - 1)); // Exponential backoff

    const dunning: DunningAction = {
      dunning_id: `dun-${this.generateId()}`,
      subscription_id: subscriptionId,
      customer_id: customerId,
      attempt,
      max_attempts: maxAttempts,
      action,
      scheduled_date: scheduledDate.toISOString(),
      customer_notified: true,
    };

    return { dunning };
  }

  private async generateRevenueReport(inputs: Record<string, unknown>): Promise<{
    revenue: RevenueMetrics;
  }> {
    // Sample revenue data
    const activeSubscriptions = inputs.active_subscriptions as number || 1250;
    const arpu = inputs.arpu as number || 89;

    const mrr = activeSubscriptions * arpu;
    const arr = mrr * 12;

    const revenue: RevenueMetrics = {
      mrr,
      arr,
      new_mrr: mrr * 0.08, // 8% new MRR
      expansion_mrr: mrr * 0.05, // 5% expansion
      contraction_mrr: mrr * 0.02, // 2% contraction
      churn_mrr: mrr * 0.03, // 3% churn
      net_new_mrr: mrr * 0.08, // Net new
      active_subscriptions: activeSubscriptions,
      arpu,
    };

    return { revenue };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export function createBillingAgent(config: BillingConfig): BillingAgent {
  return new BillingAgent(config);
}

async function main() {
  const agent = createBillingAgent({
    eventPublisher: {
      publish: async () => {},
      subscribe: async () => {},
    },
  });

  await agent.initialize('./manifest.yaml');

  // Test subscription creation
  const subResult = await agent.executeTask({
    taskId: 'test-subscription',
    agentId: 'agent-28-billing',
    goal: 'Create new subscription',
    inputs: {
      type: 'create-subscription',
      customer_id: 'cust-123',
      plan_id: 'pro-monthly',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Subscription Result:', JSON.stringify(subResult, null, 2));

  // Test payment processing
  const paymentResult = await agent.executeTask({
    taskId: 'test-payment',
    agentId: 'agent-28-billing',
    goal: 'Process payment',
    inputs: {
      type: 'process-payment',
      subscription_id: 'sub-123',
      customer_id: 'cust-123',
      amount: 107.00,
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Payment Result:', JSON.stringify(paymentResult, null, 2));

  // Test revenue report
  const revenueResult = await agent.executeTask({
    taskId: 'test-revenue',
    agentId: 'agent-28-billing',
    goal: 'Generate revenue report',
    inputs: {
      type: 'revenue-report',
      period: '2026-02',
    },
    constraints: { maxTokens: 50000, maxLatency: 180000 },
  });

  console.log('Revenue Result:', JSON.stringify(revenueResult, null, 2));
}

if (require.main === module) {
  main().catch(console.error);
}

export default BillingAgent;
