export type Locale = 'pt-BR' | 'en-US' | 'es'

export interface T {
  locale: { 'pt-BR': string; 'en-US': string; es: string }
  nav: { transactions: string; config: string; logout: string; syncing: string }
  months: [string,string,string,string,string,string,string,string,string,string,string,string]
  filter: { all: string; income: string; expense: string }
  table: { day: string; type: string; total: string }
  kind: Record<'INCOME'|'EXPENSE'|'CREDIT', { label: string; letter: string }>
  status: { pending: string }
  emptyState: { title: string; hint: string }
  modal: {
    title: string
    editTitle: string
    descPlaceholder: string
    categoryLabel: string
    cancel: string
    save: string
    saveEdit: string
  }
  dayGroup: { addInline: string; confirmDelete: string; balance: string; total: string }
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
}

export const translations: Record<Locale, T> = {
  'pt-BR': {
    locale: { 'pt-BR': 'Português', 'en-US': 'English', es: 'Español' },
    nav: { transactions: 'Lançamentos', config: 'Config', logout: 'Sair', syncing: 'Sincronizando...' },
    months: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    filter: { all: '⊙ Todos', income: 'Renda', expense: 'Gasto' },
    table: { day: 'Dia', type: 'Tipo', total: 'Total' },
    kind: {
      INCOME:  { label: 'Renda',        letter: 'R' },
      EXPENSE: { label: 'Débito / Pix', letter: 'D' },
      CREDIT:  { label: 'Crédito',      letter: 'C' },
    },
    status: { pending: 'Pend.' },
    emptyState: {
      title: 'Nenhum lançamento',
      hint: 'Adicione seu primeiro lançamento clicando em qualquer dia',
    },
    modal: {
      title: 'Novo lançamento',
      editTitle: 'Editar lançamento',
      descPlaceholder: 'Descrição (opcional)',
      categoryLabel: 'Categoria',
      cancel: 'Cancelar',
      save: 'Salvar',
      saveEdit: 'Atualizar',
    },
    dayGroup: { addInline: '+ adicionar', confirmDelete: 'Remover?', balance: 'Saldo', total: 'Total do dia' },
    login: {
      subtitle: 'Cadastre renda, gastos no crédito e no débito/pix.',
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
  },

  'en-US': {
    locale: { 'pt-BR': 'Português', 'en-US': 'English', es: 'Español' },
    nav: { transactions: 'Entries', config: 'Settings', logout: 'Log out', syncing: 'Syncing...' },
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    filter: { all: '⊙ All', income: 'Income', expense: 'Expense' },
    table: { day: 'Day', type: 'Type', total: 'Total' },
    kind: {
      INCOME:  { label: 'Income',      letter: 'I' },
      EXPENSE: { label: 'Debit / Pix', letter: 'D' },
      CREDIT:  { label: 'Credit',      letter: 'C' },
    },
    status: { pending: 'Pend.' },
    emptyState: {
      title: 'No entries',
      hint: 'Add your first entry by tapping any day',
    },
    modal: {
      title: 'New entry',
      editTitle: 'Edit entry',
      descPlaceholder: 'Description (optional)',
      categoryLabel: 'Category',
      cancel: 'Cancel',
      save: 'Save',
      saveEdit: 'Update',
    },
    dayGroup: { addInline: '+ add', confirmDelete: 'Remove?', balance: 'Balance', total: 'Day total' },
    login: {
      subtitle: 'Track income, credit and debit/pix expenses.',
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
  },

  es: {
    locale: { 'pt-BR': 'Português', 'en-US': 'English', es: 'Español' },
    nav: { transactions: 'Movimientos', config: 'Ajustes', logout: 'Salir', syncing: 'Sincronizando...' },
    months: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    filter: { all: '⊙ Todos', income: 'Ingreso', expense: 'Gasto' },
    table: { day: 'Día', type: 'Tipo', total: 'Total' },
    kind: {
      INCOME:  { label: 'Ingreso',     letter: 'I' },
      EXPENSE: { label: 'Débito / Pix', letter: 'D' },
      CREDIT:  { label: 'Crédito',     letter: 'C' },
    },
    status: { pending: 'Pend.' },
    emptyState: {
      title: 'Sin movimientos',
      hint: 'Añade tu primer movimiento tocando cualquier día',
    },
    modal: {
      title: 'Nuevo movimiento',
      editTitle: 'Editar movimiento',
      descPlaceholder: 'Descripción (opcional)',
      categoryLabel: 'Categoría',
      cancel: 'Cancelar',
      save: 'Guardar',
      saveEdit: 'Actualizar',
    },
    dayGroup: { addInline: '+ agregar', confirmDelete: '¿Eliminar?', balance: 'Saldo', total: 'Total del día' },
    login: {
      subtitle: 'Registra ingresos, gastos en crédito y débito/pix.',
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
      submit: 'Criar cuenta',
      submitting: 'Creando...',
      passwordMismatch: 'Las contraseñas no coinciden',
      passwordTooShort: 'La contraseña debe tener al menos 12 caracteres',
      emailConflict: 'El correo ya está registrado',
      genericError: 'Error al crear la cuenta',
      loginLink: 'Ya tengo cuenta',
    },
    config: {
      title: 'Ajustes',
      sections: { account: 'Cuenta', appearance: 'Apariencia', language: 'Idioma', data: 'Datos', about: 'Acerca de', security: 'Seguridad', danger: 'Zona de peligro' },
      email: 'Correo',
      name: 'Name',
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
        hint: 'Esta acción es irreversível. Todos tus datos serán eliminados permanentemente.',
        button: 'Eliminar mi cuenta',
        confirmTitle: 'Confirmar eliminación',
        confirmHint: 'Ingresa tu contraseña para confirmar:',
        passwordPlaceholder: 'Tu contraseña',
        confirm: 'Eliminar permanentemente',
        cancel: 'Cancelar',
        errorWrong: 'Contraseña incorrecta',
      },
    },
  },
}
