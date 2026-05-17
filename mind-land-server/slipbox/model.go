package slipbox

import "time"

type Card struct {
	ID            uint   `gorm:"primarykey" json:"id"`
	Content       string `gorm:"type:text" json:"content"`
	BuiltOrDelTime string `json:"builtOrDelTime"`
	Statistics    string `gorm:"type:text" json:"statistics"`
	Tags          string `gorm:"type:text" json:"tags"`
	Del           bool   `json:"del"`
}

type Tag struct {
	ID        uint   `gorm:"primarykey" json:"id"`
	TagName   string `gorm:"uniqueIndex" json:"tagName"`
	Parent    uint   `json:"parent"`
	Children  string `gorm:"type:text" json:"children"`
	CardCount int    `json:"cardCount"`
	Cards     string `gorm:"type:text" json:"cards"`
}

type CardStatistics struct {
	BuiltTime  string `json:"builtTime"`
	UpdateTime string `json:"updateTime"`
	Words      int    `json:"words"`
}

func NewCardStatistics(words int) CardStatistics {
	now := time.Now().Format("2006-01-02 15:04")
	return CardStatistics{
		BuiltTime:  now,
		UpdateTime: now,
		Words:      words,
	}
}
