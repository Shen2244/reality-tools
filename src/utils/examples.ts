import { DecisionInput, MeetingInput, ScamInput } from '../types';

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export const decisionExamples: Array<{ name: string; input: DecisionInput }> = [
  {
    name: 'Launch pressure',
    input: {
      question: 'Should we launch the paid beta next week or delay for onboarding fixes?',
      context: 'The product is stable for power users, but new customers still need manual setup. Sales has three prospects waiting. Support capacity is limited for the next two weeks, and legal has not reviewed the enterprise terms.',
      optionA: 'Launch paid beta next week with manual onboarding',
      optionB: 'Delay two weeks and fix onboarding first',
      deadline: inDays(5),
      riskTolerance: 'medium',
      importance: 'high',
    },
  },
  {
    name: 'Hiring tradeoff',
    input: {
      question: 'Should we hire a senior operator now or wait until revenue is less volatile?',
      context: 'The founder is spending twenty hours per week on operations. Revenue is growing but still uneven. The candidate is strong, expensive, and available for only one more week. Cash runway is nine months.',
      optionA: 'Hire the senior operator this month',
      optionB: 'Wait one quarter and use contractors',
      deadline: inDays(8),
      riskTolerance: 'low',
      importance: 'high',
    },
  },
  {
    name: 'Vendor switch',
    input: {
      question: 'Should we move analytics vendors before the board review?',
      context: 'The current vendor is slow and misses cohort reports. The new vendor has better dashboards but requires a migration and security approval. The board review is close, and the data team is already overloaded.',
      optionA: 'Migrate to the new analytics vendor now',
      optionB: 'Stay on the current vendor through the board review',
      deadline: inDays(14),
      riskTolerance: 'medium',
      importance: 'medium',
    },
  },
];

export const scamExamples: Array<{ name: string; input: ScamInput }> = [
  {
    name: 'Package fee SMS',
    input: {
      channel: 'SMS',
      message: 'URGENT: Your package is held due to unpaid customs fee. Pay now at https://bit.ly/verify-delivery or your account will be suspended. Do not share this with anyone.',
    },
  },
  {
    name: 'Marketplace off-platform',
    input: {
      channel: 'marketplace',
      message: 'I can pay full price today but I only use WhatsApp. Text me directly and I will send a courier. Kindly refund the extra shipping after I overpay through Zelle.',
    },
  },
  {
    name: 'Job offer crypto',
    input: {
      channel: 'job offer',
      message: 'Congratulations, you are selected for a remote assistant role with no interview. Buy a crypto wallet starter kit today and send your driver license plus bank account for payroll verification.',
    },
  },
];

export const meetingExamples: Array<{ name: string; input: MeetingInput }> = [
  {
    name: 'Launch readiness',
    input: {
      goal: 'Finalize launch readiness plan',
      attendees: 'Maya, Jordan, Alex, Priya',
      notes: `We agreed to keep the launch date for July 15.
Maya will draft the customer email by Friday.
Jordan needs to confirm support coverage.
Do we have final pricing approval?
Alex should look into analytics later.
TBD: legal review for the enterprise terms.
Priya approved the beta invite list.
We should circle back on partner messaging soon.`,
    },
  },
  {
    name: 'Sales pipeline',
    input: {
      goal: 'Unblock enterprise sales pipeline',
      attendees: 'Nina, Omar, Theo, Grace',
      notes: `We decided to prioritize the finance buyer segment for Q3.
Nina will send the revised security packet by 2026-07-02.
Omar needs to schedule legal review with Acme.
Is procurement still waiting on SOC2 evidence?
Theo owns the pricing exception and should confirm by Friday.
Grace said we should align on partner strategy soon.
TBD: final discount approval.`,
    },
  },
  {
    name: 'Product triage',
    input: {
      goal: 'Choose next sprint scope',
      attendees: 'Sam, Lee, Tasha, Morgan',
      notes: `Approved: fix onboarding drop-off before adding team analytics.
Sam will publish the funnel report by tomorrow.
Lee should prepare the migration plan.
Morgan will review customer quotes before next week.
Which enterprise requests are actually blocking renewals?
We may explore dashboard polish later.
Need to confirm design capacity.
Tasha finalized the support macro changes.`,
    },
  },
];
