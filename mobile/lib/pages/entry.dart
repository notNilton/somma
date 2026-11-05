import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../models.dart';
import '../store.dart';
import '../ui.dart';

/// Exclui um lançamento; numa recorrência exclui também os próximos.
/// Devolve true se excluiu.
Future<bool> deleteTransaction(BuildContext context, Transaction t) async {
  final confirmed = t.isRecurring
      ? await confirm(context, 'Excluir este e os próximos?', body: 'Este lançamento se repete todo mês.')
      : await confirm(context, 'Excluir lançamento?', body: t.description.isEmpty ? null : t.description);
  if (!confirmed || !context.mounted) return false;
  final messenger = ScaffoldMessenger.of(context);
  try {
    await api.deleteTransaction(t.id, following: t.isRecurring);
    store.changed();
    messenger.showSnackBar(const SnackBar(content: Text('Lançamento excluído')));
    return true;
  } catch (e) {
    if (context.mounted) showError(context, e);
    return false;
  }
}

/// Novo lançamento, edição de um existente, ou pagamento de fatura (segunda aba).
class EntryPage extends StatefulWidget {
  const EntryPage({super.key, this.date, this.edit, this.invoice = false});

  final String? date;
  final Transaction? edit;
  final bool invoice; // abrir já na aba "Pagar fatura"

  @override
  State<EntryPage> createState() => _EntryPageState();
}

class _EntryPageState extends State<EntryPage> with SingleTickerProviderStateMixin {
  late final _tabs = TabController(length: 2, vsync: this, initialIndex: widget.invoice ? 1 : 0);
  bool _busy = false;

  // Lançamento
  late Kind _kind = widget.edit?.kind ?? Kind.expense;
  late final _amount = TextEditingController(text: widget.edit != null ? centsText(widget.edit!.amount) : '');
  late final _description = TextEditingController(text: widget.edit?.description ?? '');
  late String _date = widget.edit?.date ?? widget.date ?? today();
  late String? _categoryId = widget.edit?.categoryId;
  late String? _accountId = widget.edit?.accountId;
  int _installments = 1;
  bool _recurring = false;
  String? _recurrenceEnd;

  // Pagar fatura
  String? _cardAccountId;
  String? _fromAccountId;
  final _invoiceAmount = TextEditingController();
  String _invoiceDate = today();

  bool get _editing => widget.edit != null;

  // Novo lançamento ou um avulso já salvo (não recorrente nem parcelado) podem virar recorrentes.
  bool get _canRecur => !_editing || (!widget.edit!.isRecurring && widget.edit!.installmentGroupId == null);

  @override
  void initState() {
    super.initState();
    _tabs.addListener(() => setState(() {}));
    // Conta do lançamento: a única que existir, para não precisar escolher.
    if (!_editing && store.accounts.length == 1) _accountId = store.accounts.first.id;
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action, String done) async {
    FocusScope.of(context).unfocus();
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await action();
      await store.changed();
      messenger.showSnackBar(SnackBar(content: Text(done)));
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        showError(context, e);
        setState(() => _busy = false);
      }
    }
  }

  void _saveTransaction() {
    final cents = parseCents(_amount.text);
    if (cents <= 0) return showError(context, ApiError(0, 'Informe um valor maior que zero'));
    if (_kind == Kind.credit && _accountId == null) {
      return showError(context, ApiError(0, 'Escolha a conta do cartão'));
    }
    final recurring = _canRecur && _recurring;
    final body = <String, dynamic>{
      'type': _kind.isIncome ? 'INCOME' : 'EXPENSE',
      'kind': _kind.code,
      'amount': cents / 100,
      'description': _description.text.trim(),
      'date': _date,
      'categoryId': _categoryId ?? '',
      'accountId': _accountId ?? '',
      if (!_editing && _kind == Kind.credit && _installments > 1 && !recurring) 'totalInstallments': _installments,
      if (recurring) 'isRecurring': true,
      if (recurring && _recurrenceEnd != null) 'recurrenceEndDate': _recurrenceEnd,
    };
    _run(() => api.saveTransaction(widget.edit?.id, body), _editing ? 'Lançamento salvo' : 'Lançamento criado');
  }

  void _selectCard(String? accountId) {
    final card = accountId == null ? null : store.cardOf(accountId);
    setState(() {
      _cardAccountId = accountId;
      _fromAccountId = accountId;
      _invoiceAmount.text = card != null && card.used > 0 ? centsText(card.used) : '';
    });
  }

  void _payInvoice() {
    final cents = parseCents(_invoiceAmount.text);
    if (_cardAccountId == null) return showError(context, ApiError(0, 'Escolha o cartão'));
    if (cents <= 0) return showError(context, ApiError(0, 'Informe um valor maior que zero'));
    _run(
      () => api.payCard(
        _cardAccountId!,
        cents: cents,
        date: _invoiceDate,
        fromAccountId: _fromAccountId ?? _cardAccountId!,
      ),
      'Pagamento registrado',
    );
  }

  @override
  Widget build(BuildContext context) {
    final invoiceTab = !_editing && _tabs.index == 1;
    return Scaffold(
      appBar: AppBar(
        title: Text(_editing ? 'Editar lançamento' : 'Novo'),
        actions: [
          if (_editing)
            IconButton(
              tooltip: 'Excluir',
              icon: const Icon(Icons.delete_outline),
              onPressed: _busy
                  ? null
                  : () async {
                      if (await deleteTransaction(context, widget.edit!) && context.mounted) {
                        Navigator.pop(context, true);
                      }
                    },
            ),
        ],
        bottom: _editing
            ? null
            : TabBar(
                controller: _tabs,
                tabs: const [
                  Tab(text: 'Lançamento'),
                  Tab(text: 'Pagar fatura'),
                ],
              ),
      ),
      body: _editing
          ? _transactionForm()
          : TabBarView(controller: _tabs, children: [_transactionForm(), _invoiceForm()]),
      bottomNavigationBar: SafeArea(
        child: Padding(
          // Fica acima do teclado: o teclado numérico do iOS não tem "OK".
          padding: EdgeInsets.fromLTRB(16, 8, 16, 8 + MediaQuery.viewInsetsOf(context).bottom),
          child: FilledButton(
            onPressed: _busy ? null : (invoiceTab ? _payInvoice : _saveTransaction),
            child: _busy
                ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(invoiceTab ? 'Registrar pagamento' : 'Salvar'),
          ),
        ),
      ),
    );
  }

  Widget _transactionForm() {
    final credit = _kind == Kind.credit;
    final type = _kind.isIncome ? 'INCOME' : 'EXPENSE';
    final categories = <(String, String)>[];
    void flatten(List<Category> list, String indent) {
      for (final c in list) {
        categories.add((c.id, '$indent${c.name}'));
        flatten(c.children, '$indent    ');
      }
    }

    flatten(store.categories.where((c) => c.type == type).toList(), '');
    // Categoria de outro tipo (ou apagada) não aparece na lista; some do formulário.
    final categoryId = categories.any((c) => c.$1 == _categoryId) ? _categoryId : null;
    final cents = parseCents(_amount.text);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _KindPicker(
          value: _kind,
          onChanged: (k) => setState(() {
            _kind = k;
            if (k != Kind.credit) _installments = 1;
          }),
        ),
        const SizedBox(height: 16),
        Field(
          'Valor',
          TextField(
            controller: _amount,
            autofocus: !_editing,
            keyboardType: TextInputType.number,
            inputFormatters: [MoneyFormatter()],
            onChanged: (_) => setState(() {}),
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, fontFeatures: tabular),
            decoration: const InputDecoration(prefixText: 'R\$ ', hintText: '0,00'),
          ),
        ),
        Field('Data', DateField(value: _date, onChanged: (d) => setState(() => _date = d ?? _date))),
        Field(
          'Descrição',
          TextField(
            controller: _description,
            maxLength: 240,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(hintText: 'Ex.: mercado, aluguel, salário', counterText: ''),
          ),
        ),
        Field(
          'Categoria',
          DropdownButtonFormField<String?>(
            initialValue: categoryId,
            key: ValueKey('cat-$type'),
            isExpanded: true,
            items: [
              const DropdownMenuItem(value: null, child: Text('Sem categoria')),
              for (final (id, name) in categories) DropdownMenuItem(value: id, child: Text(name)),
            ],
            onChanged: (v) => setState(() => _categoryId = v),
          ),
        ),
        Field(
          credit ? 'Conta do cartão' : 'Conta',
          DropdownButtonFormField<String?>(
            initialValue: store.account(_accountId)?.id,
            key: ValueKey('acc-$credit'),
            isExpanded: true,
            hint: const Text('Escolher'),
            items: [
              if (!credit) const DropdownMenuItem(value: null, child: Text('Nenhuma')),
              for (final a in store.accounts) DropdownMenuItem(value: a.id, child: Text(a.name)),
            ],
            onChanged: (v) => setState(() => _accountId = v),
          ),
        ),
        if (credit && !_editing && !_recurring)
          Field(
            'Parcelas',
            DropdownButtonFormField<int>(
              initialValue: _installments,
              isExpanded: true,
              items: [
                for (var n = 1; n <= 48; n++)
                  DropdownMenuItem(
                    value: n,
                    child: Text(
                      n == 1
                          ? 'À vista'
                          : cents > 0
                          ? '${n}x de ${money(cents ~/ n)}'
                          : '${n}x',
                    ),
                  ),
              ],
              onChanged: (v) => setState(() => _installments = v ?? 1),
            ),
          ),
        if (_editing && widget.edit!.isRecurring)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              'Faz parte de uma recorrência mensal. As alterações valem para este mês e os próximos.',
              style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor),
            ),
          ),
        if (_canRecur && _installments == 1) ...[
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            title: const Text('Repetir todo mês'),
            subtitle: Text(
              _recurring ? 'Sem data final, cria 12 meses' : 'Um lançamento por mês, no mesmo dia',
              style: TextStyle(color: Theme.of(context).hintColor),
            ),
            value: _recurring,
            onChanged: (v) => setState(() => _recurring = v ?? false),
          ),
          if (_recurring)
            Field(
              'Até (opcional)',
              DateField(
                value: _recurrenceEnd,
                first: _date,
                clearable: true,
                hint: 'Sem data final',
                onChanged: (d) => setState(() => _recurrenceEnd = d),
              ),
            ),
        ],
      ],
    );
  }

  Widget _invoiceForm() {
    final payable = store.cards.where((c) => c.accountId != null && store.account(c.accountId) != null).toList();
    if (payable.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(
            'Nenhum cartão ainda. O cartão de uma conta nasce na primeira compra no crédito ou ao configurá-lo em Contas.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Theme.of(context).hintColor),
          ),
        ),
      );
    }
    final card = _cardAccountId == null ? null : store.cardOf(_cardAccountId!);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Field(
          'Cartão',
          DropdownButtonFormField<String>(
            initialValue: _cardAccountId,
            isExpanded: true,
            hint: const Text('Escolher'),
            items: [
              for (final c in payable)
                DropdownMenuItem(value: c.accountId, child: Text(store.account(c.accountId)!.name)),
            ],
            onChanged: _selectCard,
          ),
        ),
        if (card != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Text(
              'Usado ${money(card.used)}${card.limit > 0 ? ' de ${money(card.limit)}' : ''} · fecha dia ${card.closingDay}, vence dia ${card.dueDay}',
              style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor),
            ),
          ),
        Field(
          'Pagar com',
          DropdownButtonFormField<String>(
            initialValue: _fromAccountId,
            key: ValueKey('from-$_cardAccountId'),
            isExpanded: true,
            hint: const Text('Escolher'),
            items: [
              for (final a in store.accounts)
                DropdownMenuItem(value: a.id, child: Text('${a.name} · ${money(a.balance)}')),
            ],
            onChanged: (v) => setState(() => _fromAccountId = v),
          ),
        ),
        Field(
          'Valor',
          TextField(
            controller: _invoiceAmount,
            keyboardType: TextInputType.number,
            inputFormatters: [MoneyFormatter()],
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, fontFeatures: tabular),
            decoration: const InputDecoration(prefixText: 'R\$ ', hintText: '0,00'),
          ),
        ),
        Field(
          'Data',
          DateField(value: _invoiceDate, onChanged: (d) => setState(() => _invoiceDate = d ?? _invoiceDate)),
        ),
        Text(
          'O valor sai do saldo da conta escolhida e volta como limite do cartão.',
          style: TextStyle(fontSize: 13, color: Theme.of(context).hintColor),
        ),
      ],
    );
  }
}

/// Os cinco tipos de lançamento lado a lado; o escolhido ganha a borda na cor do tipo.
class _KindPicker extends StatelessWidget {
  const _KindPicker({required this.value, required this.onChanged});

  final Kind value;
  final ValueChanged<Kind> onChanged;

  @override
  Widget build(BuildContext context) {
    final line = Theme.of(context).colorScheme.outline;
    return Row(
      children: [
        for (final k in Kind.values)
          Expanded(
            child: InkWell(
              onTap: () {
                HapticFeedback.selectionClick();
                onChanged(k);
              },
              child: Container(
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  border: Border.all(color: k == value ? kindColor(context, k) : line, width: k == value ? 2 : 1),
                ),
                child: Text(
                  k.label,
                  maxLines: 1,
                  overflow: TextOverflow.fade,
                  softWrap: false,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: k == value ? FontWeight.w700 : FontWeight.w400,
                    color: k == value ? kindColor(context, k) : null,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
