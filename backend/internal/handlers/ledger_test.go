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
