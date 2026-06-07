export type Locale = 'pt-BR' | 'en-US' | 'es'

export interface T {
  locale: { 'pt-BR': string; 'en-US': string; es: string }
  nav: { transactions: string; budgets: string; dashboard: string; config: string; logout: string; syncing: string }
  months: [string,string,string,string,string,string,string,string,string,string,string,string]
  filter: { all: string; income: string; expense: string }
  table: { day: string; total: string }
  kind: Record<'INCOME'|'EXPENSE'|'SAVING'|'CREDIT'|'BUDGET', { label: string; letter: string }>
  status: { pending: string }
  search: { placeholder: string }
  modal: {
    title: string
    editTitle: string
    descPlaceholder: string
    categoryLabel: string
    cancel: string
    save: string
    saveEdit: string
    recurring: string
    recurringFreq: string
    recurringEndLabel: string
    freqDaily: string
    freqWeekly: string
    freqMonthly: string
    freqYearly: string
  }
  dayGroup: { addInline: string; confirmDelete: string; balance: string }
  login: {
    subtitle: string
    emailPlaceholder: string
    passwordPlaceholder: string
    submit: string
    submitting: string
    genericError: string
    registerLink: string
  }
  register: {
    subtitle: string
    namePlaceholder: string
    emailPlaceholder: string
    passwordPlaceholder: string
    confirmPlaceholder: string
    submit: string
    submitting: string
    passwordMismatch: string
    passwordTooShort: string
    emailConflict: string
    genericError: string
    loginLink: string
  }
  budgets: {
    title: string
    empty: string
    summary: string
    newBudget: string
    editBudget: string
    namePlaceholder: string
    notesPlaceholder: string
    remaining: string
    noTransactions: string
    confirmDelete: string
  }
  config: {
    title: string
    sections: { account: string; appearance: string; language: string; data: string; about: string; security: string; danger: string }
    email: string
    name: string
    namePlaceholder: string
    nameEdit: string
    nameSave: string
    theme: string; themeAuto: string; themeLight: string; themeDark: string
    languageLabel: string
    cacheLabel: string; cacheHint: string; cacheClear: string; cacheDone: string
    appLabel: string; webVersionLabel: string
    initialBalance: string
    initialBalancePlaceholder: string
    initialBalanceSave: string
    initialBalanceHint: string
    importLabel: string
    importButton: string
    changePwd: {
      label: string
      hint: string
      current: string
      next: string
      save: string
      saving: string
      success: string
      errorWrong: string
      errorShort: string
    }
    deleteAccount: {
      label: string
      hint: string
      button: string
      confirmTitle: string
      confirmHint: string
      passwordPlaceholder: string
      confirm: string
      cancel: string
      errorWrong: string
    }
  }
  dashboard: {
    title: string
    balance: string
    monthlyIncome: string
    monthlyExpenses: string
    safe: string
    evolution: string
    breakdown: string
    breakdownExpenses: string
    breakdownIncome: string
    noData: string
    uncategorized: string
    income: string
    expenses: string
    net: string
  }
  import: {
    title: string
    hint: string
    chooseFile: string
    parsing: string
    colDate: string
    colDesc: string
    colAmount: string
    colType: string
    selected: string
    confirm: string
    importing: string
    success: string
    importMore: string
    goToTx: string
  }
}

export const translations: Record<Locale, T> = {
  'pt-BR': {
    locale: { 'pt-BR': 'Português', 'en-US': 'English', es: 'Español' },
    nav: { transactions: 'Transações', budgets: 'Orçamentos', dashboard: 'Visão geral', config: 'Config', logout: 'Sair', syncing: 'Sincronizando...' },
    months: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    filter: { all: '⊙ Todas', income: 'Renda', expense: 'Despesa' },
    table: { day: 'Dia', total: 'Total' },
    kind: {
      INCOME:  { label: 'Renda',      letter: 'R' },
      EXPENSE: { label: 'Despesa',    letter: 'D' },
      CREDIT:  { label: 'Crédito',    letter: 'C' },
      SAVING:  { label: 'Economia',   letter: 'E' },
      BUDGET:  { label: 'Orçamento',  letter: 'O' },
    },
    status: { pending: 'Pend.' },
    search: { placeholder: 'Buscar lançamento...' },
    modal: {
      title: 'Novo lançamento',
      editTitle: 'Editar lançamento',
      descPlaceholder: 'Descrição (opcional)',
      categoryLabel: 'Categoria',
      cancel: 'Cancelar',
      save: 'Salvar',
      saveEdit: 'Atualizar',
      recurring: 'Recorrente',
      recurringFreq: 'Frequência',
      recurringEndLabel: 'Encerrar em (opcional)',
      freqDaily: 'Diário',
      freqWeekly: 'Semanal',
      freqMonthly: 'Mensal',
      freqYearly: 'Anual',
    },
    dayGroup: { addInline: '+ adicionar', confirmDelete: 'Remover?', balance: 'Saldo' },
    login: {
      subtitle: 'Acompanhe transações, crédito, economia e orçamentos.',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Senha',
      submit: 'Entrar',
      submitting: 'Entrando...',
      genericError: 'Erro ao entrar',
      registerLink: 'Criar conta',
    },
    register: {
      subtitle: 'Crie sua conta para começar.',
      namePlaceholder: 'Nome',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Senha (mín. 12 caracteres)',
      confirmPlaceholder: 'Confirmar senha',
      submit: 'Criar conta',
      submitting: 'Criando...',
      passwordMismatch: 'As senhas não coincidem',
      passwordTooShort: 'Senha deve ter no mínimo 12 caracteres',
      emailConflict: 'Email já cadastrado',
      genericError: 'Erro ao criar conta',
      loginLink: 'Já tenho conta',
    },
    budgets: {
      title: 'Orçamentos',
      empty: 'Nenhum orçamento criado ainda.',
      summary: '{count} orçamentos · {overBudgetCount} acima do limite',
      newBudget: 'Novo orçamento',
      editBudget: 'Editar orçamento',
      namePlaceholder: 'Nome (ex: Viagem Europa)',
      notesPlaceholder: 'Observações (opcional)',
      remaining: 'restante',
      noTransactions: 'Nenhuma transação associada.',
      confirmDelete: 'Remover orçamento?',
    },
    config: {
      title: 'Configurações',
      sections: { account: 'Conta', appearance: 'Aparência', language: 'Idioma', data: 'Dados', about: 'Sobre', security: 'Segurança', danger: 'Zona de perigo' },
      email: 'Email',
      name: 'Nome',
      namePlaceholder: 'Seu nome',
      nameEdit: 'Editar',
      nameSave: 'Salvar',
      theme: 'Tema', themeAuto: 'Auto', themeLight: 'Claro', themeDark: 'Escuro',
      languageLabel: 'Idioma',
      cacheLabel: 'Cache local',
      cacheHint: 'Limpa os dados em cache e recarrega do servidor.',
      cacheClear: 'Limpar cache',
      cacheDone: 'Limpo ✓',
      appLabel: 'Aplicativo',
      webVersionLabel: 'Versão web',
      initialBalance: 'Saldo inicial',
      initialBalancePlaceholder: '0,00',
      initialBalanceSave: 'Salvar',
      initialBalanceHint: 'Saldo de abertura da sua conta antes do uso do tallyoh.',
      importLabel: 'Importar CSV',
      importButton: 'Importar lançamentos',
      changePwd: {
        label: 'Alterar senha',
        hint: 'Mínimo de 12 caracteres.',
        current: 'Senha atual',
        next: 'Nova senha',
        save: 'Alterar',
        saving: 'Salvando...',
        success: 'Senha alterada ✓',
        errorWrong: 'Senha atual incorreta',
        errorShort: 'Nova senha deve ter no mínimo 12 caracteres',
      },
      deleteAccount: {
        label: 'Excluir conta',
        hint: 'Esta ação é irreversível. Todos os seus dados serão removidos permanentemente.',
        button: 'Excluir minha conta',
        confirmTitle: 'Confirmar exclusão',
        confirmHint: 'Digite sua senha para confirmar:',
        passwordPlaceholder: 'Sua senha',
        confirm: 'Excluir permanentemente',
        cancel: 'Cancelar',
        errorWrong: 'Senha incorreta',
      },
    },
    dashboard: {
      title: 'Visão geral',
      balance: 'Saldo total',
      monthlyIncome: 'Receitas do mês',
      monthlyExpenses: 'Despesas do mês',
      safe: 'Disponível',
      evolution: 'Evolução (6 meses)',
      breakdown: 'Por categoria',
      breakdownExpenses: 'Despesas',
      breakdownIncome: 'Receitas',
      noData: 'Nenhum dado disponível.',
      uncategorized: 'Sem categoria',
      income: 'Receita',
      expenses: 'Despesa',
      net: 'Líquido',
    },
    import: {
      title: 'Importar lançamentos',
      hint: 'Selecione um arquivo CSV com colunas: date, description, amount, type.',
      chooseFile: 'Escolher arquivo',
      parsing: 'Processando...',
      colDate: 'Data',
      colDesc: 'Descrição',
      colAmount: 'Valor',
      colType: 'Tipo',
      selected: 'selecionados',
      confirm: 'Importar {n}',
      importing: 'Importando...',
      success: '{n} lançamento(s) importado(s) com sucesso.',
      importMore: 'Importar mais',
      goToTx: 'Ver transações',
    },
  },

  'en-US': {
    locale: { 'pt-BR': 'Português', 'en-US': 'English', es: 'Español' },
    nav: { transactions: 'Transactions', budgets: 'Budgets', dashboard: 'Overview', config: 'Settings', logout: 'Log out', syncing: 'Syncing...' },
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    filter: { all: '⊙ All', income: 'Income', expense: 'Expense' },
    table: { day: 'Day', total: 'Total' },
    kind: {
      INCOME:  { label: 'Income',   letter: 'I' },
      EXPENSE: { label: 'Expense',  letter: 'E' },
      CREDIT:  { label: 'Credit',   letter: 'C' },
      SAVING:  { label: 'Saving',   letter: 'S' },
      BUDGET:  { label: 'Budget',   letter: 'B' },
    },
    status: { pending: 'Pend.' },
    search: { placeholder: 'Search transactions...' },
    modal: {
      title: 'New entry',
      editTitle: 'Edit entry',
      descPlaceholder: 'Description (optional)',
      categoryLabel: 'Category',
      cancel: 'Cancel',
      save: 'Save',
      saveEdit: 'Update',
      recurring: 'Recurring',
      recurringFreq: 'Frequency',
      recurringEndLabel: 'End date (optional)',
      freqDaily: 'Daily',
      freqWeekly: 'Weekly',
      freqMonthly: 'Monthly',
      freqYearly: 'Yearly',
    },
    dayGroup: { addInline: '+ add', confirmDelete: 'Remove?', balance: 'Balance' },
    login: {
      subtitle: 'Track transactions, credit, savings and budgets.',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Password',
      submit: 'Sign in',
      submitting: 'Signing in...',
      genericError: 'Sign-in failed',
      registerLink: 'Create account',
    },
    register: {
      subtitle: 'Create your account to get started.',
      namePlaceholder: 'Name',
      emailPlaceholder: 'Email',
      passwordPlaceholder: 'Password (min. 12 characters)',
      confirmPlaceholder: 'Confirm password',
      submit: 'Create account',
      submitting: 'Creating...',
      passwordMismatch: 'Passwords do not match',
      passwordTooShort: 'Password must be at least 12 characters',
      emailConflict: 'Email already in use',
      genericError: 'Failed to create account',
      loginLink: 'Already have an account',
    },
    budgets: {
      title: 'Budgets',
      empty: 'No budgets created yet.',
      summary: '{count} budgets · {overBudgetCount} over limit',
      newBudget: 'New budget',
      editBudget: 'Edit budget',
      namePlaceholder: 'Name (e.g. Europe trip)',
      notesPlaceholder: 'Notes (optional)',
      remaining: 'remaining',
      noTransactions: 'No associated transactions.',
      confirmDelete: 'Remove budget?',
    },
    config: {
      title: 'Settings',
      sections: { account: 'Account', appearance: 'Appearance', language: 'Language', data: 'Data', about: 'About', security: 'Security', danger: 'Danger zone' },
      email: 'Email',
      name: 'Name',
      namePlaceholder: 'Your name',
      nameEdit: 'Edit',
      nameSave: 'Save',
      theme: 'Theme', themeAuto: 'Auto', themeLight: 'Light', themeDark: 'Dark',
      languageLabel: 'Language',
      cacheLabel: 'Local cache',
      cacheHint: 'Clears cached data and reloads from the server.',
      cacheClear: 'Clear cache',
      cacheDone: 'Cleared ✓',
      appLabel: 'App',
      webVersionLabel: 'Web version',
      initialBalance: 'Initial balance',
      initialBalancePlaceholder: '0.00',
      initialBalanceSave: 'Save',
      initialBalanceHint: 'Opening balance before you started using tallyoh.',
      importLabel: 'Import CSV',
      importButton: 'Import transactions',
      changePwd: {
        label: 'Change password',
        hint: 'Minimum 12 characters.',
        current: 'Current password',
        next: 'New password',
        save: 'Change',
        saving: 'Saving...',
        success: 'Password changed ✓',
        errorWrong: 'Current password is incorrect',
        errorShort: 'New password must be at least 12 characters',
      },
      deleteAccount: {
        label: 'Delete account',
        hint: 'This action is irreversible. All your data will be permanently removed.',
        button: 'Delete my account',
        confirmTitle: 'Confirm deletion',
        confirmHint: 'Enter your password to confirm:',
        passwordPlaceholder: 'Your password',
        confirm: 'Delete permanently',
        cancel: 'Cancel',
        errorWrong: 'Incorrect password',
      },
    },
    dashboard: {
      title: 'Overview',
      balance: 'Total balance',
      monthlyIncome: 'Monthly income',
      monthlyExpenses: 'Monthly expenses',
      safe: 'Available',
      evolution: 'Evolution (6 months)',
      breakdown: 'By category',
      breakdownExpenses: 'Expenses',
      breakdownIncome: 'Income',
      noData: 'No data available.',
      uncategorized: 'Uncategorized',
      income: 'Income',
      expenses: 'Expenses',
      net: 'Net',
    },
    import: {
      title: 'Import transactions',
      hint: 'Select a CSV file with columns: date, description, amount, type.',
      chooseFile: 'Choose file',
      parsing: 'Processing...',
      colDate: 'Date',
      colDesc: 'Description',
      colAmount: 'Amount',
      colType: 'Type',
      selected: 'selected',
      confirm: 'Import {n}',
      importing: 'Importing...',
      success: '{n} transaction(s) imported successfully.',
      importMore: 'Import more',
      goToTx: 'View transactions',
    },
  },

  es: {
    locale: { 'pt-BR': 'Português', 'en-US': 'English', es: 'Español' },
    nav: { transactions: 'Transacciones', budgets: 'Presupuestos', dashboard: 'Resumen', config: 'Ajustes', logout: 'Salir', syncing: 'Sincronizando...' },
    months: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    filter: { all: '⊙ Todas', income: 'Ingreso', expense: 'Gasto' },
    table: { day: 'Día', total: 'Total' },
    kind: {
      INCOME:  { label: 'Ingreso',   letter: 'I' },
      EXPENSE: { label: 'Gasto',     letter: 'G' },
      CREDIT:  { label: 'Crédito',   letter: 'C' },
      SAVING:  { label: 'Ahorro',    letter: 'A' },
      BUDGET:  { label: 'Presupuesto', letter: 'P' },
    },
    status: { pending: 'Pend.' },
    search: { placeholder: 'Buscar transacción...' },
    modal: {
      title: 'Nuevo registro',
      editTitle: 'Editar registro',
      descPlaceholder: 'Descripción (opcional)',
      categoryLabel: 'Categoría',
      cancel: 'Cancelar',
      save: 'Guardar',
      saveEdit: 'Actualizar',
      recurring: 'Recurrente',
      recurringFreq: 'Frecuencia',
      recurringEndLabel: 'Fecha de fin (opcional)',
      freqDaily: 'Diario',
      freqWeekly: 'Semanal',
      freqMonthly: 'Mensual',
      freqYearly: 'Anual',
    },
    dayGroup: { addInline: '+ agregar', confirmDelete: '¿Eliminar?', balance: 'Saldo' },
    login: {
      subtitle: 'Registra transacciones, crédito, ahorro y presupuestos.',
      emailPlaceholder: 'Correo',
      passwordPlaceholder: 'Contraseña',
      submit: 'Entrar',
      submitting: 'Entrando...',
      genericError: 'Error al iniciar sesión',
      registerLink: 'Crear cuenta',
    },
    register: {
      subtitle: 'Crea tu cuenta para empezar.',
      namePlaceholder: 'Nombre',
      emailPlaceholder: 'Correo',
      passwordPlaceholder: 'Contraseña (mín. 12 caracteres)',
      confirmPlaceholder: 'Confirmar contraseña',
      submit: 'Crear cuenta',
      submitting: 'Creando...',
      passwordMismatch: 'Las contraseñas no coinciden',
      passwordTooShort: 'La contraseña debe tener al menos 12 caracteres',
      emailConflict: 'El correo ya está registrado',
      genericError: 'Error al crear la cuenta',
      loginLink: 'Ya tengo cuenta',
    },
    budgets: {
      title: 'Presupuestos',
      empty: 'No hay presupuestos creados.',
      summary: '{count} presupuestos · {overBudgetCount} sobre el límite',
      newBudget: 'Nuevo presupuesto',
      editBudget: 'Editar presupuesto',
      namePlaceholder: 'Nombre (ej: Viaje Europa)',
      notesPlaceholder: 'Notas (opcional)',
      remaining: 'restante',
      noTransactions: 'Sin transacciones asociadas.',
      confirmDelete: '¿Eliminar presupuesto?',
    },
    config: {
      title: 'Ajustes',
      sections: { account: 'Cuenta', appearance: 'Apariencia', language: 'Idioma', data: 'Datos', about: 'Acerca de', security: 'Seguridad', danger: 'Zona de peligro' },
      email: 'Correo',
      name: 'Nombre',
      namePlaceholder: 'Tu nombre',
      nameEdit: 'Editar',
      nameSave: 'Guardar',
      theme: 'Tema', themeAuto: 'Auto', themeLight: 'Claro', themeDark: 'Oscuro',
      languageLabel: 'Idioma',
      cacheLabel: 'Caché local',
      cacheHint: 'Borra los datos en caché y recarga desde el servidor.',
      cacheClear: 'Limpiar caché',
      cacheDone: 'Limpiado ✓',
      appLabel: 'Aplicación',
      webVersionLabel: 'Versión web',
      initialBalance: 'Saldo inicial',
      initialBalancePlaceholder: '0,00',
      initialBalanceSave: 'Guardar',
      initialBalanceHint: 'Saldo de apertura antes de usar tallyoh.',
      importLabel: 'Importar CSV',
      importButton: 'Importar transacciones',
      changePwd: {
        label: 'Cambiar contraseña',
        hint: 'Mínimo 12 caracteres.',
        current: 'Contraseña actual',
        next: 'Nueva contraseña',
        save: 'Cambiar',
        saving: 'Guardando...',
        success: 'Contraseña cambiada ✓',
        errorWrong: 'Contraseña actual incorrecta',
        errorShort: 'La nueva contraseña debe tener al menos 12 caracteres',
      },
      deleteAccount: {
        label: 'Eliminar cuenta',
        hint: 'Esta acción es irreversible. Todos tus datos serán eliminados permanentemente.',
        button: 'Eliminar mi cuenta',
        confirmTitle: 'Confirmar eliminación',
        confirmHint: 'Ingresa tu contraseña para confirmar:',
        passwordPlaceholder: 'Tu contraseña',
        confirm: 'Eliminar permanentemente',
        cancel: 'Cancelar',
        errorWrong: 'Contraseña incorrecta',
      },
    },
    dashboard: {
      title: 'Resumen',
      balance: 'Saldo total',
      monthlyIncome: 'Ingresos del mes',
      monthlyExpenses: 'Gastos del mes',
      safe: 'Disponible',
      evolution: 'Evolución (6 meses)',
      breakdown: 'Por categoría',
      breakdownExpenses: 'Gastos',
      breakdownIncome: 'Ingresos',
      noData: 'Sin datos disponibles.',
      uncategorized: 'Sin categoría',
      income: 'Ingreso',
      expenses: 'Gasto',
      net: 'Neto',
    },
    import: {
      title: 'Importar transacciones',
      hint: 'Selecciona un archivo CSV con columnas: date, description, amount, type.',
      chooseFile: 'Elegir archivo',
      parsing: 'Procesando...',
      colDate: 'Fecha',
      colDesc: 'Descripción',
      colAmount: 'Importe',
      colType: 'Tipo',
      selected: 'seleccionados',
      confirm: 'Importar {n}',
      importing: 'Importando...',
      success: '{n} transacción(es) importada(s) con éxito.',
      importMore: 'Importar más',
      goToTx: 'Ver transacciones',
    },
  },
}
