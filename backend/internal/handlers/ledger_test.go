package handlers

import (
	"testing"
	"time"
)

func TestSplitInstallments(t *testing.T) {
	got := splitInstallments(100000, 3) // R$ 1.000,00 em 3x
	want := []int64{33334, 33333, 33333}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v, want %v", got, want)
		}
	}
}

func TestAddMonthsClamped(t *testing.T) {
	cases := []struct {
		from   string
		months int
		want   string
	}{
		{"2026-01-31", 1, "2026-02-28"},
		{"2026-10-21", 3, "2027-01-21"},
		{"2028-01-31", 1, "2028-02-29"},
		{"2026-03-31", 1, "2026-04-30"},
	}
	for _, c := range cases {
		day, _ := parseDay(c.from)
		if got := addMonthsClamped(day, c.months).Format(time.DateOnly); got != c.want {
			t.Errorf("%s + %d = %s, want %s", c.from, c.months, got, c.want)
		}
	}
}

func TestMonthsUntil(t *testing.T) {
	cases := []struct {
		from, to string
		want     int
	}{
		{"2026-10-21", "2026-10-21", 1},
		{"2026-10-21", "2026-12-20", 2},
		{"2026-10-21", "2026-12-21", 3},
		{"2026-01-31", "2026-03-31", 3}, // 31/01, 28/02, 31/03
	}
	for _, c := range cases {
		from, _ := parseDay(c.from)
		to, _ := parseDay(c.to)
		if got := monthsUntil(from, to); got != c.want {
			t.Errorf("%s..%s = %d, want %d", c.from, c.to, got, c.want)
		}
	}
}

func TestRescheduleFollowing(t *testing.T) {
	day := func(s string) time.Time {
		d, err := parseDay(s)
		if err != nil {
			t.Fatal(err)
		}
		return d
	}
	cases := []struct{ oldDay, newDay, occurrence, want string }{
		{"2026-11-05", "2026-11-10", "2026-12-05", "2026-12-10"}, // muda o dia
		{"2026-11-05", "2026-11-10", "2027-03-05", "2027-03-10"}, // mês com um buraco antes
		{"2026-12-05", "2026-12-31", "2027-02-05", "2027-02-28"}, // limita ao fim do mês
		{"2026-12-31", "2026-12-15", "2027-02-28", "2027-02-15"}, // ocorrência que estava limitada
		{"2026-11-05", "2027-01-05", "2026-12-05", "2027-02-05"}, // muda o mês: desloca a série
		{"2026-11-05", "2026-10-20", "2026-12-05", "2026-11-20"}, // volta um mês
	}
	for _, c := range cases {
		months := monthsBetween(day(c.oldDay), day(c.occurrence))
		if got := addMonthsClamped(day(c.newDay), months).Format(time.DateOnly); got != c.want {
			t.Errorf("%s→%s em %s = %s, want %s", c.oldDay, c.newDay, c.occurrence, got, c.want)
		}
	}
}
