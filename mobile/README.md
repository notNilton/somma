# Somma — app mobile

App Flutter (Android e iOS) para a mesma API Go do Somma (`backend/`, rotas `/api/v1`). Não exige
mudanças no backend: o login devolve um JWT no corpo, que o app guarda e manda em
`Authorization: Bearer` (o web usa o cookie `somma_session`).

Substitui o app Expo de `app/`.

## Telas

- Login e cadastro, com o endereço do servidor configurável (em "Servidor")
- Lançamentos do mês: só os dias com lançamento, saldo acumulado e total do dia; setas ou arrastar
  para o lado troca de mês, tocar no mês (ou na aba de novo) volta para hoje; filtro de entradas e saídas
- Tocar num lançamento edita; segurar exclui (na recorrência: só este ou este e os próximos)
- Novo lançamento: Renda, Débito, Crédito, Poupança e Orçamento; crédito escolhe a conta do cartão
  e pode ser parcelado; "Repetir todo mês" com data final opcional
- Pagar fatura: escolhe o cartão, a conta que paga, valor (sugere o usado) e data
- Contas: patrimônio, distribuição por tipo, contas agrupadas com o cartão de cada uma; cadastro e
  edição com banco, titular, CPF/CNPJ e cartão (limite, fechamento, vencimento); ajustar saldo; excluir
- Projeções do mês corrente: gasto médio, previsto no fim do mês, pista, cartões e simulador de compra
- Tema claro e escuro conforme o sistema

Transferência entre contas ainda não existe no backend (`POST /api/v1/transfers`); quando existir,
entra como terceira aba em `pages/entry.dart`.

## Rodar

Com o backend no ar (`make up` na raiz, porta 3300):

```bash
cd mobile
flutter pub get
flutter run                                                  # emulador Android: usa http://10.0.2.2:3300
flutter run --dart-define=API_URL=http://192.168.0.10:3300   # aparelho físico: IP da máquina na rede
flutter run --dart-define=API_URL=https://somma.nilbyte.com.br   # produção
```

No simulador iOS o padrão é `http://localhost:3300`. O endereço também pode ser trocado na tela de login.

### Release (Android)

```bash
flutter build apk --release --split-per-abi --obfuscate --split-debug-info=build/symbols \
  --dart-define=API_URL=https://somma.nilbyte.com.br
~/Android/Sdk/platform-tools/adb install -r build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
```

Para a Play Store, troque `apk --split-per-abi` por `appbundle`. iOS: `flutter build ipa` (precisa de Mac).

A assinatura do release vem de `android/key.properties` + `android/app/upload-keystore.jks`, que
ficam fora do git. **Guarde os dois num lugar seguro**: sem eles não dá para atualizar o app já
instalado (só desinstalando) nem publicar atualizações na loja. Sem `key.properties`, o release sai
com a chave de debug.

O ícone (S branco + quadrado verde sobre preto) está em `android/app/src/main/res/mipmap-*`
(adaptativo, com versão monocromática para ícones temáticos), no `AppIcon.appiconset` do iOS e em `web/icons`.

### HTTP sem TLS

O servidor de desenvolvimento fala HTTP, então o app libera tráfego sem criptografia:
`android:usesCleartextTraffic` no `AndroidManifest.xml` e `NSAllowsArbitraryLoads` no `Info.plist`.
Em produção, sirva a API por HTTPS e remova as duas exceções.

## Código

| Arquivo | O quê |
|---|---|
| `lib/api.dart` | Cliente HTTP, token, rotas da API |
| `lib/models.dart` | Modelos dos JSON da API (dinheiro em centavos) |
| `lib/session.dart` | Usuário logado |
| `lib/store.dart` | Contas, cartões e categorias compartilhados; `changed()` depois de gravar recarrega as telas |
| `lib/ui.dart` | Dinheiro, datas, cores, bancos/CPF/CNPJ, campos e widgets comuns |
| `lib/pages/` | Telas |

Visual: o mesmo do web — reto, neutro, sem cantos arredondados, sombras ou gradientes; cor só nos
valores (entrada/saída) e nos tipos de lançamento. O tema fica em `lib/main.dart`.
