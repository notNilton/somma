import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../store.dart';
import '../ui.dart';

/// Projeção do mês corrente: o ritmo de gasto usa os dias já passados e projeta os que faltam.
class ProjectionsPage extends StatefulWidget {
  const ProjectionsPage({super.key});

  @override
  State<ProjectionsPage> createState() => _ProjectionsPageState();
}

class _ProjectionsPageState extends State<ProjectionsPage> {
  List<Transaction>? _items;
  Object? _error;
  int _revision = store.revision;
  final _simAmount = TextEditingController();
  int _simInstallments = 1;

  @override
  void initState() {
    super.initState();
    store.addListener(_storeChanged);
    _load();
  }

  @override
  void dispose() {
    store.removeListener(_storeChanged);
    super.dispose();
  }

  void _storeChanged() {
    if (store.revision == _revision) return;
    _revision = store.revision;
    _load();
  }

  Future<void> _load() async {
    final now = DateTime.now();
    try {
      final items = await api.transactions(
        ymd(DateTime(now.year, now.month)),
        ymd(DateTime(now.year, now.month + 1, 0)),
      );
      if (!mounted) return;
      setState(() {
        _items = items;
        _error = null;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Projeções')),
      body: ListenableBuilder(
        listenable: store,
        builder: (context, _) {
          if (_items == null) {
            return _error != null
                ? ErrorRetry(_error!, onRetry: _load)
                : const Center(child: CircularProgressIndicator());
          }
          return RefreshIndicator(
            onRefresh: () => Future.wait([_load(), store.refresh()]),
            child: _list(context, _items!),
          );
        },
      ),
    );
  }

  Widget _list(BuildContext context, List<Transaction> txs) {
    final hint = Theme.of(context).hintColor;
    final now = DateTime.now();
    final currentDay = now.day;
    final remainingDays = DateTime(now.year, now.month + 1, 0).day - currentDay;
    final todayStr = today();

    // Ritmo de gasto: despesas do mês até hoje, por dia já passado. Pagamento de fatura não conta
    // (as compras no crédito já contaram).
    final spentSoFar = txs
        .where((t) => !t.income && !t.canceled && !t.isInvoicePayment && t.date.compareTo(todayStr) <= 0)
        .fold(0, (sum, t) => sum + t.amount);
    final dailyBurn = spentSoFar ~/ currentDay;

    final cash = store.total;
    final endOfMonth = cash - dailyBurn * remainingDays;
    final runway = dailyBurn > 0 ? cash / (dailyBurn * 30) : null;

    final cards = store.cards;
    final totalLimit = cards.fold(0, (sum, c) => sum + c.limit);
    final totalUsed = cards.fold(0, (sum, c) => sum + c.used);

    final simTotal = parseCents(_simAmount.text);
    final simPerMonth = simTotal ~/ _simInstallments;
    final simEnd = endOfMonth - simPerMonth;

    Widget pair(Widget a, Widget b) => Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: a),
          Expanded(child: b),
        ],
      ),
    );

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 32),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
          child: Figure(
            label: 'Saldo em contas',
            value: money(cash),
            hint: '${store.accounts.length} ${store.accounts.length == 1 ? 'conta' : 'contas'}',
            big: true,
          ),
        ),
        pair(
          Figure(label: 'Gasto médio diário', value: money(dailyBurn), hint: 'nos $currentDay dias do mês'),
          Figure(
            label: 'Previsto no fim do mês',
            value: money(endOfMonth),
            hint: 'faltam $remainingDays dias',
            color: endOfMonth < 0 ? negative(context) : null,
          ),
        ),
        pair(
          Figure(
            label: 'Pista',
            value: runway == null ? '—' : '${runway.toStringAsFixed(1).replaceAll('.', ',')} meses',
            hint: 'no ritmo atual',
          ),
          Figure(label: 'Gasto no mês', value: money(spentSoFar), hint: 'até hoje'),
        ),
        if (endOfMonth < 0)
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(border: Border.all(color: negative(context))),
            child: Text(
              'No ritmo atual (${money(dailyBurn)} por dia), o saldo em contas pode ficar negativo em '
              '${money(endOfMonth.abs())} antes do fim do mês.',
              style: TextStyle(color: negative(context)),
            ),
          ),
        SectionHead(
          'Cartões de crédito',
          trailing: cards.isEmpty ? null : '${money(totalUsed)}${totalLimit > 0 ? ' de ${money(totalLimit)}' : ''}',
        ),
        if (cards.isEmpty)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Nenhum cartão em uso. O cartão de uma conta aparece aqui depois da primeira compra no crédito.',
              style: TextStyle(color: hint),
            ),
          ),
        for (final c in cards) ...[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        store.account(c.accountId)?.name ?? c.name,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        'Fecha dia ${c.closingDay} · vence dia ${c.dueDay}',
                        style: TextStyle(fontSize: 12, color: hint),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      money(c.used),
                      style: const TextStyle(fontWeight: FontWeight.w700, fontFeatures: tabular),
                    ),
                    Text(
                      c.limit > 0 ? 'disponível ${money(c.available)}' : 'sem limite definido',
                      style: TextStyle(fontSize: 12, color: hint, fontFeatures: tabular),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (c.limit > 0)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: LinearProgressIndicator(
                value: (c.used / c.limit).clamp(0, 1).toDouble(),
                minHeight: 4,
                borderRadius: BorderRadius.zero,
                color: c.used > c.limit ? negative(context) : Theme.of(context).colorScheme.onSurface,
                backgroundColor: Theme.of(context).dividerColor,
              ),
            ),
          const Divider(height: 1),
        ],
        const SectionHead('Simular uma compra'),
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Veja como uma compra afetaria o saldo previsto para o fim do mês.', style: TextStyle(color: hint)),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 3,
                    child: Field(
                      'Valor total',
                      TextField(
                        controller: _simAmount,
                        keyboardType: TextInputType.number,
                        inputFormatters: [MoneyFormatter()],
                        onChanged: (_) => setState(() {}),
                        decoration: const InputDecoration(prefixText: 'R\$ ', hintText: '0,00'),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: Field(
                      'Parcelas',
                      DropdownButtonFormField<int>(
                        initialValue: _simInstallments,
                        isExpanded: true,
                        items: [
                          for (var n = 1; n <= 24; n++)
                            DropdownMenuItem(value: n, child: Text(n == 1 ? 'À vista' : '${n}x')),
                        ],
                        onChanged: (v) => setState(() => _simInstallments = v ?? 1),
                      ),
                    ),
                  ),
                ],
              ),
              if (simTotal > 0)
                Row(
                  children: [
                    Expanded(
                      child: Figure(label: 'Por mês', value: money(simPerMonth)),
                    ),
                    Expanded(
                      child: Figure(
                        label: 'Fim do mês com a compra',
                        value: money(simEnd),
                        color: simEnd < 0 ? negative(context) : null,
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ],
    );
  }
}
