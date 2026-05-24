package handlers

import "net/http"

type loginData struct {
	Error string
}

func (h *Handler) LoginPage(w http.ResponseWriter, r *http.Request) {
	if h.token(r) != "" {
		http.Redirect(w, r, "/transactions", http.StatusFound)
		return
	}
	h.render(w, http.StatusOK, "login", loginData{})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		h.render(w, http.StatusBadRequest, "login", loginData{Error: "Formulário inválido"})
		return
	}

	resp, err := h.api.Login(r.FormValue("email"), r.FormValue("password"))
	if err != nil {
		h.render(w, http.StatusOK, "login", loginData{Error: "Erro ao conectar com o servidor"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		h.render(w, http.StatusOK, "login", loginData{Error: "E-mail ou senha inválidos"})
		return
	}

	for _, cookie := range resp.Cookies() {
		http.SetCookie(w, cookie)
	}
	http.Redirect(w, r, "/transactions", http.StatusFound)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	token := h.token(r)
	if token != "" {
		h.api.Logout(token)
	}
	http.SetCookie(w, &http.Cookie{
		Name:   "tallyoh_session",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})
	http.Redirect(w, r, "/login", http.StatusFound)
}
