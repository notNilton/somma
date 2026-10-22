package models

import "testing"

func TestNormalizeDocument(t *testing.T) {
	cases := []struct {
		in       string
		digits   string
		docType  string
		wantFail bool
	}{
		{in: "529.982.247-25", digits: "52998224725", docType: DocumentCPF},
		{in: "52998224725", digits: "52998224725", docType: DocumentCPF},
		{in: "11.222.333/0001-81", digits: "11222333000181", docType: DocumentCNPJ},
		{in: "00.000.000/0001-91", digits: "00000000000191", docType: DocumentCNPJ},
		{in: "529.982.247-24", wantFail: true},
		{in: "111.111.111-11", wantFail: true},
		{in: "11.222.333/0001-80", wantFail: true},
		{in: "1234", wantFail: true},
		{in: "abc.def.ghi-jk", wantFail: true},
	}
	for _, c := range cases {
		digits, docType, err := NormalizeDocument(c.in)
		if c.wantFail {
			if err == nil {
				t.Errorf("%q: expected error, got %s %s", c.in, docType, digits)
			}
			continue
		}
		if err != nil {
			t.Errorf("%q: unexpected error: %v", c.in, err)
			continue
		}
		if digits != c.digits || docType != c.docType {
			t.Errorf("%q: got %s %s, want %s %s", c.in, docType, digits, c.docType, c.digits)
		}
	}
}
