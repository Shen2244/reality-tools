import { DecisionSituationInput, MeetingInput, ScamInput } from '../types';

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export const decisionExamples: Array<{ name: string; input: DecisionSituationInput }> = [
  {
    name: 'Used car pressure',
    input: {
      situation: 'Should I buy this used car tonight? The seller says other buyers are waiting and wants Zelle.',
      additionalContext: '',
      optionA: '',
      optionB: '',
      deadline: '',
      riskTolerance: 'low',
      importance: 'high',
    },
  },
  {
    name: 'Job offer',
    input: {
      situation: 'Should I accept this job offer or wait for another company?',
      additionalContext: '',
      optionA: '',
      optionB: '',
      deadline: '',
      riskTolerance: 'medium',
      importance: 'high',
    },
  },
  {
    name: 'Drop class',
    input: {
      situation: 'Should I drop this class?',
      additionalContext: '',
      optionA: '',
      optionB: '',
      deadline: '',
      riskTolerance: 'low',
      importance: 'medium',
    },
  },
  {
    name: 'Launch pressure',
    input: {
      situation: 'Should we launch the paid beta next week or delay for onboarding fixes?',
      additionalContext: 'The product is stable for power users, but new customers still need manual setup. Sales has three prospects waiting. Support capacity is limited for the next two weeks, and legal has not reviewed the enterprise terms.',
      optionA: 'Launch paid beta next week with manual onboarding',
      optionB: 'Delay two weeks and fix onboarding first',
      deadline: inDays(14),
      riskTolerance: 'medium',
      importance: 'high',
    },
  },
];

export const scamExamples: Array<{ name: string; input: ScamInput }> = [
  {
    name: 'School portal email',
    input: {
      channel: 'email',
      sender: 'finaid@vt.edu',
      visibleDomain: 'vt.edu',
      claimedOrganization: 'Virginia Tech',
      message: 'Virginia Tech Financial Aid: Please log in to your student portal by July 5 to review your aid package.',
    },
  },
  {
    name: 'Bank code theft',
    input: {
      channel: 'SMS',
      sender: 'unknown',
      visibleDomain: 'unknown',
      claimedOrganization: 'bank',
      message: 'Your bank account will be locked today. Click this link to verify your password and send us the 6-digit code to avoid suspension.',
    },
  },
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
      sender: 'unknown',
      visibleDomain: 'none',
      claimedOrganization: 'none',
      message: 'I can pay you extra if we move off Facebook Marketplace. Text me on WhatsApp and I will send Zelle now.',
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
    name: 'Regression paragraph',
    input: {
      goal: 'Launch readiness',
      attendees: 'Maya, Jordan, Alex',
      notes: 'We agreed to launch the landing page next Friday. Maya will finish the copy by Tuesday. Need to confirm ad budget. We should circle back on influencer strategy soon.',
    },
  },
  {
    name: 'Short messy note',
    input: {
      goal: '',
      attendees: '',
      notes: 'Need to fix pricing page. Alex maybe by Friday. Budget unclear.',
    },
  },
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
