package cache

import "fmt"

func UserKey(userID string) string {
	return fmt.Sprintf("user:%s", userID)
}

func DashboardKey(userID, month string) string {
	return fmt.Sprintf("dashboard:%s:%s", userID, month)
}

func DashboardPrefix(userID string) string {
	return fmt.Sprintf("dashboard:%s:", userID)
}
