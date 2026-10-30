import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../store.dart';
import '../ui.dart';
import 'entry.dart';

enum _Filter { all, income, expense }

/// Lançamentos do mês, só nos dias que têm algum, com o saldo acumulado no fim de cada dia.
class TransactionsPage extends StatefulWidget {
  const TransactionsPage({super.key});

  @override
  State<TransactionsPage> createState() => TransactionsPageState();
}

class TransactionsPageState extends State<TransactionsPage> {
  var _month = DateTime(DateTime.now().year, DateTime.now().month);
  var _filter = _Filter.all;
  List<Transaction>? _items;
  int _opening = 0; // saldo de todos os lançamentos antes do mês
  Object? _error;
  int _generation = 0; // descarta respostas de um mês que já não está na tela
  int _revision = store.revision;

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
    final gen = ++_generation;
    final last = DateTime(_month.year, _month.month + 1, 0);
    final before = DateTime(_month.year, _month.month, 0);
    setState(() => _error = null);
    try {
      final r = await Future.wait([
        api.transactions(ymd(_month), ymd(last)),
        api.transactions('1970-01-01', ymd(before)),
      ]);
      if (gen != _generation || !mounted) return;
      setState(() {
        _items = r[0];
        _opening = r[1].where((t) => !t.canceled).fold(0, (sum, t) => sum + t.signed);
      });
    } catch (e) {
      if (gen != _generation || !mounted) return;
      setState(() => _error = e);
    }
  }

  void _go(int delta) {
    setState(() {
      _month = DateTime(_month.year, _month.month + delta);
      _items = null;
    });
    _load();
  }

  void goToday() {
    final now = DateTime.now();
    if (_month.year == now.year && _month.month == now.month) return;
    _go((now.year - _month.year) * 12 + now.month - _month.month);
  }

  bool get _isCurrentMonth => _month.year == DateTime.now().year && _month.month == DateTime.now().month;

  Future<void> _new() async {
    // No mês atual o lançamento nasce hoje; em outro mês, no dia 1 dele.
    final date = _isCurrentMonth ? today() : ymd(_month);
    await Navigator.push(context, MaterialPageRoute(builder: (_) => EntryPage(date: date), fullscreenDialog: true));
  }

  bool _visible(Transaction t) => switch (_filter) {
    _Filter.all => true,
    _Filter.income => t.income,
    _Filter.expense => !t.income,
  };

  @override
  Widget build(BuildContext context) {
    final hint = Theme.of(context).hintColor;
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 4,
        title: Row(
          children: [
            IconButton(tooltip: 'Mês anterior', icon: const Icon(Icons.chevron_left), onPressed: () => _go(-1)),
            Flexible(
              child: GestureDetector(
                onTap: goToday,
                child: Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(text: monthNames[_month.month - 1]),
                      TextSpan(
                        text: ' ${_month.year}',
                        style: TextStyle(color: hint, fontWeight: FontWeight.w400),
                      ),
                    ],
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            IconButton(tooltip: 'Próximo mês', icon: const Icon(Icons.chevron_right), onPressed: () => _go(1)),
          ],
        ),
        actions: [
          if (!_isCurrentMonth) TextButton(onPressed: goToday, child: const Text('Hoje')),
          PopupMenuButton<_Filter>(
            tooltip: 'Filtrar',
            icon: Icon(_filter == _Filter.all ? Icons.filter_list : Icons.filter_list_alt),
            initialValue: _filter,
            onSelected: (f) => setState(() => _filter = f),
            itemBuilder: (_) => const [
              PopupMenuItem(value: _Filter.all, child: Text('Todos')),
              PopupMenuItem(value: _Filter.income, child: Text('Entradas')),
              PopupMenuItem(value: _Filter.expense, child: Text('Saídas')),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        tooltip: 'Novo lançamento',
        onPressed: _new,
        child: const Icon(Icons.add),
      ),
      body: GestureDetector(
        // Arrastar para o lado troca de mês, como no web.
        onHorizontalDragEnd: (d) {
          final v = d.primaryVelocity ?? 0;
          if (v.abs() > 300) _go(v < 0 ? 1 : -1);
        },
        child: _body(),
      ),
    );
  }

  Widget _body() {
    final items = _items;
    if (items == null) {
      return _error != null ? ErrorRetry(_error!, onRetry: _load) : const Center(child: CircularProgressIndicator());
    }

    // Agrupa por dia; o saldo acumula todos os lançamentos, o filtro só esconde linhas.
    final byDay = <String, List<Transaction>>{};
    for (final t in items) {
      if (!t.canceled) byDay.putIfAbsent(t.date, () => []).add(t);
    }
    final days = byDay.keys.toList()..sort();
    final groups = <_Day>[];
    var running = _opening;
    for (final d in days) {
      final txs = byDay[d]!;
      final net = txs.fold(0, (sum, t) => sum + t.signed);
      running += net;
      final visible = txs.where(_visible).toList();
      if (visible.isNotEmpty) groups.add(_Day(d, visible, net, running));
    }

    final categories = <String, String>{};
    void index(List<Category> list) {
      for (final c in list) {
        categories[c.id] = c.name;
        index(c.children);
      }
    }

    index(store.categories);

    return RefreshIndicator(
      onRefresh: () => Future.wait([_load(), store.refresh()]),
      child: groups.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(32, 96, 32, 16),
                  child: Text(
                    'Nenhum lançamento em ${monthNames[_month.month - 1].toLowerCase()}.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Theme.of(context).hintColor),
                  ),
                ),
                Center(
                  child: OutlinedButton(onPressed: _new, child: const Text('Novo lançamento')),
                ),
              ],
            )
          : ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 96),
              itemCount: groups.length,
              itemBuilder: (_, i) => _DayGroup(day: groups[i], categories: categories),
            ),
    );
  }
}

class _Day {
  _Day(this.date, this.transactions, this.net, this.balance);
  final String date;
  final List<Transaction> transactions;
  final int net;
  final int balance;
}

class _DayGroup extends StatelessWidget {
  const _DayGroup({required this.day, required this.categories});

  final _Day day;
  final Map<String, String> categories;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hint = theme.hintColor;
    final date = parseYmd(day.date);
    final isToday = day.date == today();
    TextStyle total(int v) =>
        TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: amountColor(context, v), fontFeatures: tabular);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          color: theme.colorScheme.surfaceContainerHighest,
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${date.day}',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, height: 1, fontFeatures: tabular),
              ),
              const SizedBox(width: 8),
              Text(
                isToday ? 'hoje' : weekdayNames[date.weekday - 1],
                style: TextStyle(
                  fontSize: 13,
                  color: isToday ? theme.colorScheme.onSurface : hint,
                  fontWeight: isToday ? FontWeight.w700 : null,
                ),
              ),
              const Spacer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: 'Saldo ',
                          style: TextStyle(fontSize: 12, color: hint),
                        ),
                        TextSpan(text: signedMoney(day.balance), style: total(day.balance)),
                      ],
                    ),
                  ),
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: 'Dia ',
                          style: TextStyle(fontSize: 12, color: hint),
                        ),
                        TextSpan(text: signedMoney(day.net), style: total(day.net)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        for (final t in day.transactions) ...[_TxRow(t, category: categories[t.categoryId]), const Divider(height: 1)],
      ],
    );
  }
}

class _TxRow extends StatelessWidget {
  const _TxRow(this.t, {this.category});

  final Transaction t;
  final String? category;

  @override
  Widget build(BuildContext context) {
    final hint = Theme.of(context).hintColor;
    final title = category ?? (t.description.isNotEmpty ? t.description : t.kind.label);
    final account = store.account(t.accountId)?.name;
    final subtitle = [if (category != null && t.description.isNotEmpty) t.description, ?account].join(' · ');
    return InkWell(
      onTap: () =>
          Navigator.push(context, MaterialPageRoute(builder: (_) => EntryPage(edit: t), fullscreenDialog: true)),
      onLongPress: () => deleteTransaction(context, t),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            KindTag(t.kind),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(title, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 15)),
                      ),
                      if (t.isInvoicePayment) const Tag('fatura'),
                      if (t.isRecurring) const Tag('mensal'),
                      if (t.pending) const Tag('pendente'),
                    ],
                  ),
                  if (subtitle.isNotEmpty)
                    Text(
                      subtitle,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: hint),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              t.income ? '+${money(t.amount)}' : money(t.amount),
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: t.income ? positive(context) : null,
                fontFeatures: tabular,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
