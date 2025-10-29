import * as Sentry from '@sentry/nextjs';
import { db } from '@/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Monitoring Service
 * Centralized service for tracking metrics, errors, and sending alerts
 */

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 
  | 'job_stuck'
  | 'job_failed'
  | 'high_failure_rate'
  | 'payment_failed'
  | 'webhook_error'
  | 'api_error'
  | 'queue_backlog'
  | 'system_error';

interface AlertData {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details?: Record<string, any>;
  userId?: string;
  jobId?: string;
}

interface MetricData {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
}

class MonitoringService {
  /**
   * Track a metric
   */
  async trackMetric(metric: MetricData): Promise<void> {
    try {
      // Log to console for development
      console.log(`📊 Metric: ${metric.name} = ${metric.value}${metric.unit || ''}`, metric.tags);
      
      // Send to Sentry as a measurement
      Sentry.metrics.gauge(metric.name, metric.value, {
        unit: metric.unit as any
      });
      
      // Store in database for historical tracking
      await addDoc(collection(db, 'metrics'), {
        name: metric.name,
        value: metric.value,
        unit: metric.unit || 'count',
        tags: metric.tags || {},
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to track metric:', error);
    }
  }

  /**
   * Send an alert
   */
  async sendAlert(alert: AlertData): Promise<void> {
    try {
      const alertMessage = `[${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}`;
      
      // Log to console
      const emoji = this.getSeverityEmoji(alert.severity);
      console.log(`${emoji} ALERT: ${alertMessage}`, alert.details);
      
      // Send to Sentry based on severity
      if (alert.severity === 'critical' || alert.severity === 'high') {
        Sentry.captureMessage(alertMessage, {
          level: alert.severity === 'critical' ? 'fatal' : 'error',
          tags: {
            alertType: alert.type,
            userId: alert.userId,
            jobId: alert.jobId
          },
          extra: alert.details
        });
      }
      
      // Store alert in database
      await addDoc(collection(db, 'alerts'), {
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        details: alert.details || {},
        userId: alert.userId,
        jobId: alert.jobId,
        timestamp: serverTimestamp(),
        acknowledged: false
      });
      
      // For critical alerts, you could also:
      // - Send an email via Resend/Postmark
      // - Post to Slack webhook
      // - Send SMS via Twilio
      // - Trigger PagerDuty
      if (alert.severity === 'critical') {
        await this.sendCriticalNotification(alert);
      }
      
    } catch (error) {
      console.error('Failed to send alert:', error);
      // Fallback: at least log to Sentry
      Sentry.captureException(error);
    }
  }

  /**
   * Track an error with context
   */
  trackError(error: Error, context?: Record<string, any>): void {
    console.error('Error tracked:', error.message, context);
    
    Sentry.captureException(error, {
      extra: context,
      tags: context?.tags || {}
    });
  }

  /**
   * Track user action
   */
  async trackUserAction(
    userId: string, 
    action: string, 
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Log to console
      console.log(`👤 User action: ${action}`, { userId, ...metadata });
      
      // Send to Sentry as breadcrumb
      Sentry.addBreadcrumb({
        category: 'user-action',
        message: action,
        level: 'info',
        data: { userId, ...metadata }
      });
      
      // Store in database
      await addDoc(collection(db, 'user_actions'), {
        userId,
        action,
        metadata: metadata || {},
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to track user action:', error);
    }
  }

  /**
   * Check job health and send alerts if needed
   */
  async checkJobHealth(
    jobId: string,
    jobType: 'transcription' | 'content',
    status: string,
    createdAt: Date,
    userId?: string
  ): Promise<void> {
    const now = Date.now();
    const jobAge = now - createdAt.getTime();
    const tenMinutes = 10 * 60 * 1000;
    
    // Check for stuck jobs
    if ((status === 'processing' || status === 'generating') && jobAge > tenMinutes) {
      await this.sendAlert({
        type: 'job_stuck',
        severity: 'high',
        message: `${jobType} job ${jobId} has been ${status} for ${Math.round(jobAge / 60000)} minutes`,
        details: {
          jobId,
          jobType,
          status,
          ageMinutes: Math.round(jobAge / 60000)
        },
        userId,
        jobId
      });
    }
  }

  /**
   * Track Stripe webhook events
   */
  async trackStripeWebhook(
    eventType: string,
    success: boolean,
    error?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const severity: AlertSeverity = success ? 'low' : 'high';
    
    await this.trackMetric({
      name: 'stripe.webhook',
      value: success ? 1 : 0,
      unit: 'event',
      tags: {
        eventType,
        status: success ? 'success' : 'failure'
      }
    });
    
    if (!success && error) {
      await this.sendAlert({
        type: 'webhook_error',
        severity,
        message: `Stripe webhook failed: ${eventType}`,
        details: {
          eventType,
          error,
          ...metadata
        }
      });
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
  }> {
    const checks: Record<string, boolean> = {};
    
    try {
      // Check database
      checks.database = true;
      
      // Check Stripe (simple check if keys are configured)
      checks.stripe = !!process.env.STRIPE_SECRET_KEY;
      
      // Check Firebase
      checks.firebase = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      
      const allHealthy = Object.values(checks).every(v => v);
      
      return {
        status: allHealthy ? 'healthy' : 'degraded',
        checks
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        checks
      };
    }
  }

  /**
   * Helper: Get emoji for severity
   */
  private getSeverityEmoji(severity: AlertSeverity): string {
    const emojis = {
      low: '📘',
      medium: '⚠️',
      high: '🚨',
      critical: '🔥'
    };
    return emojis[severity] || '📢';
  }

  /**
   * Helper: Send critical notification
   * You can implement this to send emails, SMS, Slack messages, etc.
   */
  private async sendCriticalNotification(alert: AlertData): Promise<void> {
    // TODO: Implement email/SMS/Slack notification
    // For now, just log
    console.log('🔥 CRITICAL ALERT - Notification would be sent here:', alert);
    
    // Example implementations:
    // 
    // // Email via Resend
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     from: 'alerts@yourdomain.com',
    //     to: 'admin@yourdomain.com',
    //     subject: `CRITICAL: ${alert.message}`,
    //     text: JSON.stringify(alert, null, 2)
    //   })
    // });
    //
    // // Slack webhook
    // await fetch(process.env.SLACK_WEBHOOK_URL!, {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     text: `🔥 CRITICAL ALERT: ${alert.message}`,
    //     blocks: [...]
    //   })
    // });
  }
}

export const monitoringService = new MonitoringService();

