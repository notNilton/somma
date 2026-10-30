import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../session.dart';
import '../store.dart';
import '../ui.dart';
import 'account_form.dart';
import 'entry.dart';

// Conta corrente e carteira são dinheiro disponível; reserva e investimentos ficam à parte.
const _groups = [
  ('Em conta', [AccountType.checking, AccountType.wallet]),
  ('Reserva', [AccountType.emergency]),
  ('Investimentos', [AccountType.investment]),
];

Color _swatch(BuildContext context, int group) => switch (group) {
  0 => Theme.of(context).colorScheme.onSurface,
  1 => const Color(0xFF737373),
  _ => positive(context),
};

String _percent(int part, int total) {
  if (total <= 0) return '0%';
  return '${(part / total * 100).toStringAsFixed(1).replaceAll('.', ',').replaceAll(',0', '')}%';
}

class AccountsPage extends StatelessWidget {
  const AccountsPage({super.key});

  void _new(BuildContext context) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => const AccountFormPage(), fullscreenDialog: true));

  Future<void> _logout(BuildContext context) async {
    if (await confirm(context, 'Sair da conta?', body: session.me?.email, action: 'Sair')) session.logout();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contas'),
        actions: [
          IconButton(tooltip: 'Nova conta', icon: const Icon(Icons.add), onPressed: () => _new(context)),
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'invoice') {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const EntryPage(invoice: true), fullscreenDialog: true),
                );
              }
              if (v == 'logout') _logout(context);
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'invoice', child: Text('Pagar fatura')),
              PopupMenuItem(
                value: 'logout',
                child: Text(session.me?.email.isNotEmpty == true ? 'Sair (${session.me!.email})' : 'Sair'),
              ),
            ],
          ),
        ],
      ),
      body: ListenableBuilder(
        listenable: store,
        builder: (context, _) {
          if (!store.loaded) return const Center(child: CircularProgressIndicator());
          if (store.error != null && store.accounts.isEmpty) return ErrorRetry(store.error!, onRetry: store.refresh);
          return RefreshIndicator(onRefresh: store.refresh, child: _list(context));
        },
      ),
    );
  }

  Widget _list(BuildContext context) {
    final accounts = store.accounts;
    final total = store.total;
    final hint = Theme.of(context).hintColor;
    final sums = [
      for (final (_, types) in _groups)
        accounts.where((a) => types.contains(a.type)).fold(0, (sum, a) => sum + a.balance),
    ];

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 32),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
          child: Figure(
            label: 'Patrimônio total',
            value: money(total),
            hint: '${accounts.length} ${accounts.length == 1 ? 'conta' : 'contas'}',
            big: true,
          ),
        ),
        for (var i = 0; i < _groups.length; i++)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 3),
            child: Row(
              children: [
                Container(width: 10, height: 10, color: _swatch(context, i)),
                const SizedBox(width: 8),
                Expanded(child: Text(_groups[i].$1, style: const TextStyle(fontSize: 14))),
                Text(
                  _percent(sums[i], total),
                  style: TextStyle(fontSize: 13, color: hint, fontFeatures: tabular),
                ),
                SizedBox(
                  width: 130,
                  child: Text(
                    money(sums[i]),
                    textAlign: TextAlign.right,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, fontFeatures: tabular),
                  ),
                ),
              ],
            ),
          ),
        if (total > 0)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: SizedBox(
              height: 8,
              child: Row(
                children: [
                  for (var i = 0; i < _groups.length; i++)
                    if (sums[i] > 0)
                      Expanded(
                        flex: sums[i],
                        child: ColoredBox(color: _swatch(context, i)),
                      ),
                ],
              ),
            ),
          ),
        if (accounts.isEmpty)
          Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              children: [
                Text('Nenhuma conta ainda.', style: TextStyle(color: hint)),
                const SizedBox(height: 12),
                OutlinedButton(onPressed: () => _new(context), child: const Text('Nova conta')),
              ],
            ),
          ),
        for (var i = 0; i < _groups.length; i++)
          if (accounts.any((a) => _groups[i].$2.contains(a.type))) ...[
            SectionHead(_groups[i].$1, trailing: money(sums[i])),
            for (final a
                in accounts.where((a) => _groups[i].$2.contains(a.type)).toList()
                  ..sort((x, y) => y.balance.compareTo(x.balance))) ...[_AccountRow(a), const Divider(height: 1)],
          ],
      ],
    );
  }
}

class _AccountRow extends StatelessWidget {
  const _AccountRow(this.a);

  final Account a;

  Future<void> _actions(BuildContext context) async {
    final action = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: Text(a.name, style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: const Text('Editar'),
              onTap: () => Navigator.pop(context, 'edit'),
            ),
            ListTile(
              leading: const Icon(Icons.tune),
              title: const Text('Ajustar saldo'),
              subtitle: const Text('Igualar ao saldo do app do banco'),
              onTap: () => Navigator.pop(context, 'reconcile'),
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline),
              title: const Text('Excluir'),
              onTap: () => Navigator.pop(context, 'delete'),
            ),
          ],
        ),
      ),
    );
    if (!context.mounted) return;
    switch (action) {
      case 'edit':
        _edit(context);
      case 'reconcile':
        _reconcile(context);
      case 'delete':
        final ok = await confirm(
          context,
          'Excluir ${a.name}?',
          body: 'Os lançamentos da conta continuam no histórico.',
        );
        if (!ok) return;
        try {
          await api.deleteAccount(a.id);
          await store.changed();
        } catch (e) {
          if (context.mounted) showError(context, e);
        }
    }
  }

  void _edit(BuildContext context) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => AccountFormPage(account: a), fullscreenDialog: true));

  // Ajusta a base (saldo inicial) pela diferença, para o saldo calculado bater com o real.
  Future<void> _reconcile(BuildContext context) async {
    final controller = TextEditingController(text: (a.balance < 0 ? '-' : '') + centsText(a.balance.abs()));
    final target = await showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Ajustar saldo · ${a.name}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Informe o saldo que aparece no app do banco.'),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              autofocus: true,
              keyboardType: const TextInputType.numberWithOptions(signed: true),
              inputFormatters: [MoneyFormatter(allowNegative: true)],
              decoration: const InputDecoration(prefixText: 'R\$ '),
              style: const TextStyle(fontFeatures: tabular),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.pop(context, parseCents(controller.text)),
            child: const Text('Ajustar'),
          ),
        ],
      ),
    );
    if (target == null || target == a.balance) return;
    try {
      await api.saveAccount(a.id, {'initialBalance': (a.initialBalance + target - a.balance) / 100});
      await store.changed();
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hint = Theme.of(context).hintColor;
    final card = store.cardOf(a.id);
    final meta = [
      if (a.bankName.isNotEmpty) a.bankName,
      a.type.label,
      if (a.holderDocument.isNotEmpty) maskDocument(a.holderDocument, a.holderDocumentType),
    ].join(' · ');
    return InkWell(
      onTap: () => _edit(context),
      onLongPress: () => _actions(context),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 4, 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(a.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  Text(meta, style: TextStyle(fontSize: 12, color: hint)),
                  if (card != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Cartão: usado ${money(card.used)}${card.limit > 0 ? ' de ${money(card.limit)}' : ''}\n'
                        'fecha dia ${card.closingDay} · vence dia ${card.dueDay}',
                        style: TextStyle(fontSize: 12, color: hint, fontFeatures: tabular),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              money(a.balance),
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: a.balance < 0 ? negative(context) : null,
                fontFeatures: tabular,
              ),
            ),
            IconButton(
              tooltip: 'Opções',
              icon: Icon(Icons.more_vert, color: hint),
              onPressed: () => _actions(context),
            ),
          ],
        ),
      ),
    );
  }
}
