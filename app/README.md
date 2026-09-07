# App Pagah

App fintech para gestores de afiliados. Dashboard de vendas, carteira, antecipações e métricas de UTM.

---

## Sumário

- [Guia Completo de Configuração](#guia-completo-de-configuração)
- [Setup Inicial](#0-setup-inicial)
- [Desenvolvimento Local com Metro (Fast Refresh)](#1-desenvolvimento-local-com-metro)
- [Build Nativo (APK/IPA)](#2-build-nativo)
- [Makefile — Comandos Rápidos](#3-makefile)
- [Deploy (Play Store / App Store)](#4-deploy)
- [Solução de Problemas](#5-solução-de-problemas)

---

## Guia Completo de Configuração

Três documentos auxiliares com toda a documentação necessária:

| Guia | Conteúdo |
|------|----------|
| [📖 .github/SETUP.md](SETUP.md) | Configuração completa do Expo — `app.json`, `eas.json`, plugins, variáveis de ambiente, EAS, e setup para novo dev |
| [📖 .github/DEPLOY.md](DEPLOY.md) | Passo a passo para Google Play e Apple Store — primeira vez e novas versões |
| [📖 .github/SECRETS.md](SECRETS.md) | Secrets necessários para CI/CD — `EXPO_TOKEN`, `APP_STORE_API_KEY_BASE64` |

---

## 0. Setup Inicial

### 0.1. Prerequisitos

- **Node.js** >= 22
- **pnpm** >= 11.3.0 (`npm install -g pnpm`)
- **Git**
- **Android Studio** (para ferramentas Android SDK)
- **Celular Android** com **Depuração USB** habilitada

### 0.2. Clone e ambiente

```bash
git clone <repo>
cd app
cp .env.example .env   # edite com a URL da API
```

A variável `EXPO_PUBLIC_API_URL` é obrigatória e lida pelo Expo em tempo de build.

### 0.3. Dependências

```bash
pnpm install
```

### 0.4. Acesso ao EAS

```bash
npx expo login           # login com sua conta Expo
eas project:info         # verificar acesso ao projeto
```

Peça para ser adicionado ao projeto **@app-pagah/pagah-mobile** no [expo.dev](https://expo.dev).

### 0.5. Android — ferramentas de plataforma

Você precisa do `adb` para conectar o celular via USB.

**Linux:**
```bash
sudo apt install android-tools-adb
```

**macOS:**
```bash
brew install android-platform-tools
```

**Verificar conexão:**
```bash
adb devices
# Seu dispositivo deve aparecer na lista
```

No celular, habilite **Opções de Desenvolvedor** → **Depuração USB**.

---

## 1. Desenvolvimento Local com Metro

Essa é a forma mais rápida de desenvolver. As alterações no código refletem em tempo real no celular.

### 1.1. Iniciar

```bash
make start
```

Isso roda `pnpm exec expo start -c` (limpa o cache e sobe o Metro).

### 1.2. Conectar o celular

- **USB:** aperte `a` no terminal para abrir no Android conectado via ADB.
- **QR Code:** instale o app **Expo Go** no celular e escaneie o QR code do terminal.

### 1.3. Se o celular não conectar

O túnel ADB pode precisar ser configurado:

```bash
make reverse
# ou manualmente: adb reverse tcp:8081 tcp:8081
```

Depois aperte `r` no terminal do Metro para recarregar.

---

## 2. Build Nativo

Para testar o app exatamente como ele vai rodar em produção (sem Metro, como um APK instalado).

### 2.1. Gerar e instalar APK

```bash
make install
```

Isso gera um APK de staging localmente e instala no celular conectado.

> O primeiro build pode demorar alguns minutos. Os seguintes são mais rápidos por causa do cache.

### 2.2. Gerar e já abrir o app

```bash
make run
```

Faz o build, instala e abre o app automaticamente.

---

## 3. Makefile

Um `Makefile` está disponível na raiz do projeto com comandos simplificados.

| Comando | Descrição |
|---|---|
| `make start` | Sobe Metro bundler com cache limpo |
| `make reverse` | Túnel ADB (porta 8081) |
| `make deps` | Instala dependências |
| `make lint` | Verificação de tipos TypeScript |
| `make build` | Gera APK de staging na nuvem (EAS) |
| `make build-apk` | Gera APK de staging localmente |
| `make install` | Build local + instala via ADB |
| `make run` | Build + instala + abre o app |
| `make clean-cache` | Limpa caches do Metro / Expo |
| `make clean` | Remove APK gerado |
| `make clean-all` | Remove node_modules + caches + APK |
| `make submit-android` | Submete para Play Store |
| `make submit-ios` | Submete para App Store |

Para ver a lista completa com descrições:

```bash
make help
```

---

## 4. Deploy

### 4.1. Build de produção

Gera o bundle que será enviado para a loja.

**Android (AAB):**
```bash
pnpm exec eas build --platform android --profile production
```

**iOS (IPA):**
```bash
pnpm exec eas build --platform ios --profile production
```

### 4.2. Submissão para as lojas

**Android (Play Store):**
```bash
make submit-android
```

**iOS (App Store):**
```bash
make submit-ios
```

> Para iOS é necessário ter uma **App Store Connect API Key** configurada e o arquivo `AuthKey_*.p8` na raiz do projeto.

Para o passo a passo completo das lojas, veja [.github/DEPLOY.md](DEPLOY.md).

---

## 5. Solução de Problemas

| Problema | Solução |
|---|---|
| `fetch failed` ao conectar | `make reverse` e recarregue (`r`) |
| `ExpoSecureStore... not a function` | `make start` (com `-c` já incluso) |
| `Cannot find module 'babel-preset-expo'` | `pnpm install` |
| `Google Service Account... non-interactive` | Já corrigido no `eas.json` |
| `ascAppId should consist only of digits` | Já corrigido no `eas.json` |
| Build muito lento | Use `make start` em vez de `make install` para alterações rápidas |

Para dúvidas sobre configuração Expo, veja [.github/SETUP.md](SETUP.md).

---

<p align="center">
  <img src="https://static.wikia.nocookie.net/fallout/images/e/ec/Fo4_Hacker.png/revision/latest?cb=20170320162306" alt="Hacker Fallout" width="200">
</p>