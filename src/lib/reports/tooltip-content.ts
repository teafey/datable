export const TOOLTIP_CONTENT = {
  sql: {
    parameterSyntax: 'Параметры задаются через :paramName в SQL запросе',
    testButton: 'Выполняет запрос для проверки синтаксиса и структуры результата',
    parameters: 'Параметры автоматически определяются из SQL запроса',
  },

  writeMapping: {
    enable: 'Включает возможность сохранения изменений из отчёта в БД',
    table: 'Таблица в БД, куда будут записаны изменения',
    pkColumn: 'Колонка первичного ключа в таблице БД',
    pkField: 'Поле в результате запроса, содержащее значение PK',
  },

  actions: {
    scope: {
      row: 'Действие применяется к одной выбранной строке',
      group: 'Действие применяется ко всем строкам текущей группы',
      table: 'Действие применяется ко всем строкам таблицы',
    },
    targetField: 'Поле, которое будет обновлено при выполнении действия',
    targetValue: 'Значение, которое будет установлено в целевое поле',
    visibleWhen: 'Условия, при которых кнопка действия видна пользователю',
    disabledWhen: 'Условия, при которых кнопка действия неактивна',
    rowFilter: 'Фильтр строк для действий с областью группа/таблица',
    allowedRoles: 'Роли, которым доступно выполнение этого действия',
    confirmMessage: 'Сообщение подтверждения перед выполнением действия',
    defaultActions: 'Предустановленные действия: утвердить, подтвердить, удалить, архивировать',
  },

  lockRules: {
    concept: 'Правила блокируют редактирование полей при выполнении условий',
    affectedFields: 'Список полей для блокировки. Пусто = все поля',
  },

  computed: {
    formula: 'JavaScript выражение для вычисления значения поля',
    resultType: 'Тип данных результата вычисления',
    format: {
      money: 'Форматирование как денежная сумма с разделителями',
      percent: 'Отображение как процент',
      number: 'Формат отображения для числовых значений',
    },
  },

  fields: {
    cellType: 'Тип отображения ячейки в таблице отчёта',
    canGroupBy: 'Поле может использоваться для группировки строк',
    canEdit: 'Поле доступно для редактирования в отчёте',
    status: 'Ручной — настроено вручную, Авто — определено автоматически',
    sourceColumn: 'Исходная колонка в таблице БД (определяется автоматически из SQL)',
    visible: 'Показывать ли колонку в таблице отчёта',
  },

  parameters: {
    required: 'Параметр обязателен для выполнения отчёта',
    autoCurrentPeriod: 'Автоматически устанавливать текущий период (только для дат)',
    type: 'Тип данных параметра определяет формат ввода',
    selectOptions: 'Формат: value|label на каждой строке',
  },

  permissions: {
    enable: 'Включает контроль прав редактирования по ролям',
    matrix: 'Строка = поле, столбец = роль, ячейка = может редактировать',
  },

  grouping: {
    enable: 'Группирует строки по выбранному полю',
    defaultCollapsed: 'Группы отображаются свёрнутыми при загрузке отчёта',
  },

  totals: {
    groupTotals: 'Показывать итоговые суммы для каждой группы',
    tableTotals: 'Показывать итоговые суммы для всей таблицы',
  },

  basic: {
    dataSourceType: 'TypeScript — код в Next.js, SQL — прямой запрос к БД',
  },

  columns: {
    cellTypeSelector: 'Тип ячейки определяет способ отображения данных',
  },
} as const

// Type-safe ключи
export type TooltipKey =
  | 'sql.parameterSyntax'
  | 'sql.testButton'
  | 'sql.parameters'
  | 'writeMapping.enable'
  | 'writeMapping.table'
  | 'writeMapping.pkColumn'
  | 'writeMapping.pkField'
  | 'actions.scope.row'
  | 'actions.scope.group'
  | 'actions.scope.table'
  | 'actions.targetField'
  | 'actions.targetValue'
  | 'actions.visibleWhen'
  | 'actions.disabledWhen'
  | 'actions.rowFilter'
  | 'actions.allowedRoles'
  | 'actions.confirmMessage'
  | 'actions.defaultActions'
  | 'lockRules.concept'
  | 'lockRules.affectedFields'
  | 'computed.formula'
  | 'computed.resultType'
  | 'computed.format.money'
  | 'computed.format.percent'
  | 'computed.format.number'
  | 'fields.cellType'
  | 'fields.canGroupBy'
  | 'fields.canEdit'
  | 'fields.status'
  | 'fields.sourceColumn'
  | 'fields.visible'
  | 'parameters.required'
  | 'parameters.autoCurrentPeriod'
  | 'parameters.type'
  | 'parameters.selectOptions'
  | 'permissions.enable'
  | 'permissions.matrix'
  | 'grouping.enable'
  | 'grouping.defaultCollapsed'
  | 'totals.groupTotals'
  | 'totals.tableTotals'
  | 'basic.dataSourceType'
  | 'columns.cellTypeSelector'
