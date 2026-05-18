package handlers_test

import (
	"context"
	"net/http"
	"testing"

	"github.com/nilbyte/tallyoh/backend/internal/testutil"
)

func TestGetVehicleExpenseStats_WithFuel(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "vehfuel@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/vehicles", map[string]any{
		"name":  "Carro Fuel",
		"brand": "Toyota",
		"model": "Corolla",
		"year":  2022,
	}, tok)
	var v map[string]any
	testutil.DecodeJSON(t, rec, &v)
	id := v["id"].(string)

	var transactionID string
	if err := pool.QueryRow(context.Background(), `
		INSERT INTO transactions (
			user_id, type, classification, payment_method, channel,
			status, amount_cents, date, description, currency_code, affects_account
		) VALUES (
			(SELECT id FROM users WHERE email = $1), 'EXPENSE', 'FUEL', 'DEBIT', 'BANK',
			'COMPLETED', 23960, NOW(), 'Abastecimento teste', 'BRL', true
		)
		RETURNING id
	`, "vehfuel@example.com").Scan(&transactionID); err != nil {
		t.Fatalf("insert transaction: %v", err)
	}

	if _, err := pool.Exec(context.Background(), `
		INSERT INTO refueling_logs (
			vehicle_id, transaction_id, station, fuel_type, current_km, liters, price_per_liter_cents
		) VALUES ($1, $2, 'Posto Teste', 'GASOLINA_COMUM', 1000, 40, 599)
	`, id, transactionID); err != nil {
		t.Fatalf("insert refueling log: %v", err)
	}

	recStats := testutil.Do(t, mux, "GET", "/api/v1/vehicles/"+id+"/expenses-stats", nil, tok)
	if recStats.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recStats.Code, recStats.Body.String())
	}
}

func TestCreateVehicle_Success(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "veh@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/vehicles", map[string]any{
		"name":         "Meu Carro",
		"brand":        "Toyota",
		"model":        "Corolla",
		"year":         2022,
		"licensePlate": "ABC-1234",
	}, tok)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var v map[string]any
	testutil.DecodeJSON(t, rec, &v)
	if v["name"] != "Meu Carro" {
		t.Errorf("expected name=Meu Carro, got %v", v["name"])
	}
}

func TestListVehicles_OnlyOwn(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	tok1 := testutil.RegisterUser(t, mux, "vehu1@example.com", "secret123")
	tok2 := testutil.RegisterUser(t, mux, "vehu2@example.com", "secret123")

	testutil.Do(t, mux, "POST", "/api/v1/vehicles", map[string]any{
		"name":  "Carro User1",
		"brand": "Honda",
		"model": "Civic",
		"year":  2020,
	}, tok1)

	rec := testutil.Do(t, mux, "GET", "/api/v1/vehicles", nil, tok2)
	var list []any
	testutil.DecodeJSON(t, rec, &list)
	if len(list) != 0 {
		t.Errorf("user2 should see 0 vehicles, got %d", len(list))
	}
}

func TestDeleteVehicle_SoftDelete(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "vehdel@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/vehicles", map[string]any{
		"name":  "Para Deletar",
		"brand": "Ford",
		"model": "Ka",
		"year":  2019,
	}, tok)
	var v map[string]any
	testutil.DecodeJSON(t, rec, &v)
	id := v["id"].(string)

	recDel := testutil.Do(t, mux, "DELETE", "/api/v1/vehicles/"+id, nil, tok)
	if recDel.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", recDel.Code)
	}

	recGet := testutil.Do(t, mux, "GET", "/api/v1/vehicles/"+id, nil, tok)
	if recGet.Code != http.StatusNotFound {
		t.Fatalf("expected 404 after delete, got %d", recGet.Code)
	}
}

func TestGetVehicleRefuelings_Empty(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "vehref@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/vehicles", map[string]any{
		"name":  "Carro",
		"brand": "Fiat",
		"model": "Uno",
		"year":  2015,
	}, tok)
	var v map[string]any
	testutil.DecodeJSON(t, rec, &v)
	id := v["id"].(string)

	recRef := testutil.Do(t, mux, "GET", "/api/v1/vehicles/"+id+"/refuelings", nil, tok)
	if recRef.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recRef.Code)
	}

	var list []any
	testutil.DecodeJSON(t, recRef, &list)
	if len(list) != 0 {
		t.Errorf("expected 0 refuelings, got %d", len(list))
	}
}

func TestGetVehicleMaintenances_Empty(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "vehmaint@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/vehicles", map[string]any{
		"name":  "Carro",
		"brand": "VW",
		"model": "Gol",
		"year":  2018,
	}, tok)
	var v map[string]any
	testutil.DecodeJSON(t, rec, &v)
	id := v["id"].(string)

	recM := testutil.Do(t, mux, "GET", "/api/v1/vehicles/"+id+"/maintenances", nil, tok)
	if recM.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recM.Code)
	}

	var list []any
	testutil.DecodeJSON(t, recM, &list)
	if len(list) != 0 {
		t.Errorf("expected 0 maintenances, got %d", len(list))
	}
}

func TestGetVehicleExpenseStats(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "vehstats@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/vehicles", map[string]any{
		"name":  "Carro Stats",
		"brand": "Chevrolet",
		"model": "Onix",
		"year":  2021,
	}, tok)
	var v map[string]any
	testutil.DecodeJSON(t, rec, &v)
	id := v["id"].(string)

	recStats := testutil.Do(t, mux, "GET", "/api/v1/vehicles/"+id+"/expenses-stats", nil, tok)
	if recStats.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", recStats.Code, recStats.Body.String())
	}
}
