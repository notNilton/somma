import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'api.dart';
import 'models.dart';

// Dinheiro

/// 123456 → "R$ 1.234,56"; negativo → "-R$ 1.234,56".
String money(int cents) {
  final abs = cents.abs();
  final whole = (abs ~/ 100).toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+$)'), (_) => '.');
  return '${cents < 0 ? '-' : ''}R\$ $whole,${(abs % 100).toString().padLeft(2, '0')}';
}

/// Como [money], com "+" nos positivos (saldos e totais do dia).
String signedMoney(int cents) => '${cents > 0 ? '+' : ''}${money(cents)}';

/// "1.234,56" ou "-12,00" → centavos. Vazio ou inválido → 0.
int parseCents(String text) {
  final digits = text.replaceAll(RegExp(r'\D'), '');
  final cents = int.tryParse(digits) ?? 0;
  return text.trim().startsWith('-') ? -cents : cents;
}

/// Centavos → texto do campo de valor ("1.234,56").
String centsText(int cents) => money(cents).replaceFirst('R\$ ', '');

/// Campo de valor como nos apps de banco: os dígitos entram pela direita (1, 12, 1,23, 12,34…).
class MoneyFormatter extends TextInputFormatter {
  MoneyFormatter({this.allowNegative = false});

  final bool allowNegative;

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final negative = allowNegative && newValue.text.contains('-');
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) {
      final text = negative ? '-' : '';
      return TextEditingValue(
        text: text,
        selection: TextSelection.collapsed(offset: text.length),
      );
    }
    final cents = int.parse(digits.length > 15 ? digits.substring(0, 15) : digits);
    final text = (negative ? '-' : '') + centsText(cents);
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

const tabular = [FontFeature.tabularFigures()];

// Datas (dias de calendário, sem hora)

const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const weekdayNames = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

String _two(int n) => n.toString().padLeft(2, '0');

/// DateTime → "2026-10-29", o formato da API.
String ymd(DateTime d) => '${d.year}-${_two(d.month)}-${_two(d.day)}';

DateTime parseYmd(String s) =>
    DateTime(int.parse(s.substring(0, 4)), int.parse(s.substring(5, 7)), int.parse(s.substring(8, 10)));

/// "2026-10-29" → "29/10/2026".
String dmy(String s) => '${s.substring(8, 10)}/${s.substring(5, 7)}/${s.substring(0, 4)}';

String today() => ymd(DateTime.now());

// Cores: neutro em tudo, cor só para dizer se entra ou sai dinheiro e o tipo do lançamento.

bool _dark(BuildContext context) => Theme.of(context).brightness == Brightness.dark;

Color positive(BuildContext context) => _dark(context) ? const Color(0xFF4ADE80) : const Color(0xFF15803D);
Color negative(BuildContext context) => _dark(context) ? const Color(0xFFF87171) : const Color(0xFFB91C1C);

Color amountColor(BuildContext context, int cents) => cents > 0
    ? positive(context)
    : cents < 0
    ? negative(context)
    : Theme.of(context).hintColor;

Color kindColor(BuildContext context, Kind kind) {
  final dark = _dark(context);
  return switch (kind) {
    Kind.income => positive(context),
    Kind.expense => negative(context),
    Kind.credit => dark ? const Color(0xFFFACC15) : const Color(0xFFA16207),
    Kind.saving => dark ? const Color(0xFF60A5FA) : const Color(0xFF1D4ED8),
    Kind.budget => dark ? const Color(0xFFA78BFA) : const Color(0xFF6D28D9),
  };
}

// Bancos e documentos

/// Instituições mais comuns, com o código COMPE de 3 dígitos.
const banks = [
  ('001', 'Banco do Brasil'),
  ('104', 'Caixa Econômica Federal'),
  ('341', 'Itaú Unibanco'),
  ('237', 'Bradesco'),
  ('033', 'Santander'),
  ('260', 'Nubank'),
  ('077', 'Banco Inter'),
  ('336', 'C6 Bank'),
  ('323', 'Mercado Pago'),
  ('380', 'PicPay'),
  ('290', 'PagBank'),
  ('208', 'BTG Pactual'),
  ('102', 'XP Investimentos'),
  ('756', 'Sicoob'),
  ('748', 'Sicredi'),
  ('212', 'Banco Original'),
  ('422', 'Safra'),
  ('041', 'Banrisul'),
  ('070', 'BRB'),
  ('536', 'Neon'),
  ('403', 'Cora'),
  ('197', 'Stone'),
];

String onlyDigits(String s) => s.replaceAll(RegExp(r'\D'), '');

/// Até 11 dígitos como CPF, depois como CNPJ.
String formatDocument(String raw) {
  final d = onlyDigits(raw);
  final s = d.length > 14 ? d.substring(0, 14) : d;
  final buf = StringBuffer();
  final seps = s.length <= 11 ? const {3: '.', 6: '.', 9: '-'} : const {2: '.', 5: '.', 8: '/', 12: '-'};
  for (var i = 0; i < s.length; i++) {
    if (seps.containsKey(i)) buf.write(seps[i]);
    buf.write(s[i]);
  }
  return buf.toString();
}

class DocumentFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = formatDocument(newValue.text);
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

/// Mostra só o miolo do documento (padrão LGPD): ***.982.247-**
String maskDocument(String digits, String type) {
  if (type == 'CPF' && digits.length == 11) return '***.${digits.substring(3, 6)}.${digits.substring(6, 9)}-**';
  if (type == 'CNPJ' && digits.length == 14) {
    return '${digits.substring(0, 2)}.${digits.substring(2, 5)}.${digits.substring(5, 8)}/****-**';
  }
  return digits;
}

// Widgets

void showError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(error is ApiError ? error.message : 'Algo deu errado')));
}

void showInfo(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

Future<bool> confirm(BuildContext context, String title, {String? body, String action = 'Excluir'}) async =>
    await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: body == null ? null : Text(body),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: Text(action)),
        ],
      ),
    ) ==
    true;

/// Erro de carregamento com "tentar de novo".
class ErrorRetry extends StatelessWidget {
  const ErrorRetry(this.error, {super.key, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(error is ApiError ? '$error' : 'Não foi possível carregar', textAlign: TextAlign.center),
          TextButton(onPressed: onRetry, child: const Text('Tentar de novo')),
        ],
      ),
    ),
  );
}

/// Título de seção em caixa alta, com um valor opcional à direita.
class SectionHead extends StatelessWidget {
  const SectionHead(this.title, {super.key, this.trailing});

  final String title;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.6,
      color: Theme.of(context).hintColor,
    );
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
      ),
      child: Row(
        children: [
          Expanded(child: Text(title.toUpperCase(), style: style)),
          if (trailing != null) Text(trailing!, style: style.copyWith(fontFeatures: tabular)),
        ],
      ),
    );
  }
}

/// Número grande com rótulo em cima e dica embaixo (resumos de Contas e Projeções).
class Figure extends StatelessWidget {
  const Figure({super.key, required this.label, required this.value, this.hint, this.color, this.big = false});

  final String label;
  final String value;
  final String? hint;
  final Color? color;
  final bool big;

  @override
  Widget build(BuildContext context) {
    final hintColor = Theme.of(context).hintColor;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 13, color: hintColor)),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(fontSize: big ? 28 : 18, fontWeight: FontWeight.w700, color: color, fontFeatures: tabular),
        ),
        if (hint != null) Text(hint!, style: TextStyle(fontSize: 12, color: hintColor)),
      ],
    );
  }
}

/// Letra do tipo de lançamento, na cor do tipo.
class KindTag extends StatelessWidget {
  const KindTag(this.kind, {super.key});

  final Kind kind;

  @override
  Widget build(BuildContext context) {
    final color = kindColor(context, kind);
    return Container(
      width: 24,
      height: 24,
      alignment: Alignment.center,
      decoration: BoxDecoration(border: Border.all(color: color)),
      child: Text(
        kind.letter,
        style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12),
      ),
    );
  }
}

/// Selo pequeno ("mensal", "fatura", "pendente").
class Tag extends StatelessWidget {
  const Tag(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(left: 6),
    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
    decoration: BoxDecoration(border: Border.all(color: Theme.of(context).dividerColor)),
    child: Text(text, style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor)),
  );
}

/// Rótulo + campo, no padrão dos formulários.
class Field extends StatelessWidget {
  const Field(this.label, this.child, {super.key});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(label, style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor)),
        const SizedBox(height: 4),
        child,
      ],
    ),
  );
}

/// Campo de data que abre o calendário.
class DateField extends StatelessWidget {
  const DateField({
    super.key,
    required this.value,
    required this.onChanged,
    this.hint = 'Escolher',
    this.first,
    this.clearable = false,
  });

  final String? value; // YYYY-MM-DD
  final ValueChanged<String?> onChanged;
  final String hint;
  final String? first; // primeiro dia permitido
  final bool clearable;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: value != null ? parseYmd(value!) : DateTime.now(),
          firstDate: first != null ? parseYmd(first!) : DateTime(2000),
          lastDate: DateTime(2100),
        );
        if (picked != null) onChanged(ymd(picked));
      },
      child: InputDecorator(
        decoration: InputDecoration(
          suffixIcon: value != null && clearable
              ? IconButton(icon: const Icon(Icons.close, size: 18), onPressed: () => onChanged(null))
              : const Icon(Icons.calendar_today_outlined, size: 18),
        ),
        child: Text(
          value != null ? dmy(value!) : hint,
          style: value == null ? TextStyle(color: Theme.of(context).hintColor) : null,
        ),
      ),
    );
  }
}
