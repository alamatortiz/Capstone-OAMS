// Generic content shown for a Universal Service Queue *before* the student has
// picked a specific service (the pre-join detail view). Once joined, the
// queue-status screen shows the picked service's real content instead.
export const UNIVERSAL_QUEUE_INFO = {
  description:
    "A single queue that covers every service this office offers. You'll choose the specific service you need when you join, then wait for further notice.",
  requirements: [
    {
      id: 'u-req-1',
      name: "Once you pick a service, review that service's own requirements and steps",
      isMandatory: true,
      description: '',
    },
  ],
  procedureSteps: [
    { id: 'u-step-1', stepNumber: 1, title: 'Join the Universal Service Queue', description: '' },
    { id: 'u-step-2', stepNumber: 2, title: 'Choose the specific service you need from the universal queue options', description: '' },
    { id: 'u-step-3', stepNumber: 3, title: "Review that service's requirements and steps", description: '' },
    { id: 'u-step-4', stepNumber: 4, title: 'Wait for further notice', description: '' },
  ],
};
