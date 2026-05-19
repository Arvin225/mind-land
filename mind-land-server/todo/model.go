package todo

type List struct {
	ID   uint   `gorm:"primarykey" json:"id"`
	Name string `json:"name"`
}

type Item struct {
	ID        uint   `gorm:"primarykey" json:"id"`
	Content   string `json:"content"`
	Done      bool   `json:"done"`
	Star      bool   `json:"star"`
	Del       bool   `json:"del"`
	ListID    uint   `json:"listId"`
	ListName  string `json:"listName"`
	SortOrder int    `gorm:"default:0" json:"sortOrder"`
}
