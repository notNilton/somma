import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'pages/home.dart';
import 'pages/login.dart';
import 'session.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  session.start();
  runApp(const SommaApp());
}

// Visual reto e neutro, como o web: sem cantos arredondados, sombras ou gradientes; preto e branco,
// com cor só nos valores (entrada/saída) e nos tipos de lançamento.
ThemeData _theme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final ink = dark ? const Color(0xFFFAFAFA) : const Color(0xFF0A0A0A);
  final paper = dark ? const Color(0xFF0A0A0A) : Colors.white;
  final line = dark ? const Color(0xFF262626) : const Color(0xFFE5E5E5);
  final field = dark ? const Color(0xFF404040) : const Color(0xFFD4D4D4);
  final scheme = ColorScheme.fromSeed(seedColor: ink, brightness: brightness).copyWith(
    primary: ink,
    onPrimary: paper,
    secondary: ink,
    onSecondary: paper,
    surface: paper,
    onSurface: ink,
    surfaceContainerHighest: dark ? const Color(0xFF171717) : const Color(0xFFF5F5F5),
    outline: field,
    outlineVariant: line,
  );
  const square = RoundedRectangleBorder();
  OutlineInputBorder border(Color c) => OutlineInputBorder(
    borderRadius: BorderRadius.zero,
    borderSide: BorderSide(color: c),
  );
  return ThemeData(
    colorScheme: scheme,
    scaffoldBackgroundColor: paper,
    dividerColor: line,
    hintColor: dark ? const Color(0xFFA3A3A3) : const Color(0xFF737373),
    dividerTheme: DividerThemeData(color: line, space: 1, thickness: 1),
    appBarTheme: AppBarTheme(
      backgroundColor: paper,
      foregroundColor: ink,
      surfaceTintColor: Colors.transparent,
      scrolledUnderElevation: 0,
      centerTitle: false,
      shape: Border(bottom: BorderSide(color: line)),
      titleTextStyle: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: ink),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: paper,
      surfaceTintColor: Colors.transparent,
      indicatorColor: Colors.transparent,
      indicatorShape: square,
      height: 60,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (s) => TextStyle(
          fontSize: 12,
          fontWeight: s.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w400,
          color: s.contains(WidgetState.selected) ? ink : const Color(0xFF737373),
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (s) => IconThemeData(color: s.contains(WidgetState.selected) ? ink : const Color(0xFF737373)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      border: border(field),
      enabledBorder: border(field),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide: BorderSide(color: ink, width: 1.5),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(shape: square, minimumSize: const Size(0, 48)),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        shape: square,
        foregroundColor: ink,
        side: BorderSide(color: field),
        minimumSize: const Size(0, 48),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(shape: square, foregroundColor: ink),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: SegmentedButton.styleFrom(
        shape: square,
        side: BorderSide(color: field),
      ),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      shape: square,
      elevation: 0,
      focusElevation: 0,
      hoverElevation: 0,
      highlightElevation: 0,
      backgroundColor: ink,
      foregroundColor: paper,
    ),
    dialogTheme: DialogThemeData(shape: square, backgroundColor: paper, surfaceTintColor: Colors.transparent),
    bottomSheetTheme: BottomSheetThemeData(shape: square, backgroundColor: paper, surfaceTintColor: Colors.transparent),
    popupMenuTheme: PopupMenuThemeData(
      shape: Border.all(color: line),
      color: paper,
      surfaceTintColor: Colors.transparent,
    ),
    snackBarTheme: const SnackBarThemeData(shape: square, behavior: SnackBarBehavior.floating),
    checkboxTheme: CheckboxThemeData(
      shape: square,
      side: BorderSide(color: field, width: 1.5),
    ),
    tabBarTheme: TabBarThemeData(
      labelColor: ink,
      unselectedLabelColor: const Color(0xFF737373),
      dividerColor: line,
      indicatorSize: TabBarIndicatorSize.tab,
      indicator: UnderlineTabIndicator(
        borderSide: BorderSide(color: ink, width: 2),
        borderRadius: BorderRadius.zero,
      ),
    ),
    datePickerTheme: DatePickerThemeData(
      shape: square,
      backgroundColor: paper,
      surfaceTintColor: Colors.transparent,
      dayShape: const WidgetStatePropertyAll(square),
    ),
  );
}

class SommaApp extends StatelessWidget {
  const SommaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Somma',
      debugShowCheckedModeBanner: false,
      theme: _theme(Brightness.light),
      darkTheme: _theme(Brightness.dark),
      locale: const Locale('pt', 'BR'),
      supportedLocales: const [Locale('pt', 'BR')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      home: ListenableBuilder(
        listenable: session,
        builder: (context, _) {
          if (!session.ready) return const Scaffold(body: Center(child: CircularProgressIndicator()));
          return session.me == null ? const LoginPage() : const HomePage();
        },
      ),
    );
  }
}
