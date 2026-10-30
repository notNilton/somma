// A API manda dinheiro em reais (número); aqui tudo vira centavos para não acumular erro de ponto flutuante.
int _cents(dynamic v) => v is num ? (v * 100).round() : 0;

class User {
  User.fromJson(Map<String, dynamic> j) : name = j['name'] as String? ?? '', email = j['email'] as String? ?? '';

  User(this.name, this.email);

  final String name;
  final String email;
}

enum AccountType {
  checking('CHECKING', 'Conta corrente'),
  wallet('WALLET', 'Carteira / dinheiro'),
  emergency('EMERGENCY', 'Reserva de emergência'),
  investment('INVESTMENT', 'Investimentos');

  const AccountType(this.code, this.label);
  final String code;
  final String label;

  static AccountType parse(String? code) => values.firstWhere((t) => t.code == code, orElse: () => checking);
}

class Account {
  Account.fromJson(Map<String, dynamic> j)
    : id = j['id'] as String,
      name = j['name'] as String? ?? '',
      type = AccountType.parse(j['type'] as String?),
      balance = j['balanceCents'] as int? ?? _cents(j['balance']),
      initialBalance = j['initialBalanceCents'] as int? ?? _cents(j['initialBalance']),
      bankCode = j['bankCode'] as String? ?? '',
      bankName = j['bankName'] as String? ?? '',
      holderName = j['holderName'] as String? ?? '',
      holderDocumentType = j['holderDocumentType'] as String? ?? '',
      holderDocument = j['holderDocument'] as String? ?? '';

  final String id;
  final String name;
  final AccountType type;
  final int balance; // centavos, calculado pelo servidor
  final int initialBalance;
  final String bankCode;
  final String bankName;
  final String holderName;
  final String holderDocumentType; // CPF, CNPJ ou vazio
  final String holderDocument; // só dígitos
}

class CreditCard {
  CreditCard.fromJson(Map<String, dynamic> j)
    : id = j['id'] as String,
      name = j['name'] as String? ?? '',
      accountId = j['accountId'] as String?,
      limit = j['creditLimitCents'] as int? ?? _cents(j['creditLimit']),
      available = j['availableLimitCents'] as int? ?? _cents(j['availableLimit']),
      closingDay = j['closingDay'] as int? ?? 5,
      dueDay = j['dueDay'] as int? ?? 15;

  final String id;
  final String name;
  final String? accountId;
  final int limit;
  final int available;
  final int closingDay;
  final int dueDay;

  int get used => limit - available;
}

class Category {
  Category.fromJson(Map<String, dynamic> j)
    : id = j['id'] as String,
      name = j['name'] as String? ?? '',
      type = j['type'] as String? ?? '',
      children = [for (final c in j['children'] as List? ?? const []) Category.fromJson(c)];

  final String id;
  final String name;
  final String type; // INCOME ou EXPENSE
  final List<Category> children;
}

/// Tipos de lançamento, na ordem do formulário. Só renda é entrada.
enum Kind {
  income('INCOME', 'Renda', 'R'),
  expense('EXPENSE', 'Débito', 'D'),
  credit('CREDIT', 'Crédito', 'C'),
  saving('SAVING', 'Poupança', 'P'),
  budget('BUDGET', 'Orçamento', 'O');

  const Kind(this.code, this.label, this.letter);
  final String code;
  final String label;
  final String letter;

  bool get isIncome => this == income;

  static Kind parse(String? code) => values.firstWhere((k) => k.code == code, orElse: () => expense);
}

class Transaction {
  Transaction.fromJson(Map<String, dynamic> j)
    : id = j['id'] as String,
      kind = _kindOf(j),
      income = j['type'] == 'INCOME',
      status = j['status'] as String? ?? 'COMPLETED',
      amount = _cents(j['amount']),
      description = j['description'] as String? ?? '',
      date = (j['date'] as String).substring(0, 10),
      categoryId = j['categoryId'] as String?,
      accountId = j['accountId'] as String?,
      cardId = j['cardId'] as String?,
      installmentGroupId = j['installmentGroupId'] as String?,
      isInvoicePayment = j['isInvoicePayment'] as bool? ?? false,
      isRecurring = j['isRecurring'] as bool? ?? false;

  final String id;
  final Kind kind;
  final bool income;
  final String status; // COMPLETED, PENDING, CANCELED
  final int amount; // centavos, sempre positivo
  final String description;
  final String date; // YYYY-MM-DD
  final String? categoryId;
  final String? accountId;
  final String? cardId;
  final String? installmentGroupId;
  final bool isInvoicePayment;
  final bool isRecurring;

  bool get canceled => status == 'CANCELED';
  bool get pending => status == 'PENDING';

  /// Efeito no saldo: renda soma, o resto subtrai.
  int get signed => income ? amount : -amount;
}

// Crédito, poupança e orçamento valem pelo kind; renda e débito seguem o type.
Kind _kindOf(Map<String, dynamic> j) {
  final kind = Kind.parse(j['kind'] as String?);
  if (kind == Kind.income || kind == Kind.expense) return j['type'] == 'INCOME' ? Kind.income : Kind.expense;
  return kind;
}
