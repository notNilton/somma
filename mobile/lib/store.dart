import 'package:flutter/widgets.dart';

import 'api.dart';
import 'models.dart';

/// Contas, cartões e categorias, usados por quase todas as telas. Depois de gravar
/// qualquer coisa, chame [changed]: recarrega tudo e avisa as listas de lançamentos.
class Store extends ChangeNotifier {
  Store._();
  static final instance = Store._();

  List<Account> accounts = [];
  List<CreditCard> cards = [];
  List<Category> categories = [];
  bool loaded = false;
  Object? error;

  /// Muda a cada gravação; as telas de lançamentos recarregam quando ele muda.
  int revision = 0;

  Future<void> refresh() async {
    try {
      final r = await Future.wait([api.accounts(), api.cards(), api.categories()]);
      accounts = r[0] as List<Account>;
      cards = r[1] as List<CreditCard>;
      categories = r[2] as List<Category>;
      error = null;
    } catch (e) {
      error = e;
    }
    loaded = true;
    notifyListeners();
  }

  Future<void> changed() {
    revision++;
    return refresh();
  }

  void clear() {
    accounts = [];
    cards = [];
    categories = [];
    loaded = false;
    error = null;
  }

  Account? account(String? id) => accounts.where((a) => a.id == id).firstOrNull;

  CreditCard? cardOf(String accountId) => cards.where((c) => c.accountId == accountId).firstOrNull;

  int get total => accounts.fold(0, (sum, a) => sum + a.balance);
}

final store = Store.instance;
