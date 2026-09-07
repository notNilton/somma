.PHONY: help start deps lint typecheck test test-watch test-coverage test-verbose \
        clean-cache clean clean-all \
        reverse build-apk install run \
        build-staging-android build-staging-ios \
        release release-android release-ios \
        submit-android submit-ios login

APK_NAME := pagah.apk

# JDK 17 é necessário para o Gradle (JDK 26+ não é suportado)
JAVA_HOME := /usr/lib/jvm/java-17-openjdk
export JAVA_HOME

help:  ## Mostra todos os comandos disponíveis
	@printf "\n\033[36m┌─────────────────────────────────────────────┐\033[0m\n"
	@printf "\033[36m│        Pagah Mobile — Comandos Rápidos       │\033[0m\n"
	@printf "\033[36m└─────────────────────────────────────────────┘\033[0m\n\n"
	@printf "\033[33m═══ Desenvolvimento \033[0m\n"
	@printf "  \033[32m%-32s\033[0m %s\n" "make start"         "Sobe Metro bundler com cache limpo"
	@printf "  \033[32m%-32s\033[0m %s\n" "make reverse"       "Túnel ADB (porta 8081) para o Metro"
	@printf "  \033[32m%-32s\033[0m %s\n" "make login"         "Fazer login no EAS"
	@printf "  \033[32m%-32s\033[0m %s\n" "make deps"          "Instala dependências com pnpm"
	@printf "  \033[32m%-32s\033[0m %s\n" "make lint"          "Roda o linter TypeScript"
	@printf "  \033[32m%-32s\033[0m %s\n" "make typecheck"     "Verifica tipos (tsc --noEmit)"
	@printf "  \033[32m%-32s\033[0m %s\n" "make test"           "Roda todos os testes automatizados"
	@printf "  \033[32m%-32s\033[0m %s\n" "make test-watch"    "Modo watch (re-executa ao salvar)"
	@printf "  \033[32m%-32s\033[0m %s\n" "make test-coverage" "Com relatório de cobertura"
	@printf "  \033[32m%-32s\033[0m %s\n" "make test-verbose"  "Com saída detalhada"
	@printf "\n\033[33m═══ Staging (teste interno) \033[0m\n"
	@printf "  \033[32m%-32s\033[0m %s\n" "make build-apk"     "APK de staging (build local)"
	@printf "  \033[32m%-32s\033[0m %s\n" "make install"       "Build APK local + instala via ADB"
	@printf "  \033[32m%-32s\033[0m %s\n" "make run"           "Build APK + instala + abre o app"
	@printf "  \033[32m%-32s\033[0m %s\n" "make build-staging-android" "APK de staging (EAS cloud)"
	@printf "  \033[32m%-32s\033[0m %s\n" "make build-staging-ios"     "IPA de staging (EAS cloud)"
	@printf "\n\033[33m═══ Produção (lojas) — incrementa versão automático \033[0m\n"
	@printf "  \033[32m%-32s\033[0m %s\n" "make release"          "Build Android + iOS + submete ambos (tudo em 1)"
	@printf "  \033[32m%-32s\033[0m %s\n" "make release-android"  "Build AAB + Play Store"
	@printf "  \033[32m%-32s\033[0m %s\n" "make release-ios"      "Build IPA + App Store"
	@printf "  \033[32m%-32s\033[0m %s\n" "make submit-android"   "Só submete o último build para Play Store"
	@printf "  \033[32m%-32s\033[0m %s\n" "make submit-ios"       "Só submete o último build para App Store"
	@printf "\n\033[33m═══ Limpeza \033[0m\n"
	@printf "  \033[32m%-32s\033[0m %s\n" "make clean-cache"  "Limpa cache do Metro + Expo"
	@printf "  \033[32m%-32s\033[0m %s\n" "make clean"        "Remove APK gerado"
	@printf "  \033[32m%-32s\033[0m %s\n" "make clean-all"    "Remove node_modules + caches + APK"
	@printf "\n"

# ─── Desenvolvimento ────────────────────────────────────────────────

start:  ## Sobe o Metro dev server com cache limpo
	pnpm exec expo start -c

login:  ## Faz login no EAS
	pnpm exec eas login

reverse:  ## Faz túnel ADB para o Metro bundler
	adb reverse tcp:8081 tcp:8081
	@printf "\033[32m✓\033[0m Porta 8081 redirecionada para o dispositivo\n"

deps:  ## Instala dependências com pnpm
	pnpm install

lint:  ## Roda o linter
	pnpm exec tsc --noEmit

typecheck:  ## Verificação de tipos
	pnpm exec tsc --noEmit --pretty

# ─── Testes ────────────────────────────────────────────────────

test:  ## Roda todos os testes automatizados (jest)
	pnpm run test

test-watch:  ## Roda testes em modo watch (re-executa ao salvar)
	pnpm run test:watch

test-coverage:  ## Roda testes com relatório de cobertura
	pnpm run test -- --coverage

test-verbose:  ## Roda testes com saída detalhada (nomes dos testes)
	pnpm run test -- --verbose

# ─── Staging (teste interno) ────────────────────────────────────

build-apk:  ## APK de staging (build local — mais rápido)
	pnpm exec eas build --local --platform android --profile staging --output=$(APK_NAME)
	@printf "\033[32m✓\033[0m APK gerado: $(APK_NAME)\n"

install: build-apk  ## Build APK local + instala no celular via ADB
	adb install -r $(APK_NAME)
	@printf "\033[32m✓\033[0m App instalado com sucesso\n"

run: install  ## Build APK + instala + abre o app no celular
	adb shell monkey -p com.apppagah.pagahmobile 1
	@printf "\033[32m✓\033[0m App aberto no dispositivo\n"

build-staging-android:  ## APK de staging via EAS cloud
	pnpm exec eas build --platform android --profile staging --non-interactive

build-staging-ios:  ## IPA de staging via EAS cloud
	pnpm exec eas build --platform ios --profile staging --non-interactive

# ─── Produção (lojas) ──────────────────────────────────────────

# O eas.json já tem "autoIncrement": true no profile production,
# então versionCode (Android) e buildNumber (iOS) sobem sozinhos.

release: release-android release-ios  ## Build Android + iOS + submete ambos (tudo em 1)

release-android:  ## Build AAB + Play Store (incrementa versão automático)
	pnpm exec eas build --platform android --profile production --non-interactive --auto-submit
	@printf "\033[32m✓\033[0m Android: build + submit concluído\n"

release-ios:  ## Build IPA + App Store (incrementa versão automático)
	pnpm exec eas build --platform ios --profile production --non-interactive --auto-submit
	@printf "\033[32m✓\033[0m iOS: build + submit concluído\n"

submit-android:  ## Submete o último build para a Play Store
	pnpm exec eas submit --platform android --latest --non-interactive

submit-ios:  ## Submete o último build para a App Store
	pnpm exec eas submit --platform ios --latest --non-interactive

# ─── Limpeza ───────────────────────────────────────────────────

clean-cache:  ## Limpa caches do Metro e Expo
	@printf "Limpando caches...\n"
	rm -rf /tmp/metro-* 2>/dev/null || true
	rm -rf /tmp/haste-map-* 2>/dev/null || true
	rm -rf /tmp/expo-* 2>/dev/null || true
	@printf "\033[32m✓\033[0m Caches limpos (rode \`make start\` para reiniciar o Metro)\n"

clean:  ## Remove o APK gerado
	rm -f $(APK_NAME)
	@printf "\033[32m✓\033[0m APK removido\n"

clean-all: clean-cache clean  ## Remove node_modules, caches e APK
	@printf "Removendo node_modules...\n"
	rm -rf node_modules
	@printf "\033[32m✓\033[0m node_modules removido\n"
	@printf "\nRode \033[33mmake deps\033[0m para reinstalar as dependências.\n"
