import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart' hide Category;
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';

class ApiError implements Exception {
  ApiError(this.status, this.message);
  final int status;
  final String message;

  @override
  String toString() => message;
}

/// Servidor padrão: --dart-define=API_URL=http://192.168.0.10:3300 para um aparelho de verdade.
/// No emulador Android, 10.0.2.2 é o localhost da máquina; no web, a mesma origem.
String get defaultServer {
  const fromEnv = String.fromEnvironment('API_URL');
  if (fromEnv.isNotEmpty) return fromEnv;
  if (kIsWeb) return '';
  return defaultTargetPlatform == TargetPlatform.android ? 'http://10.0.2.2:3300' : 'http://localhost:3300';
}

/// Cliente da API do Somma. O login devolve um JWT no corpo; guardamos e mandamos em
/// `Authorization: Bearer` (o web usa o cookie `somma_session`, que aqui não precisamos).
class Api {
  Api._();
  static final instance = Api._();

  static const _serverKey = 'server';
  static const _tokenKey = 'token';

  final _client = http.Client();
  String server = '';
  String? _token;

  /// Chamado quando a API responde 401 (sessão expirada).
  VoidCallback? onUnauthorized;

  bool get hasSession => _token != null;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    server = prefs.getString(_serverKey) ?? defaultServer;
    _token = prefs.getString(_tokenKey);
  }

  Future<void> setServer(String value) async {
    server = value.trim().replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_serverKey, server);
  }

  Future<void> _setToken(String? token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove(_tokenKey);
    } else {
      await prefs.setString(_tokenKey, token);
    }
  }

  Future<dynamic> _json(String method, String path, [Object? body]) async {
    final req = http.Request(method, Uri.parse('$server/api$path'));
    if (_token != null) req.headers['Authorization'] = 'Bearer $_token';
    if (body != null) {
      req.headers['Content-Type'] = 'application/json';
      req.body = jsonEncode(body);
    }
    final http.Response res;
    try {
      res = await http.Response.fromStream(await _client.send(req).timeout(const Duration(seconds: 30)));
    } on TimeoutException {
      throw ApiError(0, 'O servidor demorou para responder');
    } catch (_) {
      throw ApiError(0, 'Sem conexão com o servidor');
    }
    if (res.statusCode == 204) return null;
    dynamic data;
    try {
      data = jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {}
    if (res.statusCode >= 400) {
      if (res.statusCode == 401 && !path.startsWith('/auth/')) onUnauthorized?.call();
      final msg = data is Map && data['error'] is String ? data['error'] as String : 'Erro ${res.statusCode}';
      throw ApiError(res.statusCode, _translate(msg));
    }
    return data;
  }

  Future<dynamic> get(String path) => _json('GET', path);
  Future<dynamic> post(String path, [Object? body]) => _json('POST', path, body ?? const {});
  Future<dynamic> patch(String path, Object body) => _json('PATCH', path, body);
  Future<dynamic> put(String path, Object body) => _json('PUT', path, body);
  Future<dynamic> delete(String path) => _json('DELETE', path);

  // Autenticação

  Future<User> login(String email, String password) => _auth('/auth/login', {'email': email, 'password': password});

  Future<User> register(String name, String email, String password) =>
      _auth('/auth/register', {'name': name, 'email': email, 'password': password});

  Future<User> _auth(String path, Map<String, String> body) async {
    final data = await post(path, body) as Map<String, dynamic>;
    await _setToken(data['token'] as String);
    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<void> logout() async {
    try {
      await post('/auth/logout');
    } finally {
      await _setToken(null);
    }
  }

  // Contas e cartões

  Future<List<Account>> accounts() async => [for (final a in await get('/v1/accounts') as List) Account.fromJson(a)];

  Future<List<CreditCard>> cards() async => [for (final c in await get('/v1/cards') as List) CreditCard.fromJson(c)];

  Future<List<Category>> categories() async => [
    for (final c in await get('/v1/categories') as List) Category.fromJson(c),
  ];

  Future<Account> saveAccount(String? id, Map<String, dynamic> body) async => Account.fromJson(
    id == null ? await post('/v1/accounts', body) : await patch('/v1/accounts/${Uri.encodeComponent(id)}', body),
  );

  Future<void> deleteAccount(String id) => delete('/v1/accounts/${Uri.encodeComponent(id)}');

  /// Configura (e cria, se preciso) o cartão de crédito da conta.
  Future<void> saveCard(String accountId, {required int limitCents, required int closingDay, required int dueDay}) =>
      put('/v1/accounts/${Uri.encodeComponent(accountId)}/card', {
        'creditLimit': limitCents / 100,
        'closingDay': closingDay,
        'dueDay': dueDay,
      });

  /// Pagamento da fatura do cartão da conta; o dinheiro sai de [fromAccountId].
  Future<void> payCard(
    String cardAccountId, {
    required int cents,
    required String date,
    required String fromAccountId,
  }) => post('/v1/accounts/${Uri.encodeComponent(cardAccountId)}/card/payments', {
    'amount': cents / 100,
    'date': date,
    'fromAccountId': fromAccountId,
  });

  // Lançamentos

  /// Lançamentos de [from] até [to] (YYYY-MM-DD, inclusivo).
  Future<List<Transaction>> transactions(String from, String to) async {
    final data = await get('/v1/transactions?from=$from&to=$to');
    return [for (final t in data['items'] as List) Transaction.fromJson(t)];
  }

  Future<void> saveTransaction(String? id, Map<String, dynamic> body) =>
      id == null ? post('/v1/transactions', body) : patch('/v1/transactions/${Uri.encodeComponent(id)}', body);

  /// [following] numa recorrência exclui esta ocorrência e as próximas.
  Future<void> deleteTransaction(String id, {bool following = false}) =>
      delete('/v1/transactions/${Uri.encodeComponent(id)}${following ? '?scope=following' : ''}');
}

// Algumas mensagens da API ainda vêm em inglês.
String _translate(String msg) => switch (msg) {
  'invalid email or password' => 'E-mail ou senha incorretos',
  'email already registered or invalid data' => 'E-mail já cadastrado',
  'name, email and password are required' => 'Preencha nome, e-mail e senha',
  'email and password are required' => 'Preencha e-mail e senha',
  'account not found' => 'Conta não encontrada',
  'transaction not found' => 'Lançamento não encontrado',
  _ => msg,
};

final api = Api.instance;
