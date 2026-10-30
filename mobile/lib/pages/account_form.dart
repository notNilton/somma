import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api.dart';
import '../models.dart';
import '../store.dart';
import '../ui.dart';

const _otherBank = 'OTHER';

/// Cadastro e edição de conta, com o cartão de crédito dela (no máximo um por conta).
class AccountFormPage extends StatefulWidget {
  const AccountFormPage({super.key, this.account});

  final Account? account;

  @override
  State<AccountFormPage> createState() => _AccountFormPageState();
}

class _AccountFormPageState extends State<AccountFormPage> {
  late final Account? _a = widget.account;
  late final CreditCard? _card = _a == null ? null : store.cardOf(_a.id);

  late AccountType _type = _a?.type ?? AccountType.checking;
  // Código COMPE da lista, _otherBank para nome livre, '' para nenhum.
  late String _bank = _a == null
      ? ''
      : banks.any((b) => b.$1 == _a.bankCode)
      ? _a.bankCode
      : _a.bankName.isNotEmpty
      ? _otherBank
      : '';
  late final _otherBankName = TextEditingController(text: _bank == _otherBank ? _a!.bankName : '');
  late final _name = TextEditingController(text: _a?.name ?? '');
  late final _holder = TextEditingController(text: _a?.holderName ?? '');
  late final _document = TextEditingController(text: formatDocument(_a?.holderDocument ?? ''));
  late final _limit = TextEditingController(text: _card != null && _card.limit > 0 ? centsText(_card.limit) : '');
  late final _closing = TextEditingController(text: '${_card?.closingDay ?? 5}');
  late final _due = TextEditingController(text: '${_card?.dueDay ?? 15}');
  bool _busy = false;

  (String, String) get _selectedBank {
    if (_bank == _otherBank) return ('', _otherBankName.text.trim());
    final b = banks.where((b) => b.$1 == _bank).firstOrNull;
    return b ?? ('', '');
  }

  Future<void> _save() async {
    final (code, bankName) = _selectedBank;
    // Sem nome próprio, a conta leva o nome do banco.
    final name = _name.text.trim().isNotEmpty ? _name.text.trim() : bankName;
    if (name.isEmpty) return showError(context, ApiError(0, 'Escolha um banco ou dê um nome à conta'));
    final doc = onlyDigits(_document.text);
    if (doc.isNotEmpty && doc.length != 11 && doc.length != 14) {
      return showError(context, ApiError(0, 'CPF deve ter 11 dígitos e CNPJ 14'));
    }
    final closing = int.tryParse(_closing.text) ?? 0;
    final due = int.tryParse(_due.text) ?? 0;
    if (closing < 1 || closing > 31 || due < 1 || due > 31) {
      return showError(context, ApiError(0, 'Fechamento e vencimento do cartão devem ser dias entre 1 e 31'));
    }
    final limit = parseCents(_limit.text);

    FocusScope.of(context).unfocus();
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final saved = await api.saveAccount(_a?.id, {
        'name': name,
        'type': _type.code,
        'bankCode': code,
        'bankName': bankName,
        'holderName': _holder.text.trim(),
        'holderDocument': doc,
      });
      // O cartão só é gravado se já existir ou se um limite foi informado;
      // sem isso ele nasce sozinho na primeira compra no crédito.
      if (_card != null || limit > 0) {
        await api.saveCard(saved.id, limitCents: limit, closingDay: closing, dueDay: due);
      }
      await store.changed();
      messenger.showSnackBar(SnackBar(content: Text(_a == null ? 'Conta criada' : 'Conta salva')));
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        showError(context, e);
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final hint = Theme.of(context).hintColor;
    final days = [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(2)];
    return Scaffold(
      appBar: AppBar(title: Text(_a == null ? 'Nova conta' : 'Editar conta')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Field(
            'Banco',
            DropdownButtonFormField<String>(
              initialValue: _bank,
              isExpanded: true,
              items: [
                const DropdownMenuItem(value: '', child: Text('Nenhum (carteira, dinheiro)')),
                for (final (code, name) in banks) DropdownMenuItem(value: code, child: Text('$code · $name')),
                const DropdownMenuItem(value: _otherBank, child: Text('Outro…')),
              ],
              onChanged: (v) => setState(() => _bank = v ?? ''),
            ),
          ),
          if (_bank == _otherBank)
            Field(
              'Nome do banco',
              TextField(
                controller: _otherBankName,
                decoration: const InputDecoration(hintText: 'Ex.: Banco Pan'),
              ),
            ),
          Field(
            'Tipo de conta',
            DropdownButtonFormField<AccountType>(
              initialValue: _type,
              isExpanded: true,
              items: [for (final t in AccountType.values) DropdownMenuItem(value: t, child: Text(t.label))],
              onChanged: (v) => setState(() => _type = v ?? _type),
            ),
          ),
          Field(
            'Nome da conta (opcional)',
            TextField(
              controller: _name,
              maxLength: 80,
              decoration: InputDecoration(
                hintText: _selectedBank.$2.isNotEmpty ? _selectedBank.$2 : 'Ex.: Carteira física',
                counterText: '',
              ),
            ),
          ),
          Field(
            'Titular (opcional)',
            TextField(
              controller: _holder,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(hintText: 'Nome ou razão social'),
            ),
          ),
          Field(
            'CPF ou CNPJ (opcional)',
            TextField(
              controller: _document,
              keyboardType: TextInputType.number,
              inputFormatters: [DocumentFormatter()],
              decoration: const InputDecoration(hintText: '000.000.000-00'),
            ),
          ),
          const SizedBox(height: 8),
          const Text('Cartão de crédito', style: TextStyle(fontWeight: FontWeight.w700)),
          Padding(
            padding: const EdgeInsets.only(top: 2, bottom: 12),
            child: Text(
              'Compras no crédito feitas nesta conta usam este cartão.',
              style: TextStyle(fontSize: 13, color: hint),
            ),
          ),
          Field(
            'Limite (opcional)',
            TextField(
              controller: _limit,
              keyboardType: TextInputType.number,
              inputFormatters: [MoneyFormatter()],
              decoration: const InputDecoration(prefixText: 'R\$ ', hintText: '0,00'),
            ),
          ),
          Row(
            children: [
              Expanded(
                child: Field(
                  'Fecha dia',
                  TextField(controller: _closing, keyboardType: TextInputType.number, inputFormatters: days),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Field(
                  'Vence dia',
                  TextField(controller: _due, keyboardType: TextInputType.number, inputFormatters: days),
                ),
              ),
            ],
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 8 + MediaQuery.viewInsetsOf(context).bottom),
          child: FilledButton(
            onPressed: _busy ? null : _save,
            child: _busy
                ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Salvar'),
          ),
        ),
      ),
    );
  }
}
