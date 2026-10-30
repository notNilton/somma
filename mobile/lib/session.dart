import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';
import 'models.dart';
import 'store.dart';

/// Usuário logado. Não há /me na API: nome e e-mail vêm do login e ficam guardados.
class Session extends ChangeNotifier {
  Session._();
  static final instance = Session._();

  static const _nameKey = 'user_name';
  static const _emailKey = 'user_email';

  bool ready = false;
  User? me;

  Future<void> start() async {
    await api.load();
    api.onUnauthorized = _signedOut;
    if (api.hasSession) {
      final prefs = await SharedPreferences.getInstance();
      me = User(prefs.getString(_nameKey) ?? '', prefs.getString(_emailKey) ?? '');
      store.refresh();
    }
    ready = true;
    notifyListeners();
  }

  Future<void> login(String email, String password) async => _signedIn(await api.login(email, password));

  Future<void> register(String name, String email, String password) async =>
      _signedIn(await api.register(name, email, password));

  Future<void> logout() async {
    try {
      await api.logout();
    } catch (_) {}
    _signedOut();
  }

  Future<void> _signedIn(User user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_nameKey, user.name);
    await prefs.setString(_emailKey, user.email);
    me = user;
    store.refresh();
    notifyListeners();
  }

  void _signedOut() {
    if (me == null) return;
    me = null;
    store.clear();
    notifyListeners();
  }
}

final session = Session.instance;
