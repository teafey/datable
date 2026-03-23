import { defaultRegistry } from "../plugin-registry"
import { approvalStatusRenderer } from "./approval-status"
import { paymentCellRenderer } from "./payment-cell"
import { accountDetailsRenderer } from "./account-details"
import { inlineSelectRenderer } from "./inline-select"
import { inlineDateRenderer } from "./inline-date"
import { employeeNameRenderer } from "./employee-name"

// Register all built-in plugins in the default registry
defaultRegistry.register("approval-status", approvalStatusRenderer)
defaultRegistry.register("payment-cell", paymentCellRenderer)
defaultRegistry.register("account-details", accountDetailsRenderer)
defaultRegistry.register("inline-select", inlineSelectRenderer)
defaultRegistry.register("inline-date", inlineDateRenderer)
defaultRegistry.register("employee-name", employeeNameRenderer)

// Re-export individual renderers for direct use
export { approvalStatusRenderer } from "./approval-status"
export { paymentCellRenderer } from "./payment-cell"
export { accountDetailsRenderer } from "./account-details"
export { inlineSelectRenderer, createInlineSelectRenderer } from "./inline-select"
export { inlineDateRenderer, createInlineDateRenderer } from "./inline-date"
export { employeeNameRenderer } from "./employee-name"

// Re-export the configured default registry
export { defaultRegistry }
