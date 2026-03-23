export default function HomePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-4">DataTable v2</h1>
      <p className="text-text-secondary mb-6">
        Standalone application for DataTable v2 component with Reports Builder engine.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <a href="/basic" className="card hover:border-accent transition-colors">
          <h2 className="card-header">Basic Table</h2>
          <p className="text-sm text-text-secondary">Text, money, status, percent cells</p>
        </a>

        <a href="/editable" className="card hover:border-accent transition-colors">
          <h2 className="card-header">Editable</h2>
          <p className="text-sm text-text-secondary">Inline editing with computed fields</p>
        </a>

        <a href="/grouping" className="card hover:border-accent transition-colors">
          <h2 className="card-header">Grouping</h2>
          <p className="text-sm text-text-secondary">Hierarchy, flat, and multi-field grouping</p>
        </a>

        <a href="/totals" className="card hover:border-accent transition-colors">
          <h2 className="card-header">Totals</h2>
          <p className="text-sm text-text-secondary">Group and grand totals with aggregation</p>
        </a>

        <a href="/settings" className="card hover:border-accent transition-colors">
          <h2 className="card-header">Settings</h2>
          <p className="text-sm text-text-secondary">Column visibility, ordering, persistence</p>
        </a>

        <a href="/reports" className="card hover:border-accent transition-colors">
          <h2 className="card-header">Reports Builder</h2>
          <p className="text-sm text-text-secondary">Config-driven reports with formula engine</p>
        </a>
      </div>
    </div>
  )
}
