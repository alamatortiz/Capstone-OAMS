// Legal status transitions for appointments.status. pending/approved are the
// only non-terminal states -- completed/rejected/cancelled accept nothing
// further, so a professor can't "un-cancel" or reopen a finished appointment.
const TRANSITIONS = {
  pending: ["approved", "rejected", "cancelled"],
  approved: ["completed", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};

function isValidTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

module.exports = { isValidTransition, TRANSITIONS };
