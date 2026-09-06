export function paidBookingLegalDetails(content: Record<string, unknown>) {
  const businessAddress = text(content.businessAddress);
  const refundPolicyText = text(content.refundText) || text(content.refundPolicySummary);
  const ready = Boolean(
    businessAddress && refundPolicyText &&
    !/add your|not configured|placeholder/i.test(`${businessAddress} ${refundPolicyText}`)
  );
  return { businessAddress, refundPolicyText, ready };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
