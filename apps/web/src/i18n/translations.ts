export type Locale = 'pt-BR' | 'en-US' | 'es'

export interface T {
  locale: { 'pt-BR': string; 'en-US': string; es: string }
  nav: { transactions: string; budgets: string; config: string; logout: string; syncing: string }
  months: [string,string,string,string,string,string,string,string,string,string,string,string]
  filter: { all: string; income: string; expense: string }
  table: { day: string; total: string }
  kind: Record<'INCOME'|'EXPENSE'|'SAVING'|'CREDIT'|'BUDGET', { label: string; letter: string }>
  status: { pending: string }
  modal: { title: string; descPlaceholder: string; cancel: string; save: string }
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
    sections: { account: string; appearance: string; language: string; data: string; about: string }
    email: string
    theme: string; themeAuto: string; themeLight: string; themeDark: string
    languageLabel: string
    cacheLabel: string; cacheHint: string; cacheClear: string; cacheDone: string
    appLabel: string; webVersionLabel: string
  }
}

export const translations: Record<Locale, T> = {
  'pt-BR': {
    locale: { 'pt-BR': 'Português', 'en-US': 'English', es: 'Español' },
    nav: { transactions: 'Transações', budgets: 'Orçamentos', config: 'Config', logout: 'Sair', syncing: 'Sincronizando...' },
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
    modal: { title: 'Novo lançamento', descPlaceholder: 'Descrição (opcional)', cancel: 'Cancelar', save: 'Salvar' },
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
      sections: { account: 'Conta', appearance: 'Aparência', language: 'Idioma', data: 'Dados', about: 'Sobre' },
      email: 'Email',
      theme: 'Tema', themeAuto: 'Auto', themeLight: 'Claro', themeDark: 'Escuro',
      languageLabel: 'Idioma',
      cacheLabel: 'Cache local',
      cacheHint: 'Limpa os dados em cache e recarrega do servidor.',
      cacheClear: 'Limpar cache',
      cacheDone: 'Limpo ✓',
      appLabel: 'Aplicativo',
      webVersionLabel: 'Versão web',
    },
  },

  'en-US': {
    locale: { 'pt-BR': 'Português', 'en-US': 'English', es: 'Español' },
    nav: { transactions: 'Transactions', budgets: 'Budgets', config: 'Settings', logout: 'Log out', syncing: 'Syncing...' },
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
    modal: { title: 'New entry', descPlaceholder: 'Description (optional)', cancel: 'Cancel', save: 'Save' },
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
      sections: { account: 'Account', appearance: 'Appearance', language: 'Language', data: 'Data', about: 'About' },
      email: 'Email',
      theme: 'Theme', themeAuto: 'Auto', themeLight: 'Light', themeDark: 'Dark',
      languageLabel: 'Language',
      cacheLabel: 'Local cache',
      cacheHint: 'Clears cached data and reloads from the server.',
      cacheClear: 'Clear cache',
      cacheDone: 'Cleared ✓',
      appLabel: 'App',
      webVersionLabel: 'Web version',
    },
  },

  es: {
    locale: { 'pt-BR': 'Português', 'en-US': 'English', es: 'Español' },
    nav: { transactions: 'Transacciones', budgets: 'Presupuestos', config: 'Ajustes', logout: 'Salir', syncing: 'Sincronizando...' },
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
    modal: { title: 'Nuevo registro', descPlaceholder: 'Descripción (opcional)', cancel: 'Cancelar', save: 'Guardar' },
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
      sections: { account: 'Cuenta', appearance: 'Apariencia', language: 'Idioma', data: 'Datos', about: 'Acerca de' },
      email: 'Correo',
      theme: 'Tema', themeAuto: 'Auto', themeLight: 'Claro', themeDark: 'Oscuro',
      languageLabel: 'Idioma',
      cacheLabel: 'Caché local',
      cacheHint: 'Borra los datos en caché y recarga desde el servidor.',
      cacheClear: 'Limpiar caché',
      cacheDone: 'Limpiado ✓',
      appLabel: 'Aplicación',
      webVersionLabel: 'Versión web',
    },
  },
}
