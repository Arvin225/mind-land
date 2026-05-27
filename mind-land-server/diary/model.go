package diary

import "time"

type DiaryEntry struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Content   string    `gorm:"type:text" json:"content"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	Del       bool      `json:"del" gorm:"default:false"`
}
