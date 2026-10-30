/**
 * Payment Calculation Utilities for Vincent Venue Booking
 */

/**
 * Calculates the advance amount required for a venue booking based on the total amount.
 * 
 * Logic:
 * - If total booking amount <= ₹2,50,000 -> advance should be 40% of total.
 * - If total booking amount > ₹2,50,000 -> advance should be capped at ₹99,000 (for UPI ease).
 * 
 * @param {number} totalAmount - The total grand total of the booking including GST and services.
 * @returns {Object} - An object containing advanceAmount, balanceAmount, and advancePercent.
 */
export const calculateAdvanceAmount = (totalAmount) => {
    const UPI_LIMIT_SAFETY_CAP = 99000;
    const TOTAL_THRESHOLD = 250000;
    const DEFAULT_ADVANCE_PERCENT = 40;

    let advanceAmount = 0;
    let advancePercent = DEFAULT_ADVANCE_PERCENT;

    if (totalAmount <= TOTAL_THRESHOLD) {
        advanceAmount = (totalAmount * DEFAULT_ADVANCE_PERCENT) / 100;
    } else {
        advanceAmount = UPI_LIMIT_SAFETY_CAP;
    }

    // Round to nearest Rupee
    advanceAmount = Math.round(advanceAmount);
    const balanceAmount = Math.round(totalAmount - advanceAmount);

    // Calculate actual percentage for records
    if (totalAmount > 0) {
        advancePercent = Number(((advanceAmount / totalAmount) * 100).toFixed(2));
    }

    return {
        advanceAmount,
        balanceAmount,
        advancePercent
    };
};
