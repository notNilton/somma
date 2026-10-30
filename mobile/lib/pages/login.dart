import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../api.dart';
import '../session.dart';
import '../ui.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _server = TextEditingController(text: api.server);
  bool _register = false;
  bool _busy = false;

  Future<void> _submit() async {
    final email = _email.text.trim().toLowerCase();
    if (_register && _name.text.trim().length < 2) return showError(context, ApiError(0, 'Informe seu nome'));
    if (!email.contains('@')) return showError(context, ApiError(0, 'E-mail inválido'));
    if (_password.text.length < 6) return showError(context, ApiError(0, 'A senha deve ter no mínimo 6 caracteres'));
    setState(() => _busy = true);
    try {
      if (!kIsWeb) await api.setServer(_server.text);
      if (_register) {
        await session.register(_name.text.trim(), email, _password.text);
      } else {
        await session.login(email, _password.text);
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hint = Theme.of(context).hintColor;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: AutofillGroup(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'Somma',
                      style: TextStyle(fontSize: 40, fontWeight: FontWeight.w800, letterSpacing: -1.5),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _register ? 'Crie sua conta para organizar suas finanças.' : 'Entre para ver suas finanças.',
                      style: TextStyle(color: hint),
                    ),
                    const SizedBox(height: 32),
                    if (_register) ...[
                      TextField(
                        controller: _name,
                        decoration: const InputDecoration(hintText: 'Nome'),
                        textInputAction: TextInputAction.next,
                        textCapitalization: TextCapitalization.words,
                        autofillHints: const [AutofillHints.name],
                      ),
                      const SizedBox(height: 8),
                    ],
                    TextField(
                      controller: _email,
                      decoration: const InputDecoration(hintText: 'E-mail'),
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      autocorrect: false,
                      autofillHints: const [AutofillHints.email],
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _password,
                      decoration: const InputDecoration(hintText: 'Senha'),
                      obscureText: true,
                      onSubmitted: (_) => _submit(),
                      autofillHints: [_register ? AutofillHints.newPassword : AutofillHints.password],
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: _busy ? null : _submit,
                      child: _busy
                          ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : Text(_register ? 'Cadastrar' : 'Entrar'),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(_register ? 'Já tem uma conta?' : 'Não tem uma conta?'),
                        TextButton(
                          onPressed: () => setState(() => _register = !_register),
                          child: Text(
                            _register ? 'Entrar' : 'Cadastre-se',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                    if (!kIsWeb)
                      ExpansionTile(
                        title: Text('Servidor', style: TextStyle(color: hint, fontSize: 14)),
                        tilePadding: EdgeInsets.zero,
                        shape: const Border(),
                        collapsedShape: const Border(),
                        children: [
                          TextField(
                            controller: _server,
                            keyboardType: TextInputType.url,
                            autocorrect: false,
                            decoration: const InputDecoration(hintText: 'http://192.168.0.10:3300'),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
