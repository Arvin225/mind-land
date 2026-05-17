package main

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"mind-land-server/slipbox"
	"mind-land-server/todo"
)

func main() {
	db, err := gorm.Open(sqlite.Open("mind-land.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database: " + err.Error())
	}

	if err := db.AutoMigrate(&slipbox.Card{}, &slipbox.Tag{}, &todo.List{}, &todo.Item{}); err != nil {
		panic("failed to auto migrate: " + err.Error())
	}

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: true,
	}))

	// SlipBox
	slipSvc := slipbox.NewService(db)
	slipH := slipbox.NewHandler(slipSvc)

	slip := r.Group("/slip-box")
	{
		slip.GET("/cards", slipH.GetCards)
		slip.GET("/cards/:id", slipH.GetCard)
		slip.GET("/tags", slipH.GetAllTags)
		slip.GET("/tags/:id", slipH.GetTag)
		slip.POST("/cards", slipH.CreateCard)
		slip.PUT("/cards/:id", slipH.UpdateCard)
		slip.DELETE("/cards", slipH.DeleteCard)
		slip.DELETE("/tags", slipH.DeleteTag)
	}

	// ToDo
	todoSvc := todo.NewService(db)
	todoH := todo.NewHandler(todoSvc)

	td := r.Group("/to-do")
	{
		td.GET("/lists", todoH.GetLists)
		td.POST("/lists", todoH.CreateList)
		td.PATCH("/lists", todoH.PatchList)
		td.DELETE("/lists/:id", todoH.DeleteList)
		td.GET("/items", todoH.GetItems)
		td.POST("/items", todoH.CreateItem)
		td.PATCH("/items", todoH.PatchItem)
		td.DELETE("/items", todoH.DeleteItem)
	}

	if err := r.Run(":3100"); err != nil {
		panic("failed to start server: " + err.Error())
	}
}
