package mail

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

type Mailer interface {
	SendPasswordResetEmail(toEmail, resetURL string) error
}

type SMTPOptions struct {
	Host      string
	Port      string
	User      string
	Pass      string
	FromEmail string
}

type mailer struct {
	opts SMTPOptions
}

func NewMailer(opts SMTPOptions) Mailer {
	return &mailer{opts: opts}
}

func (m *mailer) SendPasswordResetEmail(toEmail, resetURL string) error {
	subject := "Somma - Recuperação de Senha"
	body := fmt.Sprintf(
		"Olá,\n\nRecebemos uma solicitação para redefinir a sua senha no Somma.\n\nClique no link abaixo (ou cole no navegador) para redefinir sua senha:\n%s\n\nEste link é válido por 30 minutos.\nSe você não solicitou a redefinição de senha, por favor desconsidere este e-mail.\n\nAtenciosamente,\nEquipe Somma",
		resetURL,
	)

	// If no SMTP host is configured, log the reset URL to stdout (convenient for local dev and testing)
	if strings.TrimSpace(m.opts.Host) == "" {
		log.Printf("[MAIL DEV] Password reset email for %s:\nLink: %s\n", toEmail, resetURL)
		return nil
	}

	from := m.opts.FromEmail
	if from == "" {
		from = "noreply@somma.local"
	}

	msg := []byte(fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		from, toEmail, subject, body))

	addr := fmt.Sprintf("%s:%s", m.opts.Host, m.opts.Port)

	var auth smtp.Auth
	if m.opts.User != "" && m.opts.Pass != "" {
		auth = smtp.PlainAuth("", m.opts.User, m.opts.Pass, m.opts.Host)
	}

	err := smtp.SendMail(addr, auth, from, []string{toEmail}, msg)
	if err != nil {
		log.Printf("[MAIL ERROR] Failed to send email to %s via %s: %v", toEmail, addr, err)
		return err
	}

	log.Printf("[MAIL] Password reset email sent to %s", toEmail)
	return nil
}
