export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-4">Reports Builder</h1>
      <p className="text-text-secondary mb-6">
        Config-driven reports engine. Для работы требуется подключение к Supabase с таблицами
        <code className="mx-1 px-1.5 py-0.5 bg-bg-muted rounded text-xs">report_configs</code> и
        <code className="mx-1 px-1.5 py-0.5 bg-bg-muted rounded text-xs">data_sources</code>.
      </p>

      <div className="card mb-6">
        <h2 className="card-header">Архитектура</h2>
        <pre className="text-xs text-text-secondary bg-bg-muted p-4 rounded overflow-auto">
{`ReportConfig (JSON в БД)
    ↓
buildReportTableProps()
    ├─→ buildColumnsFromConfig() — создание ColumnDef[]
    │   ├─→ Formula Engine — вычисляемые колонки
    │   ├─→ Lock Engine — блокировка ячеек по правилам
    │   ├─→ Action Engine — row/group/table actions
    │   └─→ Plugin Registry — плагины ячеек
    └─→ Grouping/Totals config
         ↓
      <DataTable> (рендеринг)`}
        </pre>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="card-header">Formula Engine</h3>
          <p className="text-sm text-text-secondary mb-2">Вычисляемые колонки через JS-выражения</p>
          <code className="text-xs bg-bg-muted px-2 py-1 rounded block">salary_total - salary_official</code>
        </div>

        <div className="card">
          <h3 className="card-header">Lock Engine</h3>
          <p className="text-sm text-text-secondary mb-2">Блокировка ячеек по роли и статусу</p>
          <code className="text-xs bg-bg-muted px-2 py-1 rounded block">role != cfo → salary_* locked</code>
        </div>

        <div className="card">
          <h3 className="card-header">Action Engine</h3>
          <p className="text-sm text-text-secondary mb-2">Row/group/table операции</p>
          <code className="text-xs bg-bg-muted px-2 py-1 rounded block">approve, confirm, delete, archive</code>
        </div>

        <div className="card">
          <h3 className="card-header">6 Plugins</h3>
          <p className="text-sm text-text-secondary mb-2">Расширяемые типы ячеек</p>
          <code className="text-xs bg-bg-muted px-2 py-1 rounded block">inline-select, inline-date, payment-cell, approval-status, account-details, employee-name</code>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="card-header">Настройка</h3>
        <ol className="text-sm text-text-secondary space-y-2 list-decimal list-inside">
          <li>Скопируйте <code className="px-1 py-0.5 bg-bg-muted rounded text-xs">.env.local.example</code> в <code className="px-1 py-0.5 bg-bg-muted rounded text-xs">.env.local</code></li>
          <li>Укажите Supabase URL и ключи</li>
          <li>Примените миграции 033-040 для создания таблиц report_configs и data_sources</li>
          <li>Создайте отчёт через API или напрямую в БД</li>
        </ol>
      </div>
    </div>
  )
}
